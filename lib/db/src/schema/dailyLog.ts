import { pgTable, serial, integer, timestamp, text, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyLogTable = pgTable("daily_log", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  activities: text("activities").array().notNull().default([]),
  totalXpGained: integer("total_xp_gained").notNull().default(0),
  totalXpLost: integer("total_xp_lost").notNull().default(0),
  xpChanges: jsonb("xp_changes").notNull().default([]),
  newLevelUps: jsonb("new_level_ups").notNull().default([]),
  streaksUpdated: text("streaks_updated").array().notNull().default([]),
  rewardsEarned: text("rewards_earned").array().notNull().default([]),
  punishmentsAssigned: text("punishments_assigned").array().notNull().default([]),
  notes: text("notes"),
  gymDone: boolean("gym_done").notNull().default(false),
  runningDone: boolean("running_done").notNull().default(false),
  basketballDone: boolean("basketball_done").notNull().default(false),
  studyDone: boolean("study_done").notNull().default(false),
  deepWorkDone: boolean("deep_work_done").notNull().default(false),
  pianoDone: boolean("piano_done").notNull().default(false),
  sleepHours: integer("sleep_hours"),
  ateJunkFood: boolean("ate_junk_food").notNull().default(false),
  phoneHours: integer("phone_hours"),
  socializedToday: boolean("socialized_today").notNull().default(false),
  plannedDay: boolean("planned_day").notNull().default(false),
  coldShower: boolean("cold_shower").notNull().default(false),
  meditatedToday: boolean("meditated_today").notNull().default(false),
  drankWater: boolean("drank_water").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyLogSchema = createInsertSchema(dailyLogTable).omit({ id: true, createdAt: true });
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type DailyLog = typeof dailyLogTable.$inferSelect;
