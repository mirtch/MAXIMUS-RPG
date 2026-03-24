import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, statsTable, characterTable } from "@workspace/db";
import { getLevelFromXp, getTitleForLevel, getOverallTitleFromLevel } from "../lib/rpg.js";

const router: IRouter = Router();

router.get("/stats", async (req, res): Promise<void> => {
  const stats = await db.select().from(statsTable).orderBy(statsTable.name);
  res.json(stats);
});

router.post("/stats/:statName/xp", async (req, res): Promise<void> => {
  const { statName } = req.params;
  const rawStatName = Array.isArray(statName) ? statName[0] : statName;
  const { amount, reason } = req.body;

  if (typeof amount !== "number") {
    res.status(400).json({ error: "amount must be a number" });
    return;
  }

  const [stat] = await db.select().from(statsTable).where(eq(statsTable.name, rawStatName));
  if (!stat) {
    res.status(404).json({ error: "Stat not found" });
    return;
  }

  const newXp = Math.max(0, stat.xp + amount);
  const newLevel = getLevelFromXp(newXp);
  const newTitle = getTitleForLevel(newLevel);

  const [updated] = await db.update(statsTable)
    .set({ xp: newXp, level: newLevel, title: newTitle })
    .where(eq(statsTable.name, rawStatName))
    .returning();

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

  res.json(updated);
});

export default router;
