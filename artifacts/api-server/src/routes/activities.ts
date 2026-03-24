import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, activitiesTable } from "@workspace/db";
import { CORE_ACTIVITIES } from "../lib/seed-activities.js";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/activities", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const activities = await db.select().from(activitiesTable)
    .where(and(eq(activitiesTable.archived, false), eq(activitiesTable.userId, userId)))
    .orderBy(asc(activitiesTable.sortOrder), asc(activitiesTable.id));
  res.json(activities);
});

router.post("/activities", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { name, displayName, description, category, xpRewards, isReusable } = req.body;

  if (!name || !displayName || !description || !category || !xpRewards) {
    res.status(400).json({ error: "name, displayName, description, category, and xpRewards are required" });
    return;
  }

  const [activity] = await db.insert(activitiesTable).values({
    userId,
    name,
    displayName,
    description,
    category,
    xpRewards,
    isCore: false,
    isReusable: isReusable ?? true,
    archived: false,
    sortOrder: 50,
  }).returning();

  res.status(201).json(activity);
});

router.delete("/activities/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseInt(req.params.id as string, 10);
  const [activity] = await db.select().from(activitiesTable).where(and(eq(activitiesTable.id, id), eq(activitiesTable.userId, userId)));

  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  if (activity.isCore) {
    res.status(403).json({ error: "Cannot delete core activities" });
    return;
  }

  const [archived] = await db.update(activitiesTable)
    .set({ archived: true })
    .where(eq(activitiesTable.id, id))
    .returning();

  res.json(archived);
});

router.post("/activities/seed", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const existing = await db.select().from(activitiesTable).where(and(eq(activitiesTable.isCore, true), eq(activitiesTable.userId, userId)));
  const existingNames = new Set(existing.map(a => a.name));

  const toInsert = CORE_ACTIVITIES.filter(a => !existingNames.has(a.name)).map(a => ({ ...a, userId }));
  if (toInsert.length > 0) {
    await db.insert(activitiesTable).values(toInsert);
  }

  const all = await db.select().from(activitiesTable)
    .where(and(eq(activitiesTable.isCore, true), eq(activitiesTable.userId, userId)))
    .orderBy(asc(activitiesTable.sortOrder));

  res.json({ seeded: toInsert.length, total: all.length, activities: all });
});

export default router;
