import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, achievementsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

// Progressive achievement system
// For activity-based achievements: Rookie I-III, Warrior I-III, Champion I-III, Legend I-III, Olympian I-III, then Legacy (infinite)
// For other achievements: same name, increasing requirements

interface AchievementDef {
  name: string;
  description: string;
  icon: string;
  requirement: string;
  xpBonus: number;
}

function tierAchievements(baseName: string, icon: string, activityDesc: string, counts: number[], tierNames: string[]): AchievementDef[] {
  return counts.map((count, i) => ({
    name: `${tierNames[i]}`,
    description: `${activityDesc} ${count} times`,
    icon,
    requirement: `${count} ${activityDesc.toLowerCase()}`,
    xpBonus: Math.floor(50 * Math.pow(1.5, i)),
  }));
}

const DEFAULT_ACHIEVEMENTS: AchievementDef[] = [
  // ── General Milestones ──
  { name: "First Steps", description: "Complete your first daily log", icon: "👟", requirement: "Log 1 day", xpBonus: 50 },
  { name: "Quest Slayer", description: "Complete 10 daily quests", icon: "🗡️", requirement: "10 daily quests", xpBonus: 200 },
  { name: "Boss Killer", description: "Win your first boss fight", icon: "💀", requirement: "Win 1 boss fight", xpBonus: 500 },

  // ── Level Milestones ──
  { name: "Level 5", description: "Reach overall level 5", icon: "⭐", requirement: "Overall level 5", xpBonus: 500 },
  { name: "Level 10", description: "Reach overall level 10", icon: "🌟", requirement: "Overall level 10", xpBonus: 1000 },
  { name: "Level 25", description: "Reach overall level 25", icon: "💫", requirement: "Overall level 25", xpBonus: 2500 },
  { name: "Level 50", description: "Reach overall level 50", icon: "🏆", requirement: "Overall level 50", xpBonus: 5000 },

  // ── Gym: Rookie → Warrior → Champion → Legend → Olympian (I-III each) ──
  ...tierAchievements("Gym", "💪", "Gym sessions",
    [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500],
    ["Gym Rookie I", "Gym Rookie II", "Gym Rookie III",
     "Gym Warrior I", "Gym Warrior II", "Gym Warrior III",
     "Gym Champion I", "Gym Champion II", "Gym Champion III",
     "Gym Legend I", "Gym Legend II", "Gym Legend III",
     "Gym Olympian I", "Gym Olympian II", "Gym Olympian III"]),

  // ── Running ──
  ...tierAchievements("Run", "🏃", "Running sessions",
    [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500],
    ["Runner Rookie I", "Runner Rookie II", "Runner Rookie III",
     "Runner Warrior I", "Runner Warrior II", "Runner Warrior III",
     "Runner Champion I", "Runner Champion II", "Runner Champion III",
     "Runner Legend I", "Runner Legend II", "Runner Legend III",
     "Runner Olympian I", "Runner Olympian II", "Runner Olympian III"]),

  // ── Basketball ──
  ...tierAchievements("Hoops", "🏀", "Basketball sessions",
    [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500],
    ["Hooper Rookie I", "Hooper Rookie II", "Hooper Rookie III",
     "Hooper Warrior I", "Hooper Warrior II", "Hooper Warrior III",
     "Hooper Champion I", "Hooper Champion II", "Hooper Champion III",
     "Hooper Legend I", "Hooper Legend II", "Hooper Legend III",
     "Hooper Olympian I", "Hooper Olympian II", "Hooper Olympian III"]),

  // ── Study ──
  ...tierAchievements("Study", "📚", "Study sessions",
    [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500],
    ["Scholar Rookie I", "Scholar Rookie II", "Scholar Rookie III",
     "Scholar Warrior I", "Scholar Warrior II", "Scholar Warrior III",
     "Scholar Champion I", "Scholar Champion II", "Scholar Champion III",
     "Scholar Legend I", "Scholar Legend II", "Scholar Legend III",
     "Scholar Olympian I", "Scholar Olympian II", "Scholar Olympian III"]),

  // ── Piano ──
  ...tierAchievements("Piano", "🎹", "Piano sessions",
    [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500],
    ["Maestro Rookie I", "Maestro Rookie II", "Maestro Rookie III",
     "Maestro Warrior I", "Maestro Warrior II", "Maestro Warrior III",
     "Maestro Champion I", "Maestro Champion II", "Maestro Champion III",
     "Maestro Legend I", "Maestro Legend II", "Maestro Legend III",
     "Maestro Olympian I", "Maestro Olympian II", "Maestro Olympian III"]),

  // ── Social ──
  ...tierAchievements("Social", "🗣️", "Social interactions",
    [5, 10, 20, 50, 100, 200, 500],
    ["Socializer Rookie I", "Socializer Rookie II", "Socializer Rookie III",
     "Socializer Warrior I", "Socializer Warrior II",
     "Socializer Champion I", "Socializer Olympian I"]),

  // ── Streak achievements (same name, escalating) ──
  { name: "Streak Master I", description: "Maintain any streak for 7 days", icon: "🔥", requirement: "7-day streak", xpBonus: 200 },
  { name: "Streak Master II", description: "Maintain any streak for 14 days", icon: "🔥", requirement: "14-day streak", xpBonus: 400 },
  { name: "Streak Master III", description: "Maintain any streak for 30 days", icon: "🔥", requirement: "30-day streak", xpBonus: 800 },
  { name: "Streak Master IV", description: "Maintain any streak for 60 days", icon: "🔥", requirement: "60-day streak", xpBonus: 1500 },
  { name: "Streak Master V", description: "Maintain any streak for 100 days", icon: "🔥", requirement: "100-day streak", xpBonus: 3000 },

  // ── Cold Warrior (escalating) ──
  { name: "Cold Warrior I", description: "Take 10 cold showers", icon: "🧊", requirement: "10 cold showers", xpBonus: 150 },
  { name: "Cold Warrior II", description: "Take 30 cold showers", icon: "🧊", requirement: "30 cold showers", xpBonus: 300 },
  { name: "Cold Warrior III", description: "Take 100 cold showers", icon: "🧊", requirement: "100 cold showers", xpBonus: 750 },
  { name: "Cold Warrior IV", description: "Take 365 cold showers", icon: "🧊", requirement: "365 cold showers", xpBonus: 2000 },

  // ── Discipline King (escalating) ──
  { name: "Discipline King I", description: "Plan your day 20 times", icon: "👑", requirement: "20 planned days", xpBonus: 200 },
  { name: "Discipline King II", description: "Plan your day 50 times", icon: "👑", requirement: "50 planned days", xpBonus: 400 },
  { name: "Discipline King III", description: "Plan your day 100 times", icon: "👑", requirement: "100 planned days", xpBonus: 800 },
  { name: "Discipline King IV", description: "Plan your day 365 times", icon: "👑", requirement: "365 planned days", xpBonus: 2000 },
];

async function ensureAchievementsExist(userId: number) {
  const existing = await db.select().from(achievementsTable).where(eq(achievementsTable.userId, userId));
  for (const a of DEFAULT_ACHIEVEMENTS) {
    if (!existing.find(e => e.name === a.name)) {
      await db.insert(achievementsTable).values({ ...a, userId, unlocked: false });
    }
  }
}

router.get("/achievements", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  await ensureAchievementsExist(userId);

  const achievements = await db.select().from(achievementsTable).where(eq(achievementsTable.userId, userId)).orderBy(achievementsTable.id);

  // Only show the next unfinished achievement in each chain + all unlocked ones
  // Group by base name (strip the roman numeral suffix)
  const chains = new Map<string, typeof achievements>();
  for (const a of achievements) {
    const baseName = a.name.replace(/\s+[IVX]+$/, "").replace(/\s+\d+$/, "");
    if (!chains.has(baseName)) chains.set(baseName, []);
    chains.get(baseName)!.push(a);
  }

  const visible: typeof achievements = [];
  for (const [, chain] of chains) {
    // Show all unlocked + the first locked one (the "next" to unlock)
    const unlocked = chain.filter(a => a.unlocked);
    const locked = chain.filter(a => !a.unlocked);
    visible.push(...unlocked);
    if (locked.length > 0) visible.push(locked[0]);
  }

  // Sort: unlocked first (newest first), then locked
  visible.sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return a.id - b.id;
  });

  res.json(visible);
});

export default router;
