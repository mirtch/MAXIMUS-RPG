import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, dailyLogTable, statsTable, characterTable, achievementsTable, rewardsTable, punishmentsTable, streaksTable } from "@workspace/db";
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

router.get("/daily-log/today", async (req, res): Promise<void> => {
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
  const xpChanges = calculateXpChanges(input);

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

  const streaksUpdated: string[] = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const streakMappings: Array<{ key: string; streakName: string }> = [
    { key: "gymDone", streakName: "gym" },
    { key: "runningDone", streakName: "running" },
    { key: "pianoDone", streakName: "piano" },
    { key: "deepWorkDone", streakName: "deep_work" },
    { key: "plannedDay", streakName: "planned_day" },
  ];

  for (const mapping of streakMappings) {
    if ((input as Record<string, unknown>)[mapping.key]) {
      const [streak] = await db.select().from(streaksTable).where(eq(streaksTable.name, mapping.streakName));
      if (streak) {
        const lastDate = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
        let newStreak = streak.currentStreak;

        if (lastDate) {
          const lastDateDay = new Date(lastDate);
          lastDateDay.setHours(0, 0, 0, 0);
          const yesterdayDay = new Date(yesterday);
          yesterdayDay.setHours(0, 0, 0, 0);
          const todayDay = new Date(today);
          todayDay.setHours(0, 0, 0, 0);

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

  const punishmentsAssigned: string[] = [];
  const rewardsEarned: string[] = [];

  const newAchievements: any[] = [];
  const earnedRewards: any[] = [];
  const assignedPunishments: any[] = [];

  const totalXpGained = xpChanges.filter(c => c.amount > 0).reduce((sum, c) => sum + c.amount, 0);
  const totalXpLost = Math.abs(xpChanges.filter(c => c.amount < 0).reduce((sum, c) => sum + c.amount, 0));

  const activities: string[] = input.activities || [];
  if (input.gymDone) activities.push("gym");
  if (input.runningDone) activities.push("running");
  if (input.basketballDone) activities.push("basketball");
  if (input.studyDone) activities.push("study");
  if (input.deepWorkDone) activities.push("deepWork");
  if (input.pianoDone) activities.push("piano");
  if (input.socializedToday) activities.push("socialized");
  if (input.plannedDay) activities.push("plannedDay");
  if (input.coldShower) activities.push("coldShower");
  if (input.meditatedToday) activities.push("meditation");
  if (input.drankWater) activities.push("drankWater");

  const [log] = await db.insert(dailyLogTable).values({
    date: today,
    activities: [...new Set(activities)],
    totalXpGained,
    totalXpLost,
    xpChanges: xpChanges,
    newLevelUps: levelUps,
    streaksUpdated,
    rewardsEarned: rewardsEarned.map(r => r.name || r),
    punishmentsAssigned: punishmentsAssigned.map(p => p.description || p),
    notes: input.notes ?? null,
    gymDone: input.gymDone ?? false,
    runningDone: input.runningDone ?? false,
    basketballDone: input.basketballDone ?? false,
    studyDone: input.studyDone ?? false,
    deepWorkDone: input.deepWorkDone ?? false,
    pianoDone: input.pianoDone ?? false,
    sleepHours: input.sleepHours ?? null,
    ateJunkFood: input.ateJunkFood ?? false,
    phoneHours: input.phoneHours ?? null,
    socializedToday: input.socializedToday ?? false,
    plannedDay: input.plannedDay ?? false,
    coldShower: input.coldShower ?? false,
    meditatedToday: input.meditatedToday ?? false,
    drankWater: input.drankWater ?? false,
  }).returning();

  res.status(201).json({
    log,
    xpChanges,
    levelUps,
    newAchievements,
    rewardsEarned: earnedRewards,
    punishmentsAssigned: assignedPunishments,
  });
});

export default router;
