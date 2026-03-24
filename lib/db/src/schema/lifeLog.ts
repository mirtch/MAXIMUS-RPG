import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// Categories: movie, book, music, piano_piece, custom
export const lifeLogTable = pgTable("life_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  category: text("category").notNull(), // movie, book, music, piano_piece, custom
  title: text("title").notNull(),
  subtitle: text("subtitle"), // author, artist, composer, etc.
  note: text("note"), // one-line thought
  rating: integer("rating"), // 1-5 stars (optional)
  status: text("status").default("finished"), // reading, finished, in_progress, mastered
  xpAwarded: integer("xp_awarded").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLifeLogSchema = createInsertSchema(lifeLogTable).omit({ id: true, createdAt: true });
export type InsertLifeLog = z.infer<typeof insertLifeLogSchema>;
export type LifeLog = typeof lifeLogTable.$inferSelect;
