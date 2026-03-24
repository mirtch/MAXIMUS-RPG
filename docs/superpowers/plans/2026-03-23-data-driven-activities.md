# Data-Driven Custom Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded activity definitions with a database-driven system that supports predefined core activities and user-created custom activities (reusable or one-time).

**Architecture:** New `activities` DB table holds all activity definitions (core + custom) with XP rewards as JSONB. Daily log switches from individual boolean columns to a `completed_activity_ids` integer array referencing the activities table. `sleepHours` and `phoneHours` remain as dedicated fields since they're continuous metrics with threshold-based XP. The `calculateXpChanges()` function becomes data-driven, looking up XP values from the DB instead of hardcoded `if` branches.

**Tech Stack:** Drizzle ORM (PostgreSQL), Express 5, OpenAPI 3.1 + Orval codegen, React + React Query + shadcn/ui

---

## File Structure

### New files
- `lib/db/src/schema/activities.ts` — activities table definition
- `artifacts/api-server/src/lib/seed-activities.ts` — seed script for core activities

### Modified files
- `lib/db/src/schema/index.ts` — export new activities schema
- `lib/db/src/schema/dailyLog.ts` — replace boolean columns with `completedActivityIds` array
- `artifacts/api-server/src/lib/rpg.ts` — data-driven `calculateXpChanges()`, remove hardcoded logic
- `artifacts/api-server/src/routes/activities.ts` — CRUD from DB instead of hardcoded array
- `artifacts/api-server/src/routes/dailyLog.ts` — use activity IDs instead of booleans
- `lib/api-spec/openapi.yaml` — new Activity endpoints, updated SubmitDailyLogBody
- `artifacts/life-rpg/src/pages/daily-log.tsx` — dynamic checkbox rendering + "Add Custom Activity" dialog

---

### Task 1: Create the activities DB table

**Files:**
- Create: `lib/db/src/schema/activities.ts`
- Modify: `lib/db/src/schema/index.ts`

- [ ] **Step 1: Create the activities table schema**

Create `lib/db/src/schema/activities.ts`:

```typescript
import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  xpRewards: jsonb("xp_rewards").notNull().default([]),
  // xpRewards shape: [{ statName: string, amount: number }]
  // positive amount = gain, negative = loss
  isCore: boolean("is_core").notNull().default(false),
  isReusable: boolean("is_reusable").notNull().default(true),
  archived: boolean("archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
```

- [ ] **Step 2: Export from schema barrel**

In `lib/db/src/schema/index.ts`, add:

```typescript
export * from "./activities";
```

- [ ] **Step 3: Push schema to DB**

Run: `pnpm --filter @workspace/db run push`

Expected: Table `activities` created successfully.

- [ ] **Step 4: Commit**

```bash
git add lib/db/src/schema/activities.ts lib/db/src/schema/index.ts
git commit -m "feat(db): add activities table for data-driven activity definitions"
```

---

### Task 2: Seed core activities into the DB

**Files:**
- Create: `artifacts/api-server/src/lib/seed-activities.ts`

- [ ] **Step 1: Create seed data file**

Create `artifacts/api-server/src/lib/seed-activities.ts`:

```typescript
import type { InsertActivity } from "@workspace/db";

export const CORE_ACTIVITIES: InsertActivity[] = [
  {
    name: "gym",
    displayName: "Gym Workout",
    description: "Gym workout (1 hour)",
    category: "fitness",
    xpRewards: [
      { statName: "strength", amount: 40 },
      { statName: "discipline", amount: 10 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 1,
  },
  {
    name: "running",
    displayName: "Running",
    description: "Running / Cardio (20 min)",
    category: "fitness",
    xpRewards: [
      { statName: "stamina", amount: 30 },
      { statName: "health", amount: 10 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 2,
  },
  {
    name: "basketball",
    displayName: "Basketball",
    description: "Basketball (1 hour)",
    category: "athletics",
    xpRewards: [
      { statName: "athletics", amount: 50 },
      { statName: "stamina", amount: 20 },
      { statName: "health", amount: -10 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 3,
  },
  {
    name: "study",
    displayName: "Study / Learning",
    description: "Studying (1 hour)",
    category: "intellect",
    xpRewards: [
      { statName: "intellect", amount: 35 },
      { statName: "focus", amount: 15 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 10,
  },
  {
    name: "deepWork",
    displayName: "Deep Work Block",
    description: "Deep focus work (1 hour)",
    category: "focus",
    xpRewards: [
      { statName: "focus", amount: 40 },
      { statName: "discipline", amount: 15 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 11,
  },
  {
    name: "piano",
    displayName: "Piano Practice",
    description: "Piano practice (1 hour)",
    category: "creativity",
    xpRewards: [
      { statName: "creativity", amount: 40 },
      { statName: "focus", amount: 20 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 20,
  },
  {
    name: "socialized",
    displayName: "Socialized",
    description: "Talked to new person",
    category: "social",
    xpRewards: [
      { statName: "charisma", amount: 25 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 21,
  },
  {
    name: "coldShower",
    displayName: "Cold Shower",
    description: "Cold shower (2-3 min)",
    category: "discipline",
    xpRewards: [
      { statName: "discipline", amount: 15 },
      { statName: "health", amount: 10 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 30,
  },
  {
    name: "meditation",
    displayName: "Meditated",
    description: "Meditation session",
    category: "focus",
    xpRewards: [
      { statName: "focus", amount: 20 },
      { statName: "health", amount: 10 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 31,
  },
  {
    name: "plannedDay",
    displayName: "Planned Day",
    description: "Planned the day",
    category: "discipline",
    xpRewards: [
      { statName: "discipline", amount: 20 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 32,
  },
  {
    name: "drankWater",
    displayName: "Drank 3L Water",
    description: "Stayed hydrated (3L+)",
    category: "health",
    xpRewards: [
      { statName: "health", amount: 10 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 33,
  },
  {
    name: "junkFood",
    displayName: "Ate Junk Food",
    description: "Ate junk food (penalty)",
    category: "bad_habit",
    xpRewards: [
      { statName: "health", amount: -20 },
      { statName: "discipline", amount: -10 },
    ],
    isCore: true,
    isReusable: true,
    archived: false,
    sortOrder: 90,
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add artifacts/api-server/src/lib/seed-activities.ts
git commit -m "feat(api): add core activity seed data"
```

---

### Task 3: Rewrite the activities route to use DB

**Files:**
- Modify: `artifacts/api-server/src/routes/activities.ts`

- [ ] **Step 1: Rewrite activities route for full CRUD**

Replace `artifacts/api-server/src/routes/activities.ts` with:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add artifacts/api-server/src/routes/activities.ts
git commit -m "feat(api): rewrite activities route to use DB with CRUD + seed endpoint"
```

---

### Task 4: Update the daily log schema

**Files:**
- Modify: `lib/db/src/schema/dailyLog.ts`

- [ ] **Step 1: Replace boolean columns with completedActivityIds**

Replace `lib/db/src/schema/dailyLog.ts` with:

```typescript
import { pgTable, serial, integer, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyLogTable = pgTable("daily_log", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  // Activity IDs completed today (references activities table)
  completedActivityIds: integer("completed_activity_ids").array().notNull().default([]),
  // Snapshot of activity names at time of logging (for history readability)
  activities: text("activities").array().notNull().default([]),
  // Metric inputs (continuous values, not boolean activities)
  sleepHours: integer("sleep_hours"),
  phoneHours: integer("phone_hours"),
  // Computed XP summary
  totalXpGained: integer("total_xp_gained").notNull().default(0),
  totalXpLost: integer("total_xp_lost").notNull().default(0),
  xpChanges: jsonb("xp_changes").notNull().default([]),
  newLevelUps: jsonb("new_level_ups").notNull().default([]),
  streaksUpdated: text("streaks_updated").array().notNull().default([]),
  rewardsEarned: text("rewards_earned").array().notNull().default([]),
  punishmentsAssigned: text("punishments_assigned").array().notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyLogSchema = createInsertSchema(dailyLogTable).omit({ id: true, createdAt: true });
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type DailyLog = typeof dailyLogTable.$inferSelect;
```

- [ ] **Step 2: Push schema changes**

Run: `pnpm --filter @workspace/db run push`

Note: This will drop the old boolean columns. If existing data matters, back up first. Since this is a dev project, a force push is acceptable: `pnpm --filter @workspace/db run push-force`

- [ ] **Step 3: Commit**

```bash
git add lib/db/src/schema/dailyLog.ts
git commit -m "feat(db): replace daily log boolean columns with completedActivityIds array"
```

---

### Task 5: Rewrite calculateXpChanges to be data-driven

**Files:**
- Modify: `artifacts/api-server/src/lib/rpg.ts`

- [ ] **Step 1: Replace hardcoded calculateXpChanges with data-driven version**

In `artifacts/api-server/src/lib/rpg.ts`:

1. Remove the entire `calculateXpChanges()` function (lines 106-191)
2. Remove the `DailyLogInput` interface (lines 87-104)
3. Add new types and function:

```typescript
export interface XpReward {
  statName: string;
  amount: number;
}

export interface ActivityDef {
  id: number;
  name: string;
  xpRewards: XpReward[];
}

export interface DailyLogInput {
  completedActivityIds: number[];
  sleepHours?: number;
  phoneHours?: number;
  notes?: string | null;
  // One-time custom activities submitted inline
  oneTimeActivities?: Array<{
    displayName: string;
    description: string;
    category: string;
    xpRewards: XpReward[];
  }>;
}

export function calculateXpChanges(
  input: DailyLogInput,
  activityDefs: ActivityDef[],
): XpChange[] {
  const changes: XpChange[] = [];
  const activityMap = new Map(activityDefs.map(a => [a.id, a]));

  // XP from completed activities
  for (const actId of input.completedActivityIds) {
    const activity = activityMap.get(actId);
    if (!activity) continue;
    for (const reward of activity.xpRewards) {
      changes.push({
        statName: reward.statName,
        amount: reward.amount,
        reason: activity.name,
      });
    }
  }

  // XP from sleep (metric-based thresholds)
  if (input.sleepHours !== undefined) {
    if (input.sleepHours >= 8) {
      changes.push({ statName: "health", amount: 30, reason: "Great sleep (8h+)" });
      changes.push({ statName: "focus", amount: 10, reason: "Well-rested focus" });
    } else if (input.sleepHours >= 7) {
      changes.push({ statName: "health", amount: 20, reason: "Good sleep (7h+)" });
    } else if (input.sleepHours >= 6) {
      changes.push({ statName: "health", amount: 5, reason: "Adequate sleep" });
    } else if (input.sleepHours <= 5) {
      changes.push({ statName: "health", amount: -30, reason: "Poor sleep (5h or less)" });
      changes.push({ statName: "focus", amount: -15, reason: "Sleep deprivation" });
    }
  }

  // XP from phone usage (metric-based thresholds)
  if (input.phoneHours !== undefined) {
    if (input.phoneHours >= 5) {
      changes.push({ statName: "focus", amount: -30, reason: "5+ hours on phone" });
      changes.push({ statName: "discipline", amount: -20, reason: "Phone addiction" });
    } else if (input.phoneHours >= 3) {
      changes.push({ statName: "focus", amount: -15, reason: "3+ hours on phone" });
    }
  }

  return changes;
}
```

Keep all existing functions (`getLevelFromXp`, `getTitleForLevel`, `getOverallTitleFromLevel`, `getXpForLevel`, `getXpToNextLevel`, `STAT_NAMES`, `STAT_DISPLAY_NAMES`, `LEVEL_TITLES`, `DAILY_QUEST_POOL`).

- [ ] **Step 2: Commit**

```bash
git add artifacts/api-server/src/lib/rpg.ts
git commit -m "feat(api): rewrite calculateXpChanges to be data-driven from activities table"
```

---

### Task 6: Rewrite the daily log route

**Files:**
- Modify: `artifacts/api-server/src/routes/dailyLog.ts`

- [ ] **Step 1: Rewrite daily log POST to use activity IDs**

Replace `artifacts/api-server/src/routes/dailyLog.ts` with:

```typescript
import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { db, dailyLogTable, statsTable, characterTable, streaksTable, activitiesTable } from "@workspace/db";
import { getLevelFromXp, getTitleForLevel, getOverallTitleFromLevel, calculateXpChanges, type DailyLogInput } from "../lib/rpg.js";

const router: IRouter = Router();

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

router.get("/daily-log", async (req, res): Promise<void> => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
  const logs = await db.select().from(dailyLogTable).orderBy(desc(dailyLogTable.date)).limit(limit);
  res.json(logs);
});

router.get("/daily-log/today", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const logs = await db.select().from(dailyLogTable).orderBy(desc(dailyLogTable.date)).limit(1);
  const todayLog = logs.find(l => {
    const logDate = new Date(l.date);
    return logDate >= todayStart && logDate <= todayEnd;
  });

  if (!todayLog) {
    res.status(404).json({ error: "No log for today" });
    return;
  }

  res.json(todayLog);
});

router.post("/daily-log", async (req, res): Promise<void> => {
  const input: DailyLogInput = req.body;
  const allActivityIds = [...(input.completedActivityIds || [])];

  // Handle one-time custom activities: insert them, collect their IDs
  if (input.oneTimeActivities && input.oneTimeActivities.length > 0) {
    for (const ota of input.oneTimeActivities) {
      const [created] = await db.insert(activitiesTable).values({
        name: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        displayName: ota.displayName,
        description: ota.description,
        category: ota.category,
        xpRewards: ota.xpRewards,
        isCore: false,
        isReusable: false,
        archived: false,
        sortOrder: 99,
      }).returning();
      allActivityIds.push(created.id);
    }
  }

  // Fetch activity definitions for XP calculation
  const activityDefs = allActivityIds.length > 0
    ? await db.select().from(activitiesTable).where(inArray(activitiesTable.id, allActivityIds))
    : [];

  const xpChanges = calculateXpChanges(
    { ...input, completedActivityIds: allActivityIds },
    activityDefs.map(a => ({
      id: a.id,
      name: a.displayName,
      xpRewards: a.xpRewards as Array<{ statName: string; amount: number }>,
    })),
  );

  // Update stats
  const levelUps: Array<{ statName: string; newLevel: number; newTitle: string }> = [];
  const statUpdates: Record<string, { oldLevel: number; newXp: number; newLevel: number; newTitle: string }> = {};
  const allStats = await db.select().from(statsTable);

  for (const change of xpChanges) {
    const stat = allStats.find(s => s.name === change.statName);
    if (!stat) continue;

    const currentUpdate = statUpdates[change.statName];
    const currentXp = currentUpdate ? currentUpdate.newXp : stat.xp;
    const newXp = Math.max(0, currentXp + change.amount);
    const oldLevel = currentUpdate ? currentUpdate.oldLevel : stat.level;
    const newLevel = getLevelFromXp(newXp);
    const newTitle = getTitleForLevel(newLevel);

    statUpdates[change.statName] = { oldLevel, newXp, newLevel, newTitle };
  }

  for (const [statName, update] of Object.entries(statUpdates)) {
    await db.update(statsTable)
      .set({ xp: update.newXp, level: update.newLevel, title: update.newTitle })
      .where(eq(statsTable.name, statName));

    if (update.newLevel > update.oldLevel) {
      levelUps.push({ statName, newLevel: update.newLevel, newTitle: update.newTitle });
    }
  }

  // Update overall character
  const updatedStats = await db.select().from(statsTable);
  const totalXp = updatedStats.reduce((sum, s) => sum + s.xp, 0);
  const overallLevel = Math.max(1, Math.floor(totalXp / 200) + 1);
  const overallTitle = getOverallTitleFromLevel(overallLevel);

  const [character] = await db.select().from(characterTable).limit(1);
  if (character) {
    await db.update(characterTable)
      .set({ totalXp, overallLevel, title: overallTitle })
      .where(eq(characterTable.id, character.id));
  }

  // Update streaks — map activity names to streak names
  const streaksUpdated: string[] = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const completedActivityNames = new Set(activityDefs.map(a => a.name));

  const streakMappings: Array<{ activityName: string; streakName: string }> = [
    { activityName: "gym", streakName: "gym" },
    { activityName: "running", streakName: "running" },
    { activityName: "piano", streakName: "piano" },
    { activityName: "deepWork", streakName: "deep_work" },
    { activityName: "plannedDay", streakName: "planned_day" },
  ];

  for (const mapping of streakMappings) {
    if (completedActivityNames.has(mapping.activityName)) {
      const [streak] = await db.select().from(streaksTable).where(eq(streaksTable.name, mapping.streakName));
      if (streak) {
        const lastDate = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
        let newStreak = streak.currentStreak;

        if (lastDate) {
          const lastDateDay = startOfDay(lastDate);
          const yesterdayDay = startOfDay(yesterday);
          const todayDay = startOfDay(today);

          if (lastDateDay.getTime() === yesterdayDay.getTime()) {
            newStreak = streak.currentStreak + 1;
          } else if (lastDateDay.getTime() === todayDay.getTime()) {
            newStreak = streak.currentStreak;
          } else {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }

        const newLongest = Math.max(streak.longestStreak, newStreak);
        await db.update(streaksTable)
          .set({ currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: today })
          .where(eq(streaksTable.name, mapping.streakName));

        streaksUpdated.push(mapping.streakName);
      }
    }
  }

  // Sleep streak
  if (input.sleepHours !== undefined && input.sleepHours >= 8) {
    const [sleepStreak] = await db.select().from(streaksTable).where(eq(streaksTable.name, "sleep_8h"));
    if (sleepStreak) {
      const lastDate = sleepStreak.lastActivityDate ? new Date(sleepStreak.lastActivityDate) : null;
      let newStreak = sleepStreak.currentStreak;
      if (lastDate) {
        const diff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        newStreak = diff <= 1 ? sleepStreak.currentStreak + 1 : 1;
      } else {
        newStreak = 1;
      }
      const newLongest = Math.max(sleepStreak.longestStreak, newStreak);
      await db.update(streaksTable)
        .set({ currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: today })
        .where(eq(streaksTable.name, "sleep_8h"));
      streaksUpdated.push("sleep_8h");
    }
  }

  // Build activity name snapshot for history
  const activityNames = activityDefs.map(a => a.displayName);

  const totalXpGained = xpChanges.filter(c => c.amount > 0).reduce((sum, c) => sum + c.amount, 0);
  const totalXpLost = Math.abs(xpChanges.filter(c => c.amount < 0).reduce((sum, c) => sum + c.amount, 0));

  const [log] = await db.insert(dailyLogTable).values({
    date: today,
    completedActivityIds: allActivityIds,
    activities: activityNames,
    sleepHours: input.sleepHours ?? null,
    phoneHours: input.phoneHours ?? null,
    totalXpGained,
    totalXpLost,
    xpChanges,
    newLevelUps: levelUps,
    streaksUpdated,
    rewardsEarned: [],
    punishmentsAssigned: [],
    notes: input.notes ?? null,
  }).returning();

  res.status(201).json({
    log,
    xpChanges,
    levelUps,
    newAchievements: [],
    rewardsEarned: [],
    punishmentsAssigned: [],
  });
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add artifacts/api-server/src/routes/dailyLog.ts
git commit -m "feat(api): rewrite daily log to use activity IDs and data-driven XP calculation"
```

---

### Task 7: Update the OpenAPI spec

**Files:**
- Modify: `lib/api-spec/openapi.yaml`

- [ ] **Step 1: Update Activity schema and add new endpoints**

In `lib/api-spec/openapi.yaml`, make these changes:

1. Update the `Activity` schema in `components.schemas` to match the new DB shape:

```yaml
    Activity:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        displayName:
          type: string
        description:
          type: string
        category:
          type: string
        xpRewards:
          type: array
          items:
            $ref: "#/components/schemas/XpReward"
        isCore:
          type: boolean
        isReusable:
          type: boolean
        archived:
          type: boolean
        sortOrder:
          type: integer
        createdAt:
          type: string
          format: date-time
      required: [id, name, displayName, description, category, xpRewards, isCore, isReusable, archived, sortOrder, createdAt]

    XpReward:
      type: object
      properties:
        statName:
          type: string
        amount:
          type: integer
      required: [statName, amount]
```

2. Add `CreateActivityBody` schema:

```yaml
    CreateActivityBody:
      type: object
      properties:
        name:
          type: string
        displayName:
          type: string
        description:
          type: string
        category:
          type: string
        xpRewards:
          type: array
          items:
            $ref: "#/components/schemas/XpReward"
        isReusable:
          type: boolean
      required: [name, displayName, description, category, xpRewards]
```

3. Add `OneTimeActivity` schema:

```yaml
    OneTimeActivity:
      type: object
      properties:
        displayName:
          type: string
        description:
          type: string
        category:
          type: string
        xpRewards:
          type: array
          items:
            $ref: "#/components/schemas/XpReward"
      required: [displayName, description, category, xpRewards]
```

4. Update `SubmitDailyLogBody` — replace all the boolean fields:

```yaml
    SubmitDailyLogBody:
      type: object
      properties:
        completedActivityIds:
          type: array
          items:
            type: integer
          description: IDs of activities completed today
        sleepHours:
          type: number
        phoneHours:
          type: number
        notes:
          type: ["string", "null"]
        oneTimeActivities:
          type: array
          items:
            $ref: "#/components/schemas/OneTimeActivity"
          description: Custom one-time activities to log
      required: [completedActivityIds]
```

5. Update `DailyLog` schema — replace boolean fields with `completedActivityIds`:

```yaml
    DailyLog:
      type: object
      properties:
        id:
          type: integer
        date:
          type: string
          format: date-time
        completedActivityIds:
          type: array
          items:
            type: integer
        activities:
          type: array
          items:
            type: string
        sleepHours:
          type: ["integer", "null"]
        phoneHours:
          type: ["integer", "null"]
        totalXpGained:
          type: integer
        totalXpLost:
          type: integer
        xpChanges:
          type: array
          items:
            $ref: "#/components/schemas/XpChange"
        newLevelUps:
          type: array
          items:
            $ref: "#/components/schemas/LevelUp"
        streaksUpdated:
          type: array
          items:
            type: string
        rewardsEarned:
          type: array
          items:
            type: string
        punishmentsAssigned:
          type: array
          items:
            type: string
        notes:
          type: ["string", "null"]
        createdAt:
          type: string
          format: date-time
      required: [id, date, completedActivityIds, activities, totalXpGained, totalXpLost, xpChanges, newLevelUps, streaksUpdated, rewardsEarned, punishmentsAssigned, createdAt]
```

6. Add POST and DELETE paths for `/activities`:

```yaml
  /activities:
    get:
      operationId: getActivities
      tags: [activities]
      summary: Get activity definitions
      responses:
        "200":
          description: List of activities
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Activity"
    post:
      operationId: createActivity
      tags: [activities]
      summary: Create a custom activity
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateActivityBody"
      responses:
        "201":
          description: Created activity
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Activity"

  /activities/{id}:
    delete:
      operationId: deleteActivity
      tags: [activities]
      summary: Archive a custom activity
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Archived activity
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Activity"

  /activities/seed:
    post:
      operationId: seedActivities
      tags: [activities]
      summary: Seed core activities (idempotent)
      responses:
        "200":
          description: Seed result
          content:
            application/json:
              schema:
                type: object
                properties:
                  seeded:
                    type: integer
                  total:
                    type: integer
                  activities:
                    type: array
                    items:
                      $ref: "#/components/schemas/Activity"
                required: [seeded, total, activities]
```

- [ ] **Step 2: Regenerate API client**

Run: `pnpm --filter @workspace/api-spec run codegen`

- [ ] **Step 3: Commit**

```bash
git add lib/api-spec/openapi.yaml lib/api-client-react/src/generated/ lib/api-zod/src/generated/
git commit -m "feat(api-spec): update OpenAPI spec for data-driven activities, regenerate client"
```

---

### Task 8: Update the daily log frontend page

**Files:**
- Modify: `artifacts/life-rpg/src/pages/daily-log.tsx`

- [ ] **Step 1: Rewrite daily-log.tsx to render activities dynamically**

Replace the entire file. Key changes:
- Fetch activities from `GET /activities` using the generated `useGetActivities` hook
- Render checkboxes dynamically from the fetched list, grouped by `category`
- Add an "Add Custom Activity" dialog with fields: displayName, description, category (dropdown), stat + XP amount (repeatable)
- User can choose "Save for reuse" (calls `POST /activities` then adds ID to selection) or "One-time only" (adds to `oneTimeActivities` array)
- Submit sends `{ completedActivityIds: [...], sleepHours, phoneHours, notes, oneTimeActivities: [...] }`

The full component code:

```tsx
import { useState } from "react";
import { useGetActivities, useSubmitDailyLog, useGetTodayLog, useCreateActivity } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  fitness: { label: "Physical Training", icon: "💪", color: "red" },
  athletics: { label: "Physical Training", icon: "💪", color: "red" },
  intellect: { label: "Mental", icon: "🧠", color: "blue" },
  focus: { label: "Mental", icon: "🧠", color: "blue" },
  creativity: { label: "Creative & Social", icon: "🎹", color: "purple" },
  social: { label: "Creative & Social", icon: "🎹", color: "purple" },
  discipline: { label: "Daily Habits", icon: "✨", color: "emerald" },
  health: { label: "Daily Habits", icon: "✨", color: "emerald" },
  bad_habit: { label: "Penalties", icon: "⚠️", color: "destructive" },
  custom: { label: "Custom", icon: "🎯", color: "orange" },
};

const STAT_OPTIONS = [
  "strength", "stamina", "athletics", "intellect",
  "focus", "discipline", "health", "charisma", "creativity",
];

const CATEGORY_OPTIONS = [
  "fitness", "athletics", "intellect", "focus",
  "creativity", "social", "discipline", "health", "custom",
];

interface OneTimeActivity {
  displayName: string;
  description: string;
  category: string;
  xpRewards: Array<{ statName: string; amount: number }>;
}

export default function DailyLogPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: todayLog, isLoading: isLogLoading, isError: isLogError } = useGetTodayLog({ query: { retry: false } });
  const { data: activities, isLoading: isActivitiesLoading } = useGetActivities();
  const submitMutation = useSubmitDailyLog();
  const createActivityMutation = useCreateActivity();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sleepHours, setSleepHours] = useState(7);
  const [phoneHours, setPhoneHours] = useState(2);
  const [notes, setNotes] = useState("");
  const [oneTimeActivities, setOneTimeActivities] = useState<OneTimeActivity[]>([]);

  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [logResult, setLogResult] = useState<any>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  // Custom activity form state
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customCategory, setCustomCategory] = useState("custom");
  const [customRewards, setCustomRewards] = useState<Array<{ statName: string; amount: number }>>([
    { statName: "discipline", amount: 10 },
  ]);
  const [customSaveForReuse, setCustomSaveForReuse] = useState(false);

  if (isLogLoading || isActivitiesLoading) {
    return <div className="text-center p-12 text-muted-foreground animate-pulse font-bold text-xl">Loading scroll...</div>;
  }

  if (todayLog) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-primary">Daily Log</h1>
          <p className="text-muted-foreground">Today's deeds are recorded in history.</p>
        </div>
        <Card className="border-primary/20 bg-card/80">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Log Submitted for Today!</CardTitle>
            <CardDescription className="text-center">Come back tomorrow to log your next adventures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-secondary p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">XP Gained</div>
                <div className="text-2xl font-bold text-primary">+{todayLog.totalXpGained}</div>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">XP Lost</div>
                <div className="text-2xl font-bold text-destructive">-{todayLog.totalXpLost}</div>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Level Ups</div>
                <div className="text-2xl font-bold text-accent">{(todayLog.newLevelUps as any[]).length}</div>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Streaks</div>
                <div className="text-2xl font-bold text-orange-500">{todayLog.streaksUpdated.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function toggleActivity(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addCustomRewardRow() {
    setCustomRewards(prev => [...prev, { statName: "discipline", amount: 10 }]);
  }

  function removeCustomRewardRow(index: number) {
    setCustomRewards(prev => prev.filter((_, i) => i !== index));
  }

  function resetCustomForm() {
    setCustomName("");
    setCustomDesc("");
    setCustomCategory("custom");
    setCustomRewards([{ statName: "discipline", amount: 10 }]);
    setCustomSaveForReuse(false);
  }

  async function handleAddCustomActivity() {
    if (!customName.trim()) return;

    const activityData = {
      displayName: customName.trim(),
      description: customDesc.trim() || customName.trim(),
      category: customCategory,
      xpRewards: customRewards,
    };

    if (customSaveForReuse) {
      // Save to DB as reusable, then select it
      createActivityMutation.mutate(
        {
          data: {
            name: customName.trim().toLowerCase().replace(/\s+/g, "_"),
            ...activityData,
            isReusable: true,
          },
        },
        {
          onSuccess: (created) => {
            if (created) {
              setSelectedIds(prev => new Set([...prev, created.id]));
              queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
            }
            setCustomDialogOpen(false);
            resetCustomForm();
            toast({ title: "Activity saved", description: `"${customName}" added to your activity list.` });
          },
        },
      );
    } else {
      // One-time: just add to the inline list
      setOneTimeActivities(prev => [...prev, activityData]);
      setCustomDialogOpen(false);
      resetCustomForm();
      toast({ title: "One-time activity added", description: `"${customName}" will be logged today only.` });
    }
  }

  function onSubmit() {
    submitMutation.mutate(
      {
        data: {
          completedActivityIds: [...selectedIds],
          sleepHours,
          phoneHours,
          notes: notes || null,
          oneTimeActivities: oneTimeActivities.length > 0 ? oneTimeActivities : undefined,
        },
      },
      {
        onSuccess: (res) => {
          if (res) {
            setLogResult(res);
            setResultModalOpen(true);
            queryClient.invalidateQueries();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        },
        onError: () => {
          toast({
            title: "Submission failed",
            description: "There was an error saving your daily log.",
            variant: "destructive",
          });
        },
      },
    );
  }

  // Group activities by visual category
  const grouped: Record<string, typeof activities> = {};
  for (const act of activities || []) {
    const meta = CATEGORY_META[act.category] || CATEGORY_META.custom;
    const groupKey = meta.label;
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey]!.push(act);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-3">
            <ClipboardList className="w-8 h-8" /> Daily Log
          </h1>
          <p className="text-muted-foreground">Record your actions. Face the consequences.</p>
        </div>
        <Button variant="outline" onClick={() => setCustomDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Custom Activity
        </Button>
      </div>

      {/* Dynamic activity groups */}
      {Object.entries(grouped).map(([groupLabel, groupActivities]) => {
        const firstCat = groupActivities![0]?.category || "custom";
        const meta = CATEGORY_META[firstCat] || CATEGORY_META.custom;
        const isPenalty = firstCat === "bad_habit";

        return (
          <Card
            key={groupLabel}
            className={`border-l-4 ${isPenalty ? "border-l-destructive bg-card/50" : `border-l-${meta.color}-500`} bg-card`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2">
                <span>{meta.icon}</span> {groupLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {groupActivities!.map((act) => (
                <div
                  key={act.id}
                  className={`flex flex-row items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedIds.has(act.id)
                      ? isPenalty
                        ? "bg-destructive/10 border-destructive/50"
                        : "bg-primary/10 border-primary/50"
                      : "bg-secondary/50 border-border hover:border-primary/30"
                  }`}
                  onClick={() => toggleActivity(act.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(act.id)}
                    onCheckedChange={() => toggleActivity(act.id)}
                    className={isPenalty ? "border-destructive data-[state=checked]:bg-destructive" : ""}
                  />
                  <div>
                    <div className={`font-medium ${isPenalty ? "text-destructive" : ""}`}>{act.displayName}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(act.xpRewards as Array<{ statName: string; amount: number }>).map((r, i) => (
                        <span key={i} className={r.amount > 0 ? "text-primary" : "text-destructive"}>
                          {r.amount > 0 ? "+" : ""}{r.amount} {r.statName}{i < (act.xpRewards as any[]).length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                    {!act.isCore && (
                      <span className="text-xs text-muted-foreground/60 italic">custom</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* One-time activities pending */}
      {oneTimeActivities.length > 0 && (
        <Card className="border-l-4 border-l-orange-500 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <span>🎯</span> One-Time Activities (this log only)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {oneTimeActivities.map((ota, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <span className="font-medium">{ota.displayName}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {ota.xpRewards.map((r, j) => (
                      <span key={j} className={r.amount > 0 ? "text-primary" : "text-destructive"}>
                        {r.amount > 0 ? "+" : ""}{r.amount} {r.statName}{j < ota.xpRewards.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOneTimeActivities(prev => prev.filter((_, idx) => idx !== i))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* METRICS — Sleep & Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sleep Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2">
              <Label>Hours: <span className="text-primary font-bold text-lg">{sleepHours}h</span></Label>
              <span className="text-xs text-muted-foreground">Optimal: 7-8h</span>
            </div>
            <Slider
              min={3} max={12} step={0.5}
              value={[sleepHours]}
              onValueChange={(v) => setSleepHours(v[0])}
              className="py-4"
            />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Screen Time (Entertainment)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2">
              <Label>Hours: <span className={`font-bold text-lg ${phoneHours >= 4 ? "text-destructive" : "text-primary"}`}>{phoneHours}h</span></Label>
              <span className="text-xs text-muted-foreground">Danger: {">"} 3h</span>
            </div>
            <Slider
              min={0} max={10} step={0.5}
              value={[phoneHours]}
              onValueChange={(v) => setPhoneHours(v[0])}
              className="py-4"
            />
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Captain's Log (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Reflections on today's battles..."
            className="min-h-[100px] resize-none bg-secondary/30"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full text-lg h-14 font-black tracking-widest hover:scale-[1.02] transition-transform duration-200 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
        disabled={submitMutation.isPending}
        onClick={onSubmit}
      >
        {submitMutation.isPending ? "SEALING FATE..." : "SUBMIT LOG TO HISTORY"}
      </Button>

      {/* Result Modal */}
      <Dialog open={resultModalOpen} onOpenChange={setResultModalOpen}>
        <DialogContent className="sm:max-w-md bg-background border-primary">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-primary uppercase font-black tracking-widest">
              Day Complete
            </DialogTitle>
          </DialogHeader>
          {logResult && (
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
                <div className="text-center w-full">
                  <div className="text-3xl font-black text-primary">+{logResult.log.totalXpGained} XP</div>
                  <div className="text-sm text-muted-foreground">GAINED</div>
                </div>
                <div className="w-px h-12 bg-border mx-4"></div>
                <div className="text-center w-full">
                  <div className="text-3xl font-black text-destructive">-{logResult.log.totalXpLost} XP</div>
                  <div className="text-sm text-muted-foreground">LOST</div>
                </div>
              </div>
              {logResult.levelUps?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-accent text-center uppercase tracking-widest">Level Ups!</h4>
                  {logResult.levelUps.map((lu: any, i: number) => (
                    <div key={i} className="bg-accent/10 border border-accent/30 p-3 rounded-lg text-center animate-in zoom-in duration-500 delay-150">
                      <span className="font-bold text-accent">{lu.statName}</span> reached <span className="font-bold">Level {lu.newLevel}</span>!
                      <div className="text-sm text-muted-foreground italic">Rank: {lu.newTitle}</div>
                    </div>
                  ))}
                </div>
              )}
              <Button className="w-full" onClick={() => setResultModalOpen(false)}>
                Continue
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Activity Dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Custom Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Activity Name</Label>
              <Input
                placeholder="e.g., Swimming, Guitar, Cooking..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="Brief description"
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={customCategory} onValueChange={setCustomCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>XP Rewards</Label>
                <Button variant="ghost" size="sm" onClick={addCustomRewardRow} className="gap-1">
                  <Plus className="w-3 h-3" /> Add Stat
                </Button>
              </div>
              {customRewards.map((reward, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select
                    value={reward.statName}
                    onValueChange={(v) => {
                      const next = [...customRewards];
                      next[i] = { ...next[i], statName: v };
                      setCustomRewards(next);
                    }}
                  >
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAT_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="w-[80px]"
                    value={reward.amount}
                    onChange={(e) => {
                      const next = [...customRewards];
                      next[i] = { ...next[i], amount: parseInt(e.target.value, 10) || 0 };
                      setCustomRewards(next);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">XP</span>
                  {customRewards.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeCustomRewardRow(i)}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Use negative numbers for penalties (e.g., -20)</p>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
              <Checkbox
                checked={customSaveForReuse}
                onCheckedChange={(v) => setCustomSaveForReuse(!!v)}
              />
              <div>
                <Label className="cursor-pointer">Save for future use</Label>
                <p className="text-xs text-muted-foreground">Activity will appear in your list going forward</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCustomDialogOpen(false); resetCustomForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomActivity} disabled={!customName.trim()}>
              {customSaveForReuse ? "Save & Select" : "Add One-Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add artifacts/life-rpg/src/pages/daily-log.tsx
git commit -m "feat(ui): dynamic activity rendering with custom activity creation dialog"
```

---

### Task 9: Verify end-to-end

- [ ] **Step 1: Seed the database with core activities**

Run the API server, then call the seed endpoint:
```bash
curl -X POST http://localhost:<PORT>/api/activities/seed
```

Expected: JSON response with `seeded: 12, total: 12` and all core activities.

- [ ] **Step 2: Verify activities load in the UI**

Open the daily log page. Expected: All core activities appear as checkboxes grouped by category.

- [ ] **Step 3: Test creating a reusable custom activity**

Click "Custom Activity" button, fill in:
- Name: "Swimming"
- Category: "fitness"
- XP: +30 stamina
- Check "Save for future use"

Expected: Activity appears in the checkbox list immediately.

- [ ] **Step 4: Test creating a one-time activity**

Click "Custom Activity" button, fill in:
- Name: "Helped friend move"
- Category: "discipline"
- XP: +15 discipline, +10 strength
- Leave "Save for future use" unchecked

Expected: Activity appears in the "One-Time Activities" section.

- [ ] **Step 5: Submit a daily log and verify XP calculation**

Select a few activities + the one-time activity. Submit.
Expected: Result modal shows correct XP gains/losses calculated from the activity definitions in the DB.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete data-driven custom activities system"
```
