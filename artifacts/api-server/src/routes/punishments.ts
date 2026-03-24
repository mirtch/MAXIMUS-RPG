import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, punishmentsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/punishments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const punishments = await db.select().from(punishmentsTable).where(eq(punishmentsTable.userId, userId)).orderBy(punishmentsTable.createdAt);
  res.json(punishments);
});

router.post("/punishments/:id/complete", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [punishment] = await db.select().from(punishmentsTable).where(and(eq(punishmentsTable.id, id), eq(punishmentsTable.userId, userId)));
  if (!punishment) {
    res.status(404).json({ error: "Punishment not found" });
    return;
  }

  const [updated] = await db.update(punishmentsTable)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(punishmentsTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
