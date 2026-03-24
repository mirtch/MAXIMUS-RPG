import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, rewardsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/rewards", async (req, res): Promise<void> => {
  const rewards = await db.select().from(rewardsTable).orderBy(rewardsTable.createdAt);
  res.json(rewards);
});

router.post("/rewards/:id/use", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [reward] = await db.select().from(rewardsTable).where(eq(rewardsTable.id, id));
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
