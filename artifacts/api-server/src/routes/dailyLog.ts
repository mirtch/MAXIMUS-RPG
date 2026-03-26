import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db, dailyLogTable, statsTable, characterTable, streaksTable, activitiesTable, activityFeedTable } from "@workspace/db";
import { getLevelFromXp, getTitleForLevel, getOverallTitleFromLevel, calculateXpChanges, type DailyLogInput } from "../lib/rpg.js";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

function startOfDay(date: Date, resetHour = 0): Date {
  const d = new Date(date);
  // If current time is before resetHour, the "day" started yesterday at resetHour
  if (d.getHours() < resetHour) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(resetHour, 0, 0, 0);
  return d;
}

function endOfDay(date: Date, resetHour = 0): Date {
  const start = startOfDay(date, resetHour);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(-1); // resetHour next day minus 1ms
  return end;
}

router.get("/daily-log", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
  const logs = await db.select().from(dailyLogTable).where(eq(dailyLogTable.userId, userId)).orderBy(desc(dailyLogTable.date)).limit(limit);
  res.json(logs);
});

router.get("/daily-log/today", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const resetHour = req.query.resetHour ? Math.min(23, Math.max(0, parseInt(req.query.resetHour as string, 10) || 0)) : 0;
  const now = new Date();
  const todayStart = startOfDay(now, resetHour);
  const todayEnd = endOfDay(now, resetHour);

  const logs = await db.select().from(dailyLogTable).where(eq(dailyLogTable.userId, userId)).orderBy(desc(dailyLogTable.date)).limit(1);
  const todayLog = logs.find(l => {
    const logDate = new Date(l.date);
    return logDate >= todayStart && logDate <= todayEnd;
  });

  if (!todayLog) {
    res.status(404).json({ error: "No log for today" });
    return;
  }

  res.json(todayLog);
});

router.post("/daily-log", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const input: DailyLogInput = req.body;

  // Prevent duplicate submission for the same day
  const resetHour = req.query.resetHour ? Math.min(23, Math.max(0, parseInt(req.query.resetHour as string, 10) || 0)) : 0;
  const now = new Date();
  const dayStart = startOfDay(now, resetHour);
  const dayEnd = endOfDay(now, resetHour);
  const existingLogs = await db.select().from(dailyLogTable).where(eq(dailyLogTable.userId, userId)).orderBy(desc(dailyLogTable.date)).limit(1);
  const alreadyLogged = existingLogs.find(l => {
    const d = new Date(l.date);
    return d >= dayStart && d <= dayEnd;
  });
  if (alreadyLogged) {
    res.status(409).json({ error: "Daily log already submitted for today" });
    return;
  }

  const allActivityIds = [...(input.completedActivityIds || [])];

  if (input.oneTimeActivities && input.oneTimeActivities.length > 0) {
    for (const ota of input.oneTimeActivities) {
      const [created] = await db.insert(activitiesTable).values({
        userId,
        name: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        displayName: ota.displayName,
        description: ota.description,
        category: ota.category,
        xpRewards: ota.xpRewards,
        isCore: false,
        isReusable: false,
        archived: false,
        sortOrder: 99,
      }).returning();
      allActivityIds.push(created.id);
    }
  }

  const activityDefs = allActivityIds.length > 0
    ? await db.select().from(activitiesTable).where(inArray(activitiesTable.id, allActivityIds))
    : [];

  // Get character class for bonus calculation
  const [char] = await db.select().from(characterTable).where(eq(characterTable.userId, userId)).limit(1);

  const xpChanges = calculateXpChanges(
    { ...input, completedActivityIds: allActivityIds },
    activityDefs.map(a => ({
      id: a.id,
      name: a.displayName,
      xpRewards: a.xpRewards as Array<{ statName: string; amount: number }>,
    })),
    char?.class,
  );

  // Must-do penalties: check for activities marked as must-do that weren't completed
  const allUserActivities = await db.select().from(activitiesTable).where(and(eq(activitiesTable.userId, userId), eq(activitiesTable.archived, false)));
  const mustDoActivities = allUserActivities.filter(a => a.isMustDo);
  const completedIdSet = new Set(allActivityIds);
  const missedMustDos: string[] = [];

  for (const mustDo of mustDoActivities) {
    if (!completedIdSet.has(mustDo.id)) {
      missedMustDos.push(mustDo.displayName);
      // Apply penalty: -15 XP to the primary stat of the activity
      const rewards = mustDo.xpRewards as Array<{ statName: string; amount: number }>;
      if (rewards.length > 0) {
        xpChanges.push({
          statName: rewards[0].statName,
          amount: -15,
          reason: `Missed must-do: ${mustDo.displayName}`,
        });
      }
    }
  }

  const levelUps: Array<{ statName: string; newLevel: number; newTitle: string }> = [];
  const statUpdates: Record<string, { oldLevel: number; newXp: number; newLevel: number; newTitle: string }> = {};
  const allStats = await db.select().from(statsTable).where(eq(statsTable.userId, userId));

  for (const change of xpChanges) {
    const stat = allStats.find(s => s.name === change.statName);
    if (!stat) continue;

    const currentUpdate = statUpdates[change.statName];
    const currentXp = currentUpdate ? currentUpdate.newXp : stat.xp;
    const newXp = Math.max(0, currentXp + change.amount);
    const oldLevel = currentUpdate ? currentUpdate.oldLevel : stat.level;
    const newLevel = getLevelFromXp(newXp);
    const newTitle = getTitleForLevel(newLevel);

    statUpdates[change.statName] = { oldLevel, newXp, newLevel, newTitle };
  }

  for (const [statName, update] of Object.entries(statUpdates)) {
    await db.update(statsTable)
      .set({ xp: update.newXp, level: update.newLevel, title: update.newTitle })
      .where(and(eq(statsTable.name, statName), eq(statsTable.userId, userId)));

    if (update.newLevel > update.oldLevel) {
      levelUps.push({ statName, newLevel: update.newLevel, newTitle: update.newTitle });
    }
  }

  const updatedStats = await db.select().from(statsTable).where(eq(statsTable.userId, userId));
  const totalXp = updatedStats.reduce((sum, s) => sum + s.xp, 0);
  const overallLevel = Math.max(1, Math.floor(totalXp / 200) + 1);
  const overallTitle = getOverallTitleFromLevel(overallLevel);

  const [character] = await db.select().from(characterTable).where(eq(characterTable.userId, userId)).limit(1);
  if (character) {
    await db.update(characterTable)
      .set({ totalXp, overallLevel, title: overallTitle })
      .where(eq(characterTable.id, character.id));
  }

  // Streaks
  const streaksUpdated: string[] = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const completedActivityNames = new Set(activityDefs.map(a => a.name));

  const streakMappings: Array<{ activityName: string; streakName: string }> = [
    { activityName: "gym", streakName: "gym" },
    { activityName: "running", streakName: "running" },
    { activityName: "piano", streakName: "piano" },
    { activityName: "deepWork", streakName: "deep_work" },
    { activityName: "plannedDay", streakName: "planned_day" },
  ];

  for (const mapping of streakMappings) {
    if (completedActivityNames.has(mapping.activityName)) {
      const [streak] = await db.select().from(streaksTable).where(and(eq(streaksTable.name, mapping.streakName), eq(streaksTable.userId, userId)));
      if (streak) {
        const lastDate = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
        let newStreak = streak.currentStreak;

        if (lastDate) {
          const lastDateDay = startOfDay(lastDate);
          const yesterdayDay = startOfDay(yesterday);
          const todayDay = startOfDay(today);

          if (lastDateDay.getTime() === yesterdayDay.getTime()) {
            newStreak = streak.currentStreak + 1;
          } else if (lastDateDay.getTime() === todayDay.getTime()) {
            newStreak = streak.currentStreak;
          } else {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }

        const newLongest = Math.max(streak.longestStreak, newStreak);
        await db.update(streaksTable)
          .set({ currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: today })
          .where(and(eq(streaksTable.name, mapping.streakName), eq(streaksTable.userId, userId)));

        streaksUpdated.push(mapping.streakName);
      }
    }
  }

  if (input.sleepHours !== undefined && input.sleepHours >= 8) {
    const [sleepStreak] = await db.select().from(streaksTable).where(and(eq(streaksTable.name, "sleep_8h"), eq(streaksTable.userId, userId)));
    if (sleepStreak) {
      const lastDate = sleepStreak.lastActivityDate ? new Date(sleepStreak.lastActivityDate) : null;
      let newStreak = sleepStreak.currentStreak;
      if (lastDate) {
        const diff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        newStreak = diff <= 1 ? sleepStreak.currentStreak + 1 : 1;
      } else {
        newStreak = 1;
      }
      const newLongest = Math.max(sleepStreak.longestStreak, newStreak);
      await db.update(streaksTable)
        .set({ currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: today })
        .where(and(eq(streaksTable.name, "sleep_8h"), eq(streaksTable.userId, userId)));
      streaksUpdated.push("sleep_8h");
    }
  }

  const activityNames = activityDefs.map(a => a.displayName);
  const totalXpGained = xpChanges.filter(c => c.amount > 0).reduce((sum, c) => sum + c.amount, 0);
  const totalXpLost = Math.abs(xpChanges.filter(c => c.amount < 0).reduce((sum, c) => sum + c.amount, 0));

  const [log] = await db.insert(dailyLogTable).values({
    userId,
    date: today,
    completedActivityIds: allActivityIds,
    activities: activityNames,
    sleepHours: input.sleepHours != null ? Math.round(input.sleepHours) : null,
    phoneHours: input.phoneHours != null ? Math.round(input.phoneHours) : null,
    totalXpGained,
    totalXpLost,
    xpChanges,
    newLevelUps: levelUps,
    streaksUpdated,
    rewardsEarned: [],
    punishmentsAssigned: [],
    notes: input.notes ?? null,
  }).returning();

  // Add to social feed
  if (totalXpGained > 0) {
    await db.insert(activityFeedTable).values({
      userId,
      type: "xp_gained",
      data: { amount: totalXpGained, activities: activityNames },
    });
  }
  for (const lu of levelUps) {
    await db.insert(activityFeedTable).values({
      userId,
      type: "level_up",
      data: lu,
    });
  }

  res.status(201).json({
    log,
    xpChanges,
    levelUps,
    newAchievements: [],
    rewardsEarned: [],
    punishmentsAssigned: [],
  });
});

export default router;
