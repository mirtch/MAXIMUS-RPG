import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bossFightsTable = pgTable("boss_fights", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type").notNull(),
  xpReward: integer("xp_reward").notNull().default(500),
  statsInvolved: text("stats_involved").array().notNull().default([]),
  completed: boolean("completed").notNull().default(false),
  result: text("result"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBossFightSchema = createInsertSchema(bossFightsTable).omit({ id: true, createdAt: true });
export type InsertBossFight = z.infer<typeof insertBossFightSchema>;
export type BossFight = typeof bossFightsTable.$inferSelect;
