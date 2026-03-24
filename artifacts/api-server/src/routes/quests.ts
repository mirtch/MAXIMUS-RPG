import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, dailyQuestsTable, sideQuestsTable, mainQuestsTable, statsTable, characterTable } from "@workspace/db";
import { getLevelFromXp, getTitleForLevel, getOverallTitleFromLevel, DAILY_QUEST_POOL } from "../lib/rpg.js";

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

router.get("/quests/daily", async (req, res): Promise<void> => {
  const start = todayStart();
  const end = todayEnd();
  const quests = await db.select().from(dailyQuestsTable).orderBy(dailyQuestsTable.createdAt);
  const todayQuests = quests.filter(q => {
    const d = new Date(q.date);
    return d >= start && d <= end;
  });
  res.json(todayQuests);
});

router.post("/quests/daily/generate", async (req, res): Promise<void> => {
  const shuffled = [...DAILY_QUEST_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const created = [];
  for (const quest of selected) {
    const [q] = await db.insert(dailyQuestsTable).values({
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

router.post("/quests/daily/:id/complete", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [quest] = await db.select().from(dailyQuestsTable).where(eq(dailyQuestsTable.id, id));
  if (!quest) {
    res.status(404).json({ error: "Quest not found" });
    return;
  }

  const [updated] = await db.update(dailyQuestsTable)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(dailyQuestsTable.id, id))
    .returning();

  const [stat] = await db.select().from(statsTable).where(eq(statsTable.name, quest.statReward));
  if (stat) {
    const newXp = stat.xp + quest.xpReward;
    const newLevel = getLevelFromXp(newXp);
    const newTitle = getTitleForLevel(newLevel);
    await db.update(statsTable)
      .set({ xp: newXp, level: newLevel, title: newTitle })
      .where(eq(statsTable.name, quest.statReward));

    const allStats = await db.select().from(statsTable);
    const totalXp = allStats.reduce((sum, s) => sum + s.xp, 0);
    const overallLevel = Math.max(1, Math.floor(totalXp / 200) + 1);
    const overallTitle = getOverallTitleFromLevel(overallLevel);
    const [character] = await db.select().from(characterTable).limit(1);
    if (character) {
      await db.update(characterTable)
        .set({ totalXp, overallLevel, title: overallTitle })
        .where(eq(characterTable.id, character.id));
    }
  }

  res.json(updated);
});

router.get("/quests/side", async (req, res): Promise<void> => {
  const quests = await db.select().from(sideQuestsTable).orderBy(sideQuestsTable.createdAt);
  res.json(quests);
});

router.post("/quests/side", async (req, res): Promise<void> => {
  const { title, description, xpReward, statReward } = req.body;
  if (!title || !description || !xpReward || !statReward) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [quest] = await db.insert(sideQuestsTable).values({
    title, description, xpReward, statReward,
    completed: false,
  }).returning();

  res.status(201).json(quest);
});

router.post("/quests/side/:id/complete", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [quest] = await db.select().from(sideQuestsTable).where(eq(sideQuestsTable.id, id));
  if (!quest) {
    res.status(404).json({ error: "Quest not found" });
    return;
  }

  const [updated] = await db.update(sideQuestsTable)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(sideQuestsTable.id, id))
    .returning();

  const [stat] = await db.select().from(statsTable).where(eq(statsTable.name, quest.statReward));
  if (stat) {
    const newXp = stat.xp + quest.xpReward;
    const newLevel = getLevelFromXp(newXp);
    const newTitle = getTitleForLevel(newLevel);
    await db.update(statsTable)
      .set({ xp: newXp, level: newLevel, title: newTitle })
      .where(eq(statsTable.name, quest.statReward));

    const allStats = await db.select().from(statsTable);
    const totalXp = allStats.reduce((sum, s) => sum + s.xp, 0);
    const overallLevel = Math.max(1, Math.floor(totalXp / 200) + 1);
    const overallTitle = getOverallTitleFromLevel(overallLevel);
    const [character] = await db.select().from(characterTable).limit(1);
    if (character) {
      await db.update(characterTable)
        .set({ totalXp, overallLevel, title: overallTitle })
        .where(eq(characterTable.id, character.id));
    }
  }

  res.json(updated);
});

router.get("/quests/main", async (req, res): Promise<void> => {
  const quests = await db.select().from(mainQuestsTable).orderBy(mainQuestsTable.createdAt);
  res.json(quests);
});

router.post("/quests/main", async (req, res): Promise<void> => {
  const { title, description, xpReward } = req.body;
  if (!title || !description || !xpReward) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [quest] = await db.insert(mainQuestsTable).values({
    title, description, xpReward,
    completed: false,
  }).returning();

  res.status(201).json(quest);
});

router.post("/quests/main/:id/complete", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [quest] = await db.select().from(mainQuestsTable).where(eq(mainQuestsTable.id, id));
  if (!quest) {
    res.status(404).json({ error: "Quest not found" });
    return;
  }

  const [updated] = await db.update(mainQuestsTable)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(mainQuestsTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
