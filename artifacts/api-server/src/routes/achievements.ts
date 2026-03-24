import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, achievementsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const DEFAULT_ACHIEVEMENTS = [
  { name: "First Steps", description: "Complete your first daily log", icon: "👟", requirement: "Log 1 day", xpBonus: 50, unlocked: false },
  { name: "Gym Rookie I", description: "Work out 5 times", icon: "💪", requirement: "5 gym sessions", xpBonus: 100, unlocked: false },
  { name: "Gym Warrior II", description: "Work out 20 times", icon: "🏋️", requirement: "20 gym sessions", xpBonus: 250, unlocked: false },
  { name: "Iron Champion III", description: "Work out 50 times", icon: "⚔️", requirement: "50 gym sessions", xpBonus: 500, unlocked: false },
  { name: "Runner I", description: "Run 10 times", icon: "🏃", requirement: "10 running sessions", xpBonus: 100, unlocked: false },
  { name: "Speed Demon II", description: "Run 30 times", icon: "⚡", requirement: "30 running sessions", xpBonus: 250, unlocked: false },
  { name: "Hooper I", description: "Play basketball 10 times", icon: "🏀", requirement: "10 basketball sessions", xpBonus: 100, unlocked: false },
  { name: "Baller II", description: "Play basketball 50 times", icon: "🎯", requirement: "50 basketball sessions", xpBonus: 300, unlocked: false },
  { name: "Scholar I", description: "Study 10 times", icon: "📚", requirement: "10 study sessions", xpBonus: 100, unlocked: false },
  { name: "Genius II", description: "Study 30 times", icon: "🧠", requirement: "30 study sessions", xpBonus: 250, unlocked: false },
  { name: "Maestro I", description: "Practice piano 10 times", icon: "🎹", requirement: "10 piano sessions", xpBonus: 100, unlocked: false },
  { name: "Virtuoso II", description: "Practice piano 30 times", icon: "🎵", requirement: "30 piano sessions", xpBonus: 250, unlocked: false },
  { name: "Socializer I", description: "Socialize 10 times", icon: "🗣️", requirement: "10 social interactions", xpBonus: 100, unlocked: false },
  { name: "Streak Master", description: "Maintain any streak for 7 days", icon: "🔥", requirement: "7-day streak", xpBonus: 200, unlocked: false },
  { name: "Discipline King", description: "Plan your day 20 times", icon: "👑", requirement: "20 planned days", xpBonus: 200, unlocked: false },
  { name: "Cold Warrior", description: "Take 10 cold showers", icon: "🧊", requirement: "10 cold showers", xpBonus: 150, unlocked: false },
  { name: "Level 5", description: "Reach overall level 5", icon: "⭐", requirement: "Overall level 5", xpBonus: 500, unlocked: false },
  { name: "Level 10", description: "Reach overall level 10", icon: "🌟", requirement: "Overall level 10", xpBonus: 1000, unlocked: false },
  { name: "Quest Slayer", description: "Complete 10 daily quests", icon: "🗡️", requirement: "10 daily quests completed", xpBonus: 200, unlocked: false },
  { name: "Boss Killer", description: "Win your first boss fight", icon: "💀", requirement: "Win 1 boss fight", xpBonus: 500, unlocked: false },
];

async function ensureAchievementsExist(userId: number) {
  const existing = await db.select().from(achievementsTable).where(eq(achievementsTable.userId, userId));
  for (const a of DEFAULT_ACHIEVEMENTS) {
    if (!existing.find(e => e.name === a.name)) {
      await db.insert(achievementsTable).values({ ...a, userId });
    }
  }
}

router.get("/achievements", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  await ensureAchievementsExist(userId);
  const achievements = await db.select().from(achievementsTable).where(eq(achievementsTable.userId, userId)).orderBy(achievementsTable.id);
  res.json(achievements);
});

export default router;
