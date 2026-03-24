import { pgTable, serial, integer, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const dailyLogTable = pgTable("daily_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
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
