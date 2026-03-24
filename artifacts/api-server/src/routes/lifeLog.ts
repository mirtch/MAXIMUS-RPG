import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, lifeLogTable, statsTable, characterTable, activityFeedTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { getLevelFromXp, getTitleForLevel, getOverallTitleFromLevel, applyClassBonus } from "../lib/rpg.js";

const router: IRouter = Router();

// XP rewards by life log category
const CATEGORY_XP: Record<string, { statName: string; amount: number }[]> = {
  book: [{ statName: "intellect", amount: 25 }],
  movie: [{ statName: "creativity", amount: 10 }],
  music: [{ statName: "creativity", amount: 5 }],
  piano_piece: [{ statName: "creativity", amount: 50 }, { statName: "focus", amount: 20 }],
  custom: [{ statName: "intellect", amount: 10 }],
};

// GET /api/life-log — list user's life log entries
router.get("/life-log", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const category = req.query.category as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

  let query = db.select().from(lifeLogTable).where(eq(lifeLogTable.userId, userId)).orderBy(desc(lifeLogTable.createdAt)).limit(limit);
  const entries = await query;

  // Filter by category in JS (simpler than building dynamic query)
  const filtered = category ? entries.filter(e => e.category === category) : entries;
  res.json(filtered);
});

// POST /api/life-log — create a life log entry
router.post("/life-log", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { category, title, subtitle, note, rating, status } = req.body;

  if (!category || !title) {
    res.status(400).json({ error: "category and title are required" });
    return;
  }

  // Get character class for XP bonus
  const [char] = await db.select().from(characterTable).where(eq(characterTable.userId, userId)).limit(1);
  const charClass = char?.class;

  // Calculate XP
  const xpRewards = CATEGORY_XP[category] || CATEGORY_XP.custom;
  let totalXpAwarded = 0;

  for (const reward of xpRewards) {
    const amount = charClass ? applyClassBonus(reward.amount, reward.statName, charClass) : reward.amount;
    const [stat] = await db.select().from(statsTable).where(
      eq(statsTable.userId, userId),
    );
    // Find the specific stat
    const allStats = await db.select().from(statsTable).where(eq(statsTable.userId, userId));
    const stat2 = allStats.find(s => s.name === reward.statName);
    if (stat2) {
      const newXp = stat2.xp + amount;
      const newLevel = getLevelFromXp(newXp);
      const newTitle = getTitleForLevel(newLevel);
      await db.update(statsTable)
        .set({ xp: newXp, level: newLevel, title: newTitle })
        .where(eq(statsTable.id, stat2.id));
      totalXpAwarded += amount;
    }
  }

  // Update overall character XP
  if (totalXpAwarded > 0 && char) {
    const updatedStats = await db.select().from(statsTable).where(eq(statsTable.userId, userId));
    const totalXp = updatedStats.reduce((sum, s) => sum + s.xp, 0);
    const overallLevel = Math.max(1, Math.floor(totalXp / 200) + 1);
    const overallTitle = getOverallTitleFromLevel(overallLevel);
    await db.update(characterTable)
      .set({ totalXp, overallLevel, title: overallTitle })
      .where(eq(characterTable.id, char.id));
  }

  const [entry] = await db.insert(lifeLogTable).values({
    userId,
    category,
    title,
    subtitle: subtitle || null,
    note: note || null,
    rating: rating || null,
    status: status || "finished",
    xpAwarded: totalXpAwarded,
  }).returning();

  // Social feed
  const categoryLabels: Record<string, string> = {
    book: "finished reading", movie: "watched", music: "discovered",
    piano_piece: "learned on piano", custom: "logged",
  };
  await db.insert(activityFeedTable).values({
    userId,
    type: "life_log",
    data: {
      category,
      title,
      subtitle,
      rating,
      label: categoryLabels[category] || "logged",
      xpAwarded: totalXpAwarded,
    },
  });

  res.status(201).json(entry);
});

// DELETE /api/life-log/:id
router.delete("/life-log/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseInt(req.params.id as string, 10);

  const [entry] = await db.select().from(lifeLogTable).where(eq(lifeLogTable.id, id));
  if (!entry || entry.userId !== userId) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  await db.delete(lifeLogTable).where(eq(lifeLogTable.id, id));
  res.json({ success: true });
});

export default router;
