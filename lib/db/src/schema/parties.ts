import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// Parties — unlimited size, created by a leader
export const partiesTable = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  leaderId: integer("leader_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPartySchema = createInsertSchema(partiesTable).omit({ id: true, createdAt: true });
export type InsertParty = z.infer<typeof insertPartySchema>;
export type Party = typeof partiesTable.$inferSelect;

// Party members — who's in the party
export const partyMembersTable = pgTable("party_members", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull().references(() => partiesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPartyMemberSchema = createInsertSchema(partyMembersTable).omit({ id: true, joinedAt: true });
export type InsertPartyMember = z.infer<typeof insertPartyMemberSchema>;
export type PartyMember = typeof partyMembersTable.$inferSelect;

// Group quests — require all party members to contribute
export const groupQuestsTable = pgTable("group_quests", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull().references(() => partiesTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").notNull().default(500),
  bonusMultiplier: text("bonus_multiplier").notNull().default("1.5"), // group play incentive
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGroupQuestSchema = createInsertSchema(groupQuestsTable).omit({ id: true, createdAt: true });
export type InsertGroupQuest = z.infer<typeof insertGroupQuestSchema>;
export type GroupQuest = typeof groupQuestsTable.$inferSelect;

// Contributions — each member must mark their part done
export const groupQuestContributionsTable = pgTable("group_quest_contributions", {
  id: serial("id").primaryKey(),
  questId: integer("quest_id").notNull().references(() => groupQuestsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  contributed: boolean("contributed").notNull().default(false),
  contributedAt: timestamp("contributed_at", { withTimezone: true }),
});

export const insertGroupQuestContributionSchema = createInsertSchema(groupQuestContributionsTable).omit({ id: true });
export type InsertGroupQuestContribution = z.infer<typeof insertGroupQuestContributionSchema>;
export type GroupQuestContribution = typeof groupQuestContributionsTable.$inferSelect;
