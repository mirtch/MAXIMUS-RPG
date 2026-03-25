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

// Standard 15-tier progression: Rookie I-III → Warrior I-III → Champion I-III → Legend I-III → Olympian I-III
const STANDARD_COUNTS = [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500];
function std15(prefix: string): string[] {
  return [
    `${prefix} Rookie I`, `${prefix} Rookie II`, `${prefix} Rookie III`,
    `${prefix} Warrior I`, `${prefix} Warrior II`, `${prefix} Warrior III`,
    `${prefix} Champion I`, `${prefix} Champion II`, `${prefix} Champion III`,
    `${prefix} Legend I`, `${prefix} Legend II`, `${prefix} Legend III`,
    `${prefix} Olympian I`, `${prefix} Olympian II`, `${prefix} Olympian III`,
  ];
}

const DEFAULT_ACHIEVEMENTS: AchievementDef[] = [
  // ═══════════════════════════════════════════
  // GENERAL MILESTONES
  // ═══════════════════════════════════════════
  { name: "First Steps", description: "Complete your first daily log", icon: "👟", requirement: "Log 1 day", xpBonus: 50 },
  { name: "Getting Serious", description: "Complete 7 daily logs", icon: "👟", requirement: "Log 7 days", xpBonus: 100 },
  { name: "Committed", description: "Complete 30 daily logs", icon: "👟", requirement: "Log 30 days", xpBonus: 300 },
  { name: "Veteran Logger", description: "Complete 100 daily logs", icon: "👟", requirement: "Log 100 days", xpBonus: 750 },
  { name: "Living Legend", description: "Complete 365 daily logs", icon: "👟", requirement: "Log 365 days", xpBonus: 3000 },
  { name: "Immortal Scribe", description: "Complete 1000 daily logs", icon: "👟", requirement: "Log 1000 days", xpBonus: 10000 },

  { name: "Quest Slayer I", description: "Complete 10 daily quests", icon: "🗡️", requirement: "10 daily quests", xpBonus: 200 },
  { name: "Quest Slayer II", description: "Complete 50 daily quests", icon: "🗡️", requirement: "50 daily quests", xpBonus: 500 },
  { name: "Quest Slayer III", description: "Complete 100 daily quests", icon: "🗡️", requirement: "100 daily quests", xpBonus: 1000 },
  { name: "Quest Slayer IV", description: "Complete 300 daily quests", icon: "🗡️", requirement: "300 daily quests", xpBonus: 2500 },
  { name: "Quest Slayer V", description: "Complete 1000 daily quests", icon: "🗡️", requirement: "1000 daily quests", xpBonus: 7500 },

  { name: "Boss Killer I", description: "Win your first boss fight", icon: "💀", requirement: "Win 1 boss fight", xpBonus: 500 },
  { name: "Boss Killer II", description: "Win 5 boss fights", icon: "💀", requirement: "Win 5 boss fights", xpBonus: 1000 },
  { name: "Boss Killer III", description: "Win 10 boss fights", icon: "💀", requirement: "Win 10 boss fights", xpBonus: 2000 },
  { name: "Boss Killer IV", description: "Win 25 boss fights", icon: "💀", requirement: "Win 25 boss fights", xpBonus: 5000 },
  { name: "Boss Killer V", description: "Win 50 boss fights", icon: "💀", requirement: "Win 50 boss fights", xpBonus: 10000 },

  // ═══════════════════════════════════════════
  // LEVEL MILESTONES (deep progression)
  // ═══════════════════════════════════════════
  { name: "Level 5", description: "Reach overall level 5", icon: "⭐", requirement: "Overall level 5", xpBonus: 500 },
  { name: "Level 10", description: "Reach overall level 10", icon: "⭐", requirement: "Overall level 10", xpBonus: 1000 },
  { name: "Level 25", description: "Reach overall level 25", icon: "🌟", requirement: "Overall level 25", xpBonus: 2500 },
  { name: "Level 50", description: "Reach overall level 50", icon: "🌟", requirement: "Overall level 50", xpBonus: 5000 },
  { name: "Level 75", description: "Reach overall level 75", icon: "💫", requirement: "Overall level 75", xpBonus: 7500 },
  { name: "Level 100", description: "Reach the century mark", icon: "💫", requirement: "Overall level 100", xpBonus: 15000 },
  { name: "Level 150", description: "Ascend beyond mortals", icon: "🏆", requirement: "Overall level 150", xpBonus: 25000 },
  { name: "Level 200", description: "Enter the pantheon", icon: "🏆", requirement: "Overall level 200", xpBonus: 50000 },
  { name: "Level 300", description: "Transcend reality", icon: "👑", requirement: "Overall level 300", xpBonus: 100000 },
  { name: "Level 500", description: "Become a living myth", icon: "👑", requirement: "Overall level 500", xpBonus: 250000 },

  // ── Stat level milestones (any single stat) ──
  { name: "Specialist I", description: "Reach level 10 in any single stat", icon: "🎯", requirement: "Any stat level 10", xpBonus: 500 },
  { name: "Specialist II", description: "Reach level 25 in any single stat", icon: "🎯", requirement: "Any stat level 25", xpBonus: 1500 },
  { name: "Specialist III", description: "Reach level 50 in any single stat", icon: "🎯", requirement: "Any stat level 50", xpBonus: 5000 },
  { name: "Specialist IV", description: "Reach level 100 in any single stat", icon: "🎯", requirement: "Any stat level 100", xpBonus: 15000 },

  // ── Total XP milestones ──
  { name: "XP Hoarder I", description: "Accumulate 1,000 total XP", icon: "💰", requirement: "1000 total XP", xpBonus: 100 },
  { name: "XP Hoarder II", description: "Accumulate 5,000 total XP", icon: "💰", requirement: "5000 total XP", xpBonus: 500 },
  { name: "XP Hoarder III", description: "Accumulate 10,000 total XP", icon: "💰", requirement: "10000 total XP", xpBonus: 1000 },
  { name: "XP Hoarder IV", description: "Accumulate 50,000 total XP", icon: "💰", requirement: "50000 total XP", xpBonus: 5000 },
  { name: "XP Hoarder V", description: "Accumulate 100,000 total XP", icon: "💰", requirement: "100000 total XP", xpBonus: 10000 },
  { name: "XP Hoarder VI", description: "Accumulate 500,000 total XP", icon: "💰", requirement: "500000 total XP", xpBonus: 50000 },
  { name: "XP Hoarder VII", description: "Accumulate 1,000,000 total XP", icon: "💰", requirement: "1000000 total XP", xpBonus: 100000 },

  // ═══════════════════════════════════════════
  // PHYSICAL TRAINING (15-tier each)
  // ═══════════════════════════════════════════

  // ── Gym ──
  ...tierAchievements("Gym", "💪", "Gym sessions", STANDARD_COUNTS, std15("Gym")),

  // ── Running ──
  ...tierAchievements("Run", "🏃", "Running sessions", STANDARD_COUNTS, std15("Runner")),

  // ── Basketball ──
  ...tierAchievements("Hoops", "🏀", "Basketball sessions", STANDARD_COUNTS, std15("Hooper")),

  // ── Stretching / Mobility ──
  ...tierAchievements("Stretch", "🧘‍♂️", "Stretching sessions", STANDARD_COUNTS, std15("Flex")),

  // ── Swimming ──
  ...tierAchievements("Swim", "🏊", "Swimming sessions", STANDARD_COUNTS, std15("Swimmer")),

  // ── Walking / Steps ──
  ...tierAchievements("Walk", "🚶", "Walking sessions (10k+ steps)", STANDARD_COUNTS, std15("Walker")),

  // ── Pushups ──
  ...tierAchievements("Pushups", "🫸", "Pushup sessions (100+)",
    [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500],
    std15("Pushup")),

  // ═══════════════════════════════════════════
  // MENTAL & INTELLECTUAL (15-tier each)
  // ═══════════════════════════════════════════

  // ── Study / Deep Work ──
  ...tierAchievements("Study", "📚", "Study sessions", STANDARD_COUNTS, std15("Scholar")),

  // ── Deep Work (focused 45+ min blocks) ──
  ...tierAchievements("DeepWork", "🧠", "Deep work sessions",
    [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500],
    std15("Focus")),

  // ── Reading ──
  ...tierAchievements("Reading", "📖", "Reading sessions",
    [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500],
    std15("Reader")),

  // ── Journaling ──
  ...tierAchievements("Journal", "✍️", "Journaling sessions",
    [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500],
    std15("Scribe")),

  // ═══════════════════════════════════════════
  // CREATIVE & ARTISTIC (15-tier each)
  // ═══════════════════════════════════════════

  // ── Piano ──
  ...tierAchievements("Piano", "🎹", "Piano sessions", STANDARD_COUNTS, std15("Maestro")),

  // ── Guitar / Music (generic) ──
  ...tierAchievements("Music", "🎸", "Music practice sessions", STANDARD_COUNTS, std15("Musician")),

  // ── Creative Work (art, design, writing) ──
  ...tierAchievements("Creative", "🎨", "Creative sessions", STANDARD_COUNTS, std15("Artist")),

  // ═══════════════════════════════════════════
  // SOCIAL & COURAGE (15-tier)
  // ═══════════════════════════════════════════
  ...tierAchievements("Social", "🗣️", "Social interactions", STANDARD_COUNTS, std15("Socializer")),

  // ── Compliments given ──
  ...tierAchievements("Compliments", "💬", "Compliments given",
    [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500],
    std15("Charmer")),

  // ── Talk to strangers ──
  ...tierAchievements("Strangers", "🤝", "Strangers talked to",
    [3, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000],
    std15("Boldness")),

  // ═══════════════════════════════════════════
  // WEALTH & CAREER (15-tier + manual)
  // ═══════════════════════════════════════════

  // ── Work sessions ──
  ...tierAchievements("Work", "💼", "Work sessions", STANDARD_COUNTS, std15("Worker")),

  // ── Freelance / Side hustle ──
  ...tierAchievements("Freelance", "🚀", "Freelance sessions", STANDARD_COUNTS, std15("Hustler")),

  // ── Career study ──
  ...tierAchievements("CareerStudy", "📈", "Career study sessions", STANDARD_COUNTS, std15("Climber")),

  // ── Budgeting ──
  { name: "Budgeter I", description: "Track expenses 10 times", icon: "📊", requirement: "10 expense tracking", xpBonus: 150 },
  { name: "Budgeter II", description: "Track expenses 30 times", icon: "📊", requirement: "30 expense tracking", xpBonus: 300 },
  { name: "Budgeter III", description: "Track expenses 100 times", icon: "📊", requirement: "100 expense tracking", xpBonus: 750 },
  { name: "Budgeter IV", description: "Track expenses 300 times", icon: "📊", requirement: "300 expense tracking", xpBonus: 2500 },
  { name: "Budgeter V", description: "Track expenses 1000 times — CFO", icon: "📊", requirement: "1000 expense tracking", xpBonus: 10000 },

  // ── Investing ──
  { name: "Investor I", description: "Study investing 10 times", icon: "📉", requirement: "10 investing sessions", xpBonus: 200 },
  { name: "Investor II", description: "Study investing 30 times", icon: "📉", requirement: "30 investing sessions", xpBonus: 500 },
  { name: "Investor III", description: "Study investing 100 times", icon: "📉", requirement: "100 investing sessions", xpBonus: 1500 },
  { name: "Investor IV", description: "Study investing 300 times", icon: "📉", requirement: "300 investing sessions", xpBonus: 5000 },
  { name: "Investor V", description: "Study investing 1000 times — Wall Street", icon: "📉", requirement: "1000 investing sessions", xpBonus: 15000 },

  // ── Job applications ──
  { name: "Job Hunter I", description: "Apply to 5 jobs", icon: "📝", requirement: "5 job applications", xpBonus: 200 },
  { name: "Job Hunter II", description: "Apply to 15 jobs", icon: "📝", requirement: "15 job applications", xpBonus: 500 },
  { name: "Job Hunter III", description: "Apply to 30 jobs", icon: "📝", requirement: "30 job applications", xpBonus: 1000 },
  { name: "Job Hunter IV", description: "Apply to 75 jobs", icon: "📝", requirement: "75 job applications", xpBonus: 3000 },
  { name: "Job Hunter V", description: "Apply to 150 jobs — Relentless", icon: "📝", requirement: "150 job applications", xpBonus: 7500 },

  // ── Project building ──
  ...tierAchievements("Projects", "🛠️", "Project work sessions", STANDARD_COUNTS, std15("Builder")),

  // ── Saving money (days without unnecessary spending) ──
  { name: "Saver I", description: "Save money 10 days (no unnecessary spending)", icon: "🏦", requirement: "10 saving days", xpBonus: 150 },
  { name: "Saver II", description: "Save money 30 days", icon: "🏦", requirement: "30 saving days", xpBonus: 300 },
  { name: "Saver III", description: "Save money 100 days", icon: "🏦", requirement: "100 saving days", xpBonus: 750 },
  { name: "Saver IV", description: "Save money 300 days", icon: "🏦", requirement: "300 saving days", xpBonus: 2500 },
  { name: "Saver V", description: "Save money 1000 days — Vault Master", icon: "🏦", requirement: "1000 saving days", xpBonus: 10000 },

  // ═══════════════════════════════════════════
  // DISCIPLINE & HABITS
  // ═══════════════════════════════════════════

  // ── Cold Showers (deep progression!) ──
  { name: "Cold Warrior I", description: "Take 10 cold showers", icon: "🧊", requirement: "10 cold showers", xpBonus: 150 },
  { name: "Cold Warrior II", description: "Take 30 cold showers", icon: "🧊", requirement: "30 cold showers", xpBonus: 300 },
  { name: "Cold Warrior III", description: "Take 50 cold showers", icon: "🧊", requirement: "50 cold showers", xpBonus: 500 },
  { name: "Cold Warrior IV", description: "Take 100 cold showers", icon: "🧊", requirement: "100 cold showers", xpBonus: 750 },
  { name: "Cold Warrior V", description: "Take 200 cold showers", icon: "🧊", requirement: "200 cold showers", xpBonus: 1500 },
  { name: "Cold Warrior VI", description: "Take 300 cold showers", icon: "🧊", requirement: "300 cold showers", xpBonus: 2500 },
  { name: "Cold Warrior VII", description: "Take 500 cold showers", icon: "🧊", requirement: "500 cold showers", xpBonus: 5000 },
  { name: "Cold Warrior VIII", description: "Take 750 cold showers", icon: "🧊", requirement: "750 cold showers", xpBonus: 7500 },
  { name: "Cold Warrior IX", description: "Take 1000 cold showers — Iceman", icon: "🧊", requirement: "1000 cold showers", xpBonus: 15000 },
  { name: "Cold Warrior X", description: "Take 2000 cold showers — Absolute Zero", icon: "🧊", requirement: "2000 cold showers", xpBonus: 30000 },

  // ── Discipline King (planned days) ──
  { name: "Discipline King I", description: "Plan your day 20 times", icon: "👑", requirement: "20 planned days", xpBonus: 200 },
  { name: "Discipline King II", description: "Plan your day 50 times", icon: "👑", requirement: "50 planned days", xpBonus: 400 },
  { name: "Discipline King III", description: "Plan your day 100 times", icon: "👑", requirement: "100 planned days", xpBonus: 800 },
  { name: "Discipline King IV", description: "Plan your day 200 times", icon: "👑", requirement: "200 planned days", xpBonus: 1500 },
  { name: "Discipline King V", description: "Plan your day 365 times — Full Year", icon: "👑", requirement: "365 planned days", xpBonus: 3000 },
  { name: "Discipline King VI", description: "Plan your day 500 times", icon: "👑", requirement: "500 planned days", xpBonus: 5000 },
  { name: "Discipline King VII", description: "Plan your day 1000 times — Architect of Life", icon: "👑", requirement: "1000 planned days", xpBonus: 15000 },

  // ── Wake Up Early ──
  { name: "Early Bird I", description: "Wake up before 7 AM — 10 times", icon: "🌅", requirement: "10 early mornings", xpBonus: 150 },
  { name: "Early Bird II", description: "Wake up before 7 AM — 30 times", icon: "🌅", requirement: "30 early mornings", xpBonus: 300 },
  { name: "Early Bird III", description: "Wake up before 7 AM — 100 times", icon: "🌅", requirement: "100 early mornings", xpBonus: 750 },
  { name: "Early Bird IV", description: "Wake up before 7 AM — 300 times", icon: "🌅", requirement: "300 early mornings", xpBonus: 2500 },
  { name: "Early Bird V", description: "Wake up before 7 AM — 1000 times", icon: "🌅", requirement: "1000 early mornings", xpBonus: 10000 },

  // ── No Phone / Low Screen Time Days ──
  { name: "Digital Detox I", description: "Keep screen time under 2h — 10 times", icon: "📵", requirement: "10 low screen days", xpBonus: 200 },
  { name: "Digital Detox II", description: "Keep screen time under 2h — 30 times", icon: "📵", requirement: "30 low screen days", xpBonus: 400 },
  { name: "Digital Detox III", description: "Keep screen time under 2h — 100 times", icon: "📵", requirement: "100 low screen days", xpBonus: 1000 },
  { name: "Digital Detox IV", description: "Keep screen time under 2h — 300 times", icon: "📵", requirement: "300 low screen days", xpBonus: 3000 },
  { name: "Digital Detox V", description: "Keep screen time under 2h — 1000 times", icon: "📵", requirement: "1000 low screen days", xpBonus: 10000 },

  // ── Meditation ──
  ...tierAchievements("Meditate", "🧘", "Meditation sessions", STANDARD_COUNTS, std15("Zen")),

  // ── 8h+ Sleep ──
  { name: "Sleep Champion I", description: "Sleep 8+ hours — 10 times", icon: "😴", requirement: "10 nights 8h+ sleep", xpBonus: 150 },
  { name: "Sleep Champion II", description: "Sleep 8+ hours — 30 times", icon: "😴", requirement: "30 nights 8h+ sleep", xpBonus: 300 },
  { name: "Sleep Champion III", description: "Sleep 8+ hours — 100 times", icon: "😴", requirement: "100 nights 8h+ sleep", xpBonus: 750 },
  { name: "Sleep Champion IV", description: "Sleep 8+ hours — 300 times", icon: "😴", requirement: "300 nights 8h+ sleep", xpBonus: 2500 },
  { name: "Sleep Champion V", description: "Sleep 8+ hours — 1000 times", icon: "😴", requirement: "1000 nights 8h+ sleep", xpBonus: 10000 },

  // ── Hydration ──
  { name: "Hydration I", description: "Drink enough water — 10 days", icon: "💧", requirement: "10 hydrated days", xpBonus: 100 },
  { name: "Hydration II", description: "Drink enough water — 30 days", icon: "💧", requirement: "30 hydrated days", xpBonus: 200 },
  { name: "Hydration III", description: "Drink enough water — 100 days", icon: "💧", requirement: "100 hydrated days", xpBonus: 500 },
  { name: "Hydration IV", description: "Drink enough water — 365 days", icon: "💧", requirement: "365 hydrated days", xpBonus: 2000 },
  { name: "Hydration V", description: "Drink enough water — 1000 days", icon: "💧", requirement: "1000 hydrated days", xpBonus: 7500 },

  // ── Healthy Eating / Cooking ──
  { name: "Chef I", description: "Cook a healthy meal — 10 times", icon: "🥗", requirement: "10 healthy meals", xpBonus: 100 },
  { name: "Chef II", description: "Cook a healthy meal — 30 times", icon: "🥗", requirement: "30 healthy meals", xpBonus: 200 },
  { name: "Chef III", description: "Cook a healthy meal — 100 times", icon: "🥗", requirement: "100 healthy meals", xpBonus: 500 },
  { name: "Chef IV", description: "Cook a healthy meal — 300 times", icon: "🥗", requirement: "300 healthy meals", xpBonus: 1500 },
  { name: "Chef V", description: "Cook a healthy meal — 1000 times", icon: "🥗", requirement: "1000 healthy meals", xpBonus: 5000 },

  // ═══════════════════════════════════════════
  // STREAKS (deep progression)
  // ═══════════════════════════════════════════
  { name: "Streak Master I", description: "Maintain any streak for 7 days", icon: "🔥", requirement: "7-day streak", xpBonus: 200 },
  { name: "Streak Master II", description: "Maintain any streak for 14 days", icon: "🔥", requirement: "14-day streak", xpBonus: 400 },
  { name: "Streak Master III", description: "Maintain any streak for 30 days", icon: "🔥", requirement: "30-day streak", xpBonus: 800 },
  { name: "Streak Master IV", description: "Maintain any streak for 60 days", icon: "🔥", requirement: "60-day streak", xpBonus: 1500 },
  { name: "Streak Master V", description: "Maintain any streak for 100 days", icon: "🔥", requirement: "100-day streak", xpBonus: 3000 },
  { name: "Streak Master VI", description: "Maintain any streak for 200 days", icon: "🔥", requirement: "200-day streak", xpBonus: 6000 },
  { name: "Streak Master VII", description: "Maintain any streak for 365 days — Full Year!", icon: "🔥", requirement: "365-day streak", xpBonus: 15000 },
  { name: "Streak Master VIII", description: "Maintain any streak for 500 days", icon: "🔥", requirement: "500-day streak", xpBonus: 25000 },
  { name: "Streak Master IX", description: "Maintain any streak for 1000 days — Eternal Flame", icon: "🔥", requirement: "1000-day streak", xpBonus: 50000 },

  // ═══════════════════════════════════════════
  // SOCIAL / MULTIPLAYER
  // ═══════════════════════════════════════════
  { name: "Party of Two", description: "Add your first friend", icon: "👥", requirement: "1 friend", xpBonus: 100 },
  { name: "Squad", description: "Have 5 friends", icon: "👥", requirement: "5 friends", xpBonus: 300 },
  { name: "Guild", description: "Have 10 friends", icon: "👥", requirement: "10 friends", xpBonus: 750 },
  { name: "Legion", description: "Have 25 friends", icon: "👥", requirement: "25 friends", xpBonus: 2000 },

  { name: "Challenger I", description: "Win 1 challenge", icon: "⚔️", requirement: "Win 1 challenge", xpBonus: 200 },
  { name: "Challenger II", description: "Win 5 challenges", icon: "⚔️", requirement: "Win 5 challenges", xpBonus: 500 },
  { name: "Challenger III", description: "Win 10 challenges", icon: "⚔️", requirement: "Win 10 challenges", xpBonus: 1000 },
  { name: "Challenger IV", description: "Win 25 challenges", icon: "⚔️", requirement: "Win 25 challenges", xpBonus: 2500 },
  { name: "Challenger V", description: "Win 50 challenges", icon: "⚔️", requirement: "Win 50 challenges", xpBonus: 5000 },
  { name: "Challenger VI", description: "Win 100 challenges — Undefeated", icon: "⚔️", requirement: "Win 100 challenges", xpBonus: 15000 },

  // ── Side Quests ──
  { name: "Side Quest Hunter I", description: "Complete 5 side quests", icon: "📜", requirement: "5 side quests", xpBonus: 200 },
  { name: "Side Quest Hunter II", description: "Complete 15 side quests", icon: "📜", requirement: "15 side quests", xpBonus: 400 },
  { name: "Side Quest Hunter III", description: "Complete 30 side quests", icon: "📜", requirement: "30 side quests", xpBonus: 800 },
  { name: "Side Quest Hunter IV", description: "Complete 75 side quests", icon: "📜", requirement: "75 side quests", xpBonus: 2000 },
  { name: "Side Quest Hunter V", description: "Complete 150 side quests", icon: "📜", requirement: "150 side quests", xpBonus: 5000 },

  // ── Main Quests ──
  { name: "Epic Adventurer I", description: "Complete 1 main quest", icon: "🗺️", requirement: "1 main quest", xpBonus: 500 },
  { name: "Epic Adventurer II", description: "Complete 3 main quests", icon: "🗺️", requirement: "3 main quests", xpBonus: 1500 },
  { name: "Epic Adventurer III", description: "Complete 5 main quests", icon: "🗺️", requirement: "5 main quests", xpBonus: 3000 },
  { name: "Epic Adventurer IV", description: "Complete 10 main quests", icon: "🗺️", requirement: "10 main quests", xpBonus: 7500 },
  { name: "Epic Adventurer V", description: "Complete 25 main quests — Worldsaver", icon: "🗺️", requirement: "25 main quests", xpBonus: 20000 },

  // ═══════════════════════════════════════════
  // LIFE LOG (cultural enrichment)
  // ═══════════════════════════════════════════
  { name: "Bookworm I", description: "Log 5 books", icon: "📚", requirement: "5 books logged", xpBonus: 200 },
  { name: "Bookworm II", description: "Log 15 books", icon: "📚", requirement: "15 books logged", xpBonus: 400 },
  { name: "Bookworm III", description: "Log 30 books", icon: "📚", requirement: "30 books logged", xpBonus: 800 },
  { name: "Bookworm IV", description: "Log 50 books", icon: "📚", requirement: "50 books logged", xpBonus: 1500 },
  { name: "Bookworm V", description: "Log 100 books — Bibliophile", icon: "📚", requirement: "100 books logged", xpBonus: 5000 },
  { name: "Bookworm VI", description: "Log 200 books", icon: "📚", requirement: "200 books logged", xpBonus: 10000 },

  { name: "Cinephile I", description: "Log 10 movies", icon: "🎬", requirement: "10 movies logged", xpBonus: 150 },
  { name: "Cinephile II", description: "Log 30 movies", icon: "🎬", requirement: "30 movies logged", xpBonus: 300 },
  { name: "Cinephile III", description: "Log 75 movies", icon: "🎬", requirement: "75 movies logged", xpBonus: 750 },
  { name: "Cinephile IV", description: "Log 150 movies", icon: "🎬", requirement: "150 movies logged", xpBonus: 2000 },
  { name: "Cinephile V", description: "Log 300 movies", icon: "🎬", requirement: "300 movies logged", xpBonus: 5000 },

  { name: "Audiophile I", description: "Log 10 albums/songs", icon: "🎵", requirement: "10 music logged", xpBonus: 100 },
  { name: "Audiophile II", description: "Log 30 albums/songs", icon: "🎵", requirement: "30 music logged", xpBonus: 200 },
  { name: "Audiophile III", description: "Log 100 albums/songs", icon: "🎵", requirement: "100 music logged", xpBonus: 500 },
  { name: "Audiophile IV", description: "Log 300 albums/songs", icon: "🎵", requirement: "300 music logged", xpBonus: 1500 },

  { name: "Piano Piece I", description: "Master 3 piano pieces", icon: "🎼", requirement: "3 pieces mastered", xpBonus: 300 },
  { name: "Piano Piece II", description: "Master 10 piano pieces", icon: "🎼", requirement: "10 pieces mastered", xpBonus: 1000 },
  { name: "Piano Piece III", description: "Master 25 piano pieces", icon: "🎼", requirement: "25 pieces mastered", xpBonus: 3000 },
  { name: "Piano Piece IV", description: "Master 50 piano pieces — Virtuoso", icon: "🎼", requirement: "50 pieces mastered", xpBonus: 10000 },

  // ═══════════════════════════════════════════
  // SECRET / RARE ACHIEVEMENTS
  // ═══════════════════════════════════════════
  { name: "Perfect Day", description: "Complete every must-do activity in a single day", icon: "✨", requirement: "All must-dos in 1 day", xpBonus: 500 },
  { name: "Zero Screen", description: "Log 0 hours screen time in a single day", icon: "🚫", requirement: "0h screen time day", xpBonus: 300 },
  { name: "Iron Sleep", description: "Sleep exactly 8 hours for 7 days straight", icon: "🛡️", requirement: "7 consecutive 8h sleep", xpBonus: 750 },
  { name: "Triple Threat", description: "Do gym + running + basketball in a single day", icon: "🏅", requirement: "3 sports in 1 day", xpBonus: 400 },
  { name: "Renaissance Man", description: "Gain XP in all 9 stats in a single daily log", icon: "🎭", requirement: "All 9 stats in 1 log", xpBonus: 1000 },
  { name: "No Days Off I", description: "Log every single day for a month (30 days)", icon: "📅", requirement: "30 consecutive logs", xpBonus: 2000 },
  { name: "No Days Off II", description: "Log every single day for 3 months (90 days)", icon: "📅", requirement: "90 consecutive logs", xpBonus: 7500 },
  { name: "No Days Off III", description: "Log every single day for a year (365 days)", icon: "📅", requirement: "365 consecutive logs", xpBonus: 30000 },
  { name: "XP Explosion", description: "Gain 500+ XP in a single daily log", icon: "💥", requirement: "500 XP in 1 day", xpBonus: 500 },
  { name: "XP Supernova", description: "Gain 1000+ XP in a single daily log", icon: "💥", requirement: "1000 XP in 1 day", xpBonus: 2000 },
  { name: "Marathon Session", description: "Log 3+ hours on a single activity", icon: "⏱️", requirement: "180+ min on 1 activity", xpBonus: 300 },
  { name: "Night Owl", description: "Submit your log after 11 PM — 50 times", icon: "🦉", requirement: "50 late-night logs", xpBonus: 500 },
  { name: "The Grind", description: "Complete 10+ activities in a single daily log", icon: "⚡", requirement: "10+ activities in 1 log", xpBonus: 500 },
  { name: "Penalty-Free Month", description: "Go 30 days without losing any XP", icon: "🛡️", requirement: "30 days no XP loss", xpBonus: 2000 },
  { name: "Comeback Kid", description: "Gain 200+ XP after losing 100+ XP the previous day", icon: "🔄", requirement: "Big comeback", xpBonus: 500 },
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
