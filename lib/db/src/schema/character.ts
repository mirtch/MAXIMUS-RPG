import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const characterTable = pgTable("character", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  name: text("name").notNull().default("MAXIMUS"),
  avatar: text("avatar").notNull().default("⚔️"),
  class: text("class").notNull().default("Warrior"),
  overallLevel: integer("overall_level").notNull().default(1),
  totalXp: integer("total_xp").notNull().default(0),
  title: text("title").notNull().default("Novice"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCharacterSchema = createInsertSchema(characterTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof characterTable.$inferSelect;
