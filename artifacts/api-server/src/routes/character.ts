import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, characterTable, statsTable } from "@workspace/db";
import { STAT_NAMES, STAT_DISPLAY_NAMES } from "../lib/rpg.js";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

export async function ensureCharacterExists(userId: number) {
  const [existing] = await db.select().from(characterTable).where(eq(characterTable.userId, userId)).limit(1);
  if (!existing) {
    const [created] = await db.insert(characterTable).values({
      userId,
      name: "MAXIMUS",
      class: "Warrior",
      overallLevel: 1,
      totalXp: 0,
      title: "Beginner",
    }).returning();
    return created;
  }
  return existing;
}

export async function ensureStatsExist(userId: number) {
  const existingStats = await db.select().from(statsTable).where(eq(statsTable.userId, userId));
  for (const name of STAT_NAMES) {
    const exists = existingStats.find(s => s.name === name);
    if (!exists) {
      await db.insert(statsTable).values({
        userId,
        name,
        displayName: STAT_DISPLAY_NAMES[name],
        xp: 0,
        level: 1,
        title: "Novice",
      });
    }
  }
}

router.get("/character", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  await ensureStatsExist(userId);
  const character = await ensureCharacterExists(userId);
  res.json(character);
});

router.patch("/character", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const character = await ensureCharacterExists(userId);
  const { name, class: charClass, avatar } = req.body;
  const updates: Record<string, string> = {};
  if (name) updates.name = name;
  if (charClass) updates.class = charClass;
  if (avatar) updates.avatar = avatar;

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
