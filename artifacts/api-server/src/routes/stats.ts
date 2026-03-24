import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, statsTable, characterTable } from "@workspace/db";
import { getLevelFromXp, getTitleForLevel, getOverallTitleFromLevel, applyClassBonus } from "../lib/rpg.js";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const stats = await db.select().from(statsTable).where(eq(statsTable.userId, userId)).orderBy(statsTable.name);
  res.json(stats);
});

router.post("/stats/:statName/xp", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { statName } = req.params;
  const rawStatName = Array.isArray(statName) ? statName[0] : statName;
  const { amount, reason } = req.body;

  if (typeof amount !== "number") {
    res.status(400).json({ error: "amount must be a number" });
    return;
  }

  const [stat] = await db.select().from(statsTable).where(and(eq(statsTable.name, rawStatName), eq(statsTable.userId, userId)));
  if (!stat) {
    res.status(404).json({ error: "Stat not found" });
    return;
  }

  const newXp = Math.max(0, stat.xp + amount);
  const newLevel = getLevelFromXp(newXp);
  const newTitle = getTitleForLevel(newLevel);

  const [updated] = await db.update(statsTable)
    .set({ xp: newXp, level: newLevel, title: newTitle })
    .where(and(eq(statsTable.name, rawStatName), eq(statsTable.userId, userId)))
    .returning();

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

  res.json(updated);
});

export default router;
