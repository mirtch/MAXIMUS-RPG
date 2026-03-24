import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const dailyQuestsTable = pgTable("daily_quests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").notNull().default(25),
  statReward: text("stat_reward").notNull(),
  completed: boolean("completed").notNull().default(false),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyQuestSchema = createInsertSchema(dailyQuestsTable).omit({ id: true, createdAt: true });
export type InsertDailyQuest = z.infer<typeof insertDailyQuestSchema>;
export type DailyQuest = typeof dailyQuestsTable.$inferSelect;

export const sideQuestsTable = pgTable("side_quests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").notNull().default(200),
  statReward: text("stat_reward").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSideQuestSchema = createInsertSchema(sideQuestsTable).omit({ id: true, createdAt: true });
export type InsertSideQuest = z.infer<typeof insertSideQuestSchema>;
export type SideQuest = typeof sideQuestsTable.$inferSelect;

export const mainQuestsTable = pgTable("main_quests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").notNull().default(1000),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMainQuestSchema = createInsertSchema(mainQuestsTable).omit({ id: true, createdAt: true });
export type InsertMainQuest = z.infer<typeof insertMainQuestSchema>;
export type MainQuest = typeof mainQuestsTable.$inferSelect;
