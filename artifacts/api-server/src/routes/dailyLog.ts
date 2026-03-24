import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { db, dailyLogTable, statsTable, characterTable, streaksTable, activitiesTable } from "@workspace/db";
import { getLevelFromXp, getTitleForLevel, getOverallTitleFromLevel, calculateXpChanges, type DailyLogInput } from "../lib/rpg.js";

const router: IRouter = Router();

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

router.get("/daily-log", async (req, res): Promise<void> => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
  const logs = await db.select().from(dailyLogTable).orderBy(desc(dailyLogTable.date)).limit(limit);
  res.json(logs);
});

router.get("/daily-log/today", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const logs = await db.select().from(dailyLogTable).orderBy(desc(dailyLogTable.date)).limit(1);
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

router.post("/daily-log", async (req, res): Promise<void> => {
  const input: DailyLogInput = req.body;
  const allActivityIds = [...(input.completedActivityIds || [])];

  // Handle one-time custom activities: insert them, collect their IDs
  if (input.oneTimeActivities && input.oneTimeActivities.length > 0) {
    for (const ota of input.oneTimeActivities) {
      const [created] = await db.insert(activitiesTable).values({
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

  // Fetch activity definitions for XP calculation
  const activityDefs = allActivityIds.length > 0
    ? await db.select().from(activitiesTable).where(inArray(activitiesTable.id, allActivityIds))
    : [];

  const xpChanges = calculateXpChanges(
    { ...input, completedActivityIds: allActivityIds },
    activityDefs.map(a => ({
      id: a.id,
      name: a.displayName,
      xpRewards: a.xpRewards as Array<{ statName: string; amount: number }>,
    })),
  );

  // Update stats
  const levelUps: Array<{ statName: string; newLevel: number; newTitle: string }> = [];
  const statUpdates: Record<string, { oldLevel: number; newXp: number; newLevel: number; newTitle: string }> = {};
  const allStats = await db.select().from(statsTable);

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
      .where(eq(statsTable.name, statName));

    if (update.newLevel > update.oldLevel) {
      levelUps.push({ statName, newLevel: update.newLevel, newTitle: update.newTitle });
    }
  }

  // Update overall character
  const updatedStats = await db.select().from(statsTable);
  const totalXp = updatedStats.reduce((sum, s) => sum + s.xp, 0);
  const overallLevel = Math.max(1, Math.floor(totalXp / 200) + 1);
  const overallTitle = getOverallTitleFromLevel(overallLevel);

  const [character] = await db.select().from(characterTable).limit(1);
  if (character) {
    await db.update(characterTable)
      .set({ totalXp, overallLevel, title: overallTitle })
      .where(eq(characterTable.id, character.id));
  }

  // Update streaks — map activity names to streak names
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
      const [streak] = await db.select().from(streaksTable).where(eq(streaksTable.name, mapping.streakName));
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
          .where(eq(streaksTable.name, mapping.streakName));

        streaksUpdated.push(mapping.streakName);
      }
    }
  }

  // Sleep streak
  if (input.sleepHours !== undefined && input.sleepHours >= 8) {
    const [sleepStreak] = await db.select().from(streaksTable).where(eq(streaksTable.name, "sleep_8h"));
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
        .where(eq(streaksTable.name, "sleep_8h"));
      streaksUpdated.push("sleep_8h");
    }
  }

  // Build activity name snapshot for history
  const activityNames = activityDefs.map(a => a.displayName);

  const totalXpGained = xpChanges.filter(c => c.amount > 0).reduce((sum, c) => sum + c.amount, 0);
  const totalXpLost = Math.abs(xpChanges.filter(c => c.amount < 0).reduce((sum, c) => sum + c.amount, 0));

  const [log] = await db.insert(dailyLogTable).values({
    date: today,
    completedActivityIds: allActivityIds,
    activities: activityNames,
    sleepHours: input.sleepHours ?? null,
    phoneHours: input.phoneHours ?? null,
    totalXpGained,
    totalXpLost,
    xpChanges,
    newLevelUps: levelUps,
    streaksUpdated,
    rewardsEarned: [],
    punishmentsAssigned: [],
    notes: input.notes ?? null,
  }).returning();

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
