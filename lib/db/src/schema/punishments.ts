import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const punishmentsTable = pgTable("punishments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  type: text("type").notNull(),
  description: text("description").notNull(),
  xpPenalty: integer("xp_penalty").notNull().default(0),
  deadline: timestamp("deadline", { withTimezone: true }),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPunishmentSchema = createInsertSchema(punishmentsTable).omit({ id: true, createdAt: true });
export type InsertPunishment = z.infer<typeof insertPunishmentSchema>;
export type Punishment = typeof punishmentsTable.$inferSelect;
