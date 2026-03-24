import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, characterTable, statsTable } from "@workspace/db";
import { STAT_NAMES, STAT_DISPLAY_NAMES } from "../lib/rpg.js";

const router: IRouter = Router();

export async function ensureCharacterExists() {
  const [existing] = await db.select().from(characterTable).limit(1);
  if (!existing) {
    const [created] = await db.insert(characterTable).values({
      name: "MAXIMUS",
      class: "Prospect",
      overallLevel: 1,
      totalXp: 0,
      title: "Beginner",
    }).returning();
    return created;
  }
  return existing;
}

export async function ensureStatsExist() {
  const existingStats = await db.select().from(statsTable);
  for (const name of STAT_NAMES) {
    const exists = existingStats.find(s => s.name === name);
    if (!exists) {
      await db.insert(statsTable).values({
        name,
        displayName: STAT_DISPLAY_NAMES[name],
        xp: 0,
        level: 1,
        title: "Novice",
      });
    }
  }
}

router.get("/character", async (req, res): Promise<void> => {
  await ensureStatsExist();
  const character = await ensureCharacterExists();
  res.json(character);
});

router.patch("/character", async (req, res): Promise<void> => {
  const character = await ensureCharacterExists();
  const { name, class: charClass } = req.body;
  const updates: Record<string, string> = {};
  if (name) updates.name = name;
  if (charClass) updates.class = charClass;

  if (Object.keys(updates).length === 0) {
    res.json(character);
    return;
  }

  const [updated] = await db.update(characterTable)
    .set(updates)
    .where(eq(characterTable.id, character.id))
    .returning();

  res.json(updated || character);
});

export default router;
