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
  isCore: boolean("is_core").notNull().default(false),
  isReusable: boolean("is_reusable").notNull().default(true),
  archived: boolean("archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
