import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, bossFightsTable, statsTable, characterTable, activityFeedTable } from "@workspace/db";
import { getLevelFromXp, getTitleForLevel, getOverallTitleFromLevel } from "../lib/rpg.js";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/boss-fights", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const fights = await db.select().from(bossFightsTable).where(eq(bossFightsTable.userId, userId)).orderBy(bossFightsTable.createdAt);
  res.json(fights);
});

router.post("/boss-fights", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { name, description, eventType, xpReward, statsInvolved, scheduledFor } = req.body;
  if (!name || !description || !eventType || !xpReward || !statsInvolved) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [fight] = await db.insert(bossFightsTable).values({
    userId,
    name,
    description,
    eventType,
    xpReward,
    statsInvolved,
    completed: false,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
  }).returning();

  res.status(201).json(fight);
});

router.post("/boss-fights/:id/complete", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [fight] = await db.select().from(bossFightsTable).where(and(eq(bossFightsTable.id, id), eq(bossFightsTable.userId, userId)));
  if (!fight) {
    res.status(404).json({ error: "Boss fight not found" });
    return;
  }

  const { result, xpEarned } = req.body;
  if (!result || typeof xpEarned !== "number") {
    res.status(400).json({ error: "result and xpEarned are required" });
    return;
  }

  const [updated] = await db.update(bossFightsTable)
    .set({ completed: true, result, completedAt: new Date() })
    .where(eq(bossFightsTable.id, id))
    .returning();

  const xpPerStat = Math.floor(xpEarned / fight.statsInvolved.length);
  for (const statName of fight.statsInvolved) {
    const [stat] = await db.select().from(statsTable).where(and(eq(statsTable.name, statName), eq(statsTable.userId, userId)));
    if (stat) {
      const newXp = stat.xp + xpPerStat;
      const newLevel = getLevelFromXp(newXp);
      const newTitle = getTitleForLevel(newLevel);
      await db.update(statsTable)
        .set({ xp: newXp, level: newLevel, title: newTitle })
        .where(and(eq(statsTable.name, statName), eq(statsTable.userId, userId)));
    }
  }

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

  await db.insert(activityFeedTable).values({
    userId,
    type: "boss_defeated",
    data: { bossName: fight.name, result, xpEarned },
  });

  res.json(updated);
});

export default router;
