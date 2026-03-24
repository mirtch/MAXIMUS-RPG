import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// Friend challenges / duels
export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  challengerId: integer("challenger_id").notNull().references(() => usersTable.id),
  challengedId: integer("challenged_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(), // "Run 3 times this week"
  description: text("description"),
  xpStake: integer("xp_stake").notNull().default(100), // XP on the line
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, declined, active, completed
  challengerCompleted: boolean("challenger_completed").notNull().default(false),
  challengedCompleted: boolean("challenged_completed").notNull().default(false),
  winnerId: integer("winner_id").references(() => usersTable.id),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChallengeSchema = createInsertSchema(challengesTable).omit({ id: true, createdAt: true });
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challengesTable.$inferSelect;
