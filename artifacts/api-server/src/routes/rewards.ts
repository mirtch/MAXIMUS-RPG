import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, rewardsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/rewards", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const rewards = await db.select().from(rewardsTable).where(eq(rewardsTable.userId, userId)).orderBy(rewardsTable.createdAt);
  res.json(rewards);
});

router.post("/rewards/:id/use", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [reward] = await db.select().from(rewardsTable).where(and(eq(rewardsTable.id, id), eq(rewardsTable.userId, userId)));
  if (!reward) {
    res.status(404).json({ error: "Reward not found" });
    return;
  }

  if (reward.used) {
    res.status(400).json({ error: "Reward already used" });
    return;
  }

  const [updated] = await db.update(rewardsTable)
    .set({ used: true, usedAt: new Date() })
    .where(eq(rewardsTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
