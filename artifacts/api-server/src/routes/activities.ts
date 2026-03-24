import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, activitiesTable } from "@workspace/db";
import { CORE_ACTIVITIES } from "../lib/seed-activities.js";

const router: IRouter = Router();

// GET /activities — all non-archived activities
router.get("/activities", async (_req, res): Promise<void> => {
  const activities = await db.select().from(activitiesTable)
    .where(eq(activitiesTable.archived, false))
    .orderBy(asc(activitiesTable.sortOrder), asc(activitiesTable.id));
  res.json(activities);
});

// POST /activities — create a custom activity
router.post("/activities", async (req, res): Promise<void> => {
  const { name, displayName, description, category, xpRewards, isReusable } = req.body;

  if (!name || !displayName || !description || !category || !xpRewards) {
    res.status(400).json({ error: "name, displayName, description, category, and xpRewards are required" });
    return;
  }

  const [activity] = await db.insert(activitiesTable).values({
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

// DELETE /activities/:id — archive a custom activity (core activities cannot be archived)
router.delete("/activities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [activity] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, id));

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

// POST /activities/seed — seed core activities (idempotent)
router.post("/activities/seed", async (_req, res): Promise<void> => {
  const existing = await db.select().from(activitiesTable).where(eq(activitiesTable.isCore, true));
  const existingNames = new Set(existing.map(a => a.name));

  const toInsert = CORE_ACTIVITIES.filter(a => !existingNames.has(a.name));
  if (toInsert.length > 0) {
    await db.insert(activitiesTable).values(toInsert);
  }

  const all = await db.select().from(activitiesTable)
    .where(eq(activitiesTable.isCore, true))
    .orderBy(asc(activitiesTable.sortOrder));

  res.json({ seeded: toInsert.length, total: all.length, activities: all });
});

export default router;
