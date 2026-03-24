import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, punishmentsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/punishments", async (req, res): Promise<void> => {
  const punishments = await db.select().from(punishmentsTable).orderBy(punishmentsTable.createdAt);
  res.json(punishments);
});

router.post("/punishments/:id/complete", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [punishment] = await db.select().from(punishmentsTable).where(eq(punishmentsTable.id, id));
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
