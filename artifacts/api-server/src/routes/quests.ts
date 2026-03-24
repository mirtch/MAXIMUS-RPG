import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, dailyQuestsTable, sideQuestsTable, mainQuestsTable, statsTable, characterTable, activityFeedTable } from "@workspace/db";
import { getLevelFromXp, getTitleForLevel, getOverallTitleFromLevel, DAILY_QUEST_POOL } from "../lib/rpg.js";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayEnd(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

router.get("/quests/daily", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const start = todayStart();
  const end = todayEnd();
  const quests = await db.select().from(dailyQuestsTable).where(eq(dailyQuestsTable.userId, userId)).orderBy(dailyQuestsTable.createdAt);
  const todayQuests = quests.filter(q => {
    const d = new Date(q.date);
    return d >= start && d <= end;
  });
  res.json(todayQuests);
});

router.post("/quests/daily/generate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const shuffled = [...DAILY_QUEST_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const created = [];
  for (const quest of selected) {
    const [q] = await db.insert(dailyQuestsTable).values({
      userId,
      title: quest.title,
      description: quest.description,
      xpReward: quest.xpReward,
      statReward: quest.statReward,
      completed: false,
      date: today,
    }).returning();
    created.push(q);
  }

  res.status(201).json(created);
});

router.post("/quests/daily/:id/complete", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [quest] = await db.select().from(dailyQuestsTable).where(and(eq(dailyQuestsTable.id, id), eq(dailyQuestsTable.userId, userId)));
  if (!quest) {
    res.status(404).json({ error: "Quest not found" });
    return;
  }

  const [updated] = await db.update(dailyQuestsTable)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(dailyQuestsTable.id, id))
    .returning();

  const [stat] = await db.select().from(statsTable).where(and(eq(statsTable.name, quest.statReward), eq(statsTable.userId, userId)));
  if (stat) {
    const newXp = stat.xp + quest.xpReward;
    const newLevel = getLevelFromXp(newXp);
    const newTitle = getTitleForLevel(newLevel);
    await db.update(statsTable)
      .set({ xp: newXp, level: newLevel, title: newTitle })
      .where(and(eq(statsTable.name, quest.statReward), eq(statsTable.userId, userId)));

    const allStats = await db.select().from(statsTable).where(eq(statsTable.userId, userId));
    const totalXp = allStats.reduce((sum, s) => sum + s.xp, 0);
    const overallLevel = Math.max(1, Math.floor(totalXp / 200) + 1);
    const overallTitle = getOverallTitleFromLevel(overallLevel);
    const [character] = await db.select().from(characterTable).where(eq(characterTable.userId, userId)).limit(1);
    if (character) {
      await db.update(characterTable)
        .set({ totalXp, overallLevel, title: overallTitle })
        .where(eq(characterTable.id, character.id));
    }
  }

  // Social feed
  await db.insert(activityFeedTable).values({
    userId,
    type: "quest_completed",
    data: { questTitle: quest.title, questType: "daily", xpReward: quest.xpReward },
  });

  res.json(updated);
});

router.get("/quests/side", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const quests = await db.select().from(sideQuestsTable).where(eq(sideQuestsTable.userId, userId)).orderBy(sideQuestsTable.createdAt);
  res.json(quests);
});

router.post("/quests/side", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { title, description, xpReward, statReward } = req.body;
  if (!title || !description || !xpReward || !statReward) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [quest] = await db.insert(sideQuestsTable).values({
    userId,
    title, description, xpReward, statReward,
    completed: false,
  }).returning();

  res.status(201).json(quest);
});

router.post("/quests/side/:id/complete", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [quest] = await db.select().from(sideQuestsTable).where(and(eq(sideQuestsTable.id, id), eq(sideQuestsTable.userId, userId)));
  if (!quest) {
    res.status(404).json({ error: "Quest not found" });
    return;
  }

  const [updated] = await db.update(sideQuestsTable)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(sideQuestsTable.id, id))
    .returning();

  const [stat] = await db.select().from(statsTable).where(and(eq(statsTable.name, quest.statReward), eq(statsTable.userId, userId)));
  if (stat) {
    const newXp = stat.xp + quest.xpReward;
    const newLevel = getLevelFromXp(newXp);
    const newTitle = getTitleForLevel(newLevel);
    await db.update(statsTable)
      .set({ xp: newXp, level: newLevel, title: newTitle })
      .where(and(eq(statsTable.name, quest.statReward), eq(statsTable.userId, userId)));

    const allStats = await db.select().from(statsTable).where(eq(statsTable.userId, userId));
    const totalXp = allStats.reduce((sum, s) => sum + s.xp, 0);
    const overallLevel = Math.max(1, Math.floor(totalXp / 200) + 1);
    const overallTitle = getOverallTitleFromLevel(overallLevel);
    const [character] = await db.select().from(characterTable).where(eq(characterTable.userId, userId)).limit(1);
    if (character) {
      await db.update(characterTable)
        .set({ totalXp, overallLevel, title: overallTitle })
        .where(eq(characterTable.id, character.id));
    }
  }

  await db.insert(activityFeedTable).values({
    userId,
    type: "quest_completed",
    data: { questTitle: quest.title, questType: "side", xpReward: quest.xpReward },
  });

  res.json(updated);
});

router.get("/quests/main", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const quests = await db.select().from(mainQuestsTable).where(eq(mainQuestsTable.userId, userId)).orderBy(mainQuestsTable.createdAt);
  res.json(quests);
});

router.post("/quests/main", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { title, description, xpReward } = req.body;
  if (!title || !description || !xpReward) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [quest] = await db.insert(mainQuestsTable).values({
    userId,
    title, description, xpReward,
    completed: false,
  }).returning();

  res.status(201).json(quest);
});

router.post("/quests/main/:id/complete", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [quest] = await db.select().from(mainQuestsTable).where(and(eq(mainQuestsTable.id, id), eq(mainQuestsTable.userId, userId)));
  if (!quest) {
    res.status(404).json({ error: "Quest not found" });
    return;
  }

  const [updated] = await db.update(mainQuestsTable)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(mainQuestsTable.id, id))
    .returning();

  await db.insert(activityFeedTable).values({
    userId,
    type: "quest_completed",
    data: { questTitle: quest.title, questType: "main", xpReward: quest.xpReward },
  });

  res.json(updated);
});

export default router;
