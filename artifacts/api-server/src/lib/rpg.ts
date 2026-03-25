export const STAT_NAMES = [
  "strength",
  "stamina",
  "athletics",
  "intellect",
  "wealth",
  "discipline",
  "health",
  "charisma",
  "creativity",
] as const;

export type StatName = (typeof STAT_NAMES)[number];

export const STAT_DISPLAY_NAMES: Record<StatName, string> = {
  strength: "Strength",
  stamina: "Stamina",
  athletics: "Athletics",
  intellect: "Intellect",
  wealth: "Wealth",
  discipline: "Discipline",
  health: "Health",
  charisma: "Charisma",
  creativity: "Creativity",
};

export const LEVEL_TITLES: Record<number, string> = {
  1: "Novice",
  2: "Apprentice",
  3: "Adept",
  4: "Skilled",
  5: "Expert",
  6: "Elite",
  7: "Master",
  8: "Champion",
  9: "Legend",
  10: "Mythic",
  11: "Olympian",
  12: "Genius",
  13: "Iron Mind",
  14: "Virtuoso",
  15: "Transcendent",
};

export function getTitleForLevel(level: number): string {
  if (level <= 0) return "Unknown";
  if (LEVEL_TITLES[level]) return LEVEL_TITLES[level];
  return `Mythic ${level - 9}`;
}

export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.8));
}

export function getLevelFromXp(xp: number): number {
  let level = 1;
  while (getXpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

export function getXpToNextLevel(xp: number): number {
  const level = getLevelFromXp(xp);
  return getXpForLevel(level + 1) - xp;
}

export function getOverallTitleFromLevel(level: number): string {
  if (level >= 50) return "Legendary Hero";
  if (level >= 30) return "Champion of Life";
  if (level >= 20) return "Elite Prospect";
  if (level >= 15) return "Seasoned Warrior";
  if (level >= 10) return "Rising Champion";
  if (level >= 7) return "Dedicated Warrior";
  if (level >= 5) return "Aspiring Hero";
  if (level >= 3) return "Prospect";
  return "Beginner";
}

export interface XpChange {
  statName: string;
  amount: number;
  reason: string;
}

export interface XpReward {
  statName: string;
  amount: number;
}

// Class bonus multipliers — each class gets +10% to specific stats
export const CLASS_BONUSES: Record<string, string[]> = {
  Warrior: ["strength", "stamina", "discipline"],
  Scholar: ["intellect", "discipline", "creativity"],
  Monk: ["wealth", "discipline", "health"],
  Ranger: ["stamina", "athletics", "health"],
  Artisan: ["creativity", "charisma", "wealth"],
};

export const CLASS_BONUS_MULTIPLIER = 1.1; // 10% bonus

export function applyClassBonus(amount: number, statName: string, characterClass: string): number {
  const bonusStats = CLASS_BONUSES[characterClass];
  if (!bonusStats) return amount;
  if (bonusStats.includes(statName)) {
    return Math.round(amount * CLASS_BONUS_MULTIPLIER);
  }
  return amount;
}

export interface ActivityDef {
  id: number;
  name: string;
  xpRewards: XpReward[];
}

// Time-based XP multiplier: longer sessions = more XP
export function getTimeMultiplier(minutes: number | undefined): number {
  if (!minutes || minutes <= 0) return 1.0; // no time logged = base XP
  if (minutes < 30) return 1.0;   // under 30 min = base
  if (minutes < 60) return 1.25;  // 30-59 min = +25%
  if (minutes < 90) return 1.5;   // 60-89 min = +50%
  return 1.75;                     // 90+ min = +75%
}

export interface DailyLogInput {
  completedActivityIds: number[];
  activityDurations?: Record<string, number>; // activityId → minutes
  sleepHours?: number;
  phoneHours?: number;
  notes?: string | null;
  oneTimeActivities?: Array<{
    displayName: string;
    description: string;
    category: string;
    xpRewards: XpReward[];
  }>;
}

export function calculateXpChanges(
  input: DailyLogInput,
  activityDefs: ActivityDef[],
  characterClass?: string,
): XpChange[] {
  const changes: XpChange[] = [];
  const activityMap = new Map(activityDefs.map(a => [a.id, a]));

  // XP from completed activities (with class bonus + time multiplier)
  for (const actId of input.completedActivityIds) {
    const activity = activityMap.get(actId);
    if (!activity) continue;
    const duration = input.activityDurations?.[String(actId)];
    const timeMult = getTimeMultiplier(duration);
    for (const reward of activity.xpRewards) {
      let amount = Math.round(reward.amount * timeMult);
      amount = characterClass ? applyClassBonus(amount, reward.statName, characterClass) : amount;
      const timeLabel = duration ? ` (${duration}min)` : "";
      changes.push({
        statName: reward.statName,
        amount,
        reason: `${activity.name}${timeLabel}`,
      });
    }
  }

  // Helper to apply class bonus to positive XP only
  const cb = (amount: number, stat: string) =>
    amount > 0 && characterClass ? applyClassBonus(amount, stat, characterClass) : amount;

  // XP from sleep (metric-based thresholds)
  if (input.sleepHours !== undefined) {
    if (input.sleepHours >= 8) {
      changes.push({ statName: "health", amount: cb(30, "health"), reason: "Great sleep (8h+)" });
      changes.push({ statName: "discipline", amount: cb(10, "discipline"), reason: "Well-rested discipline" });
    } else if (input.sleepHours >= 7) {
      changes.push({ statName: "health", amount: cb(20, "health"), reason: "Good sleep (7h+)" });
    } else if (input.sleepHours >= 6) {
      changes.push({ statName: "health", amount: cb(5, "health"), reason: "Adequate sleep" });
    } else if (input.sleepHours <= 5) {
      changes.push({ statName: "health", amount: -30, reason: "Poor sleep (5h or less)" });
      changes.push({ statName: "discipline", amount: -15, reason: "Sleep deprivation" });
    }
  }

  // XP from phone usage (metric-based thresholds)
  if (input.phoneHours !== undefined) {
    if (input.phoneHours >= 5) {
      changes.push({ statName: "discipline", amount: -30, reason: "5+ hours on phone" });
      changes.push({ statName: "wealth", amount: -20, reason: "Phone addiction (lost productivity)" });
    } else if (input.phoneHours >= 3) {
      changes.push({ statName: "discipline", amount: -15, reason: "3+ hours on phone" });
    }
  }

  return changes;
}

export const DAILY_QUEST_POOL = [
  // ── Discipline & Mental ──
  { title: "Cold Shower (2+ min)", description: "Take a cold shower for at least 2 minutes", xpReward: 30, statReward: "discipline" },
  { title: "No Phone 1h Before Sleep", description: "Put your phone away 1 hour before going to sleep", xpReward: 25, statReward: "discipline" },
  { title: "No Social Media Today", description: "Avoid all social media for the entire day", xpReward: 35, statReward: "discipline" },
  { title: "Plan Your Day on Paper", description: "Write out a structured plan for the day", xpReward: 25, statReward: "discipline" },
  { title: "Prepare Everything for Tomorrow", description: "Lay out clothes, pack bags, prep before bed", xpReward: 20, statReward: "discipline" },
  { title: "Clean Your Room Completely", description: "Full room cleaning — no shortcuts", xpReward: 25, statReward: "discipline" },
  { title: "Clean Your Desk", description: "Organize and clean your workspace", xpReward: 15, statReward: "discipline" },
  { title: "Meditate 10 Minutes", description: "Sit in stillness and meditate for 10 minutes", xpReward: 25, statReward: "discipline" },
  { title: "30 Minutes in Silence", description: "No music, no phone, no distractions for 30 minutes", xpReward: 30, statReward: "discipline" },
  { title: "Do One Task You've Been Avoiding", description: "Tackle a task you've been procrastinating on", xpReward: 35, statReward: "discipline" },
  { title: "Do the Hardest Task First", description: "Start the day with the most difficult task", xpReward: 30, statReward: "discipline" },
  { title: "No Complaining All Day", description: "Zero complaints — reframe everything positively", xpReward: 25, statReward: "discipline" },
  { title: "No Junk Dopamine Until 6pm", description: "No YouTube, TikTok, etc. until evening", xpReward: 35, statReward: "discipline" },
  { title: "Read Instead of Phone at Night", description: "Replace phone scrolling with reading before bed", xpReward: 25, statReward: "intellect" },
  { title: "Sleep Earlier Than Usual", description: "Get to bed at least 30 min earlier than normal", xpReward: 20, statReward: "health" },
  { title: "Wake Up — No Snooze", description: "Get out of bed immediately when alarm goes off", xpReward: 25, statReward: "discipline" },
  { title: "No Phone During Meals", description: "Eat every meal without touching your phone", xpReward: 20, statReward: "discipline" },
  { title: "Drink Only Water Today", description: "No sugary drinks, coffee exceptions OK", xpReward: 20, statReward: "health" },
  { title: "Fix Something You've Been Ignoring", description: "Repair, organize, or resolve a lingering issue", xpReward: 25, statReward: "discipline" },
  { title: "Organize Your Files", description: "Clean up school/work files and folders", xpReward: 20, statReward: "discipline" },
  { title: "50 Pushups When You Wake Up", description: "Start the day with 50 pushups", xpReward: 30, statReward: "strength" },
  { title: "5 Min Cold Exposure", description: "Cold shower or cold exposure for 5 minutes", xpReward: 35, statReward: "discipline" },
  { title: "Do One Extra Thing After Tired", description: "Push past fatigue — one more set, one more page", xpReward: 30, statReward: "discipline" },
  { title: "Finish Everything You Started", description: "Complete every task you began today", xpReward: 30, statReward: "discipline" },
  { title: "1 Hour Without Distractions", description: "No music, phone, or distractions for 1 full hour", xpReward: 30, statReward: "discipline" },

  // ── Intellectual ──
  { title: "Write 1 Full Page", description: "Write at least one full page about anything", xpReward: 25, statReward: "creativity" },
  { title: "Read 25 Pages", description: "Read at least 25 pages of any book", xpReward: 25, statReward: "intellect" },
  { title: "Read 20 Pages Non-Fiction", description: "Read 20 pages of a non-fiction book", xpReward: 25, statReward: "intellect" },
  { title: "Study 1 Full Hour", description: "Focused studying for 1 complete hour", xpReward: 30, statReward: "intellect" },
  { title: "Deep Work 45 Minutes", description: "45 min of deep focused work, no phone", xpReward: 30, statReward: "discipline" },
  { title: "Deep Work 90 Minutes", description: "90 min of uninterrupted deep work", xpReward: 45, statReward: "discipline" },
  { title: "Learn Something New 30 Min", description: "Spend 30 minutes learning something new", xpReward: 25, statReward: "intellect" },
  { title: "Watch a Documentary", description: "Watch an educational documentary", xpReward: 20, statReward: "intellect" },
  { title: "Memorize 20 Lines / 1 Page", description: "Memorize 20 lines of text or 1 full page", xpReward: 30, statReward: "intellect" },
  { title: "Write About Your Future 20 Min", description: "Write about your goals and future for 20 minutes", xpReward: 25, statReward: "wealth" },
  { title: "Plan Your Goals 20 Min", description: "Make a concrete plan for your goals", xpReward: 25, statReward: "discipline" },
  { title: "Spend 20 Min on Finances", description: "Learn about money, investing, or track expenses", xpReward: 20, statReward: "wealth" },
  { title: "Track Your Expenses Today", description: "Record every purchase you make today", xpReward: 15, statReward: "wealth" },
  { title: "Visualize Your Goals 10 Min", description: "Close your eyes and visualize your ideal future", xpReward: 20, statReward: "discipline" },

  // ── Health & Fitness ──
  { title: "Sleep 8+ Hours", description: "Get at least 8 hours of quality sleep", xpReward: 25, statReward: "health" },
  { title: "Drink 2L of Water", description: "Stay hydrated — at least 2 liters today", xpReward: 20, statReward: "health" },
  { title: "Eat Zero Junk Food", description: "No junk food at all today", xpReward: 25, statReward: "health" },
  { title: "Stretch 15 Minutes", description: "Full 15-minute stretching routine", xpReward: 20, statReward: "health" },
  { title: "Stretch Before Sleep", description: "Do a stretching routine before bed", xpReward: 15, statReward: "health" },
  { title: "Go Outside 20 Minutes", description: "Spend at least 20 minutes outdoors", xpReward: 15, statReward: "health" },
  { title: "Walk 10,000 Steps", description: "Hit 10K steps today", xpReward: 25, statReward: "stamina" },
  { title: "Mobility Work 15 Min", description: "15 minutes of mobility exercises", xpReward: 20, statReward: "health" },
  { title: "Good Posture All Day", description: "Maintain good posture throughout the day", xpReward: 20, statReward: "health" },
  { title: "No Food 2h Before Sleep", description: "Stop eating at least 2 hours before bed", xpReward: 20, statReward: "health" },
  { title: "Core Workout 15 Min", description: "15-minute dedicated core workout", xpReward: 25, statReward: "strength" },
  { title: "100 Pushups Total", description: "Complete 100 pushups throughout the day", xpReward: 35, statReward: "strength" },
  { title: "Plank 2 Minutes", description: "Hold a plank for 2 full minutes", xpReward: 25, statReward: "strength" },
  { title: "Wall Sit 3 Minutes", description: "Hold a wall sit for 3 minutes", xpReward: 25, statReward: "strength" },
  { title: "Grip Training 10 Min", description: "10 minutes of grip strength exercises", xpReward: 20, statReward: "strength" },
  { title: "Knees/Ankles Strengthening", description: "10 minutes of knee and ankle exercises", xpReward: 20, statReward: "health" },
  { title: "Run 10 Minutes", description: "Go for a 10-minute run or jog", xpReward: 25, statReward: "stamina" },
  { title: "Run 20 Minutes", description: "Go for a 20-minute run", xpReward: 35, statReward: "stamina" },
  { title: "Interval Sprints 10 Min", description: "10 minutes of interval sprint training", xpReward: 30, statReward: "stamina" },
  { title: "Jump Rope 10 Minutes", description: "10 minutes of jump rope", xpReward: 25, statReward: "stamina" },
  { title: "Full Recovery Session", description: "Stretch + mobility for 20 minutes", xpReward: 25, statReward: "health" },
  { title: "15 Min Walk Without Phone", description: "Take a walk with no phone", xpReward: 20, statReward: "health" },
  { title: "Practice Posture/Walking 10 Min", description: "10 minutes practicing confident posture and walking", xpReward: 15, statReward: "charisma" },

  // ── Basketball ──
  { title: "Shoot 200 Basketball Shots", description: "Take 200 shots at the court", xpReward: 30, statReward: "athletics" },
  { title: "Make 50 Midrange Shots", description: "Sink 50 midrange jumpers", xpReward: 30, statReward: "athletics" },
  { title: "Make 25 Three-Pointers", description: "Hit 25 shots from beyond the arc", xpReward: 30, statReward: "athletics" },
  { title: "Ball Handling 20 Minutes", description: "20 minutes of dribbling drills", xpReward: 25, statReward: "athletics" },
  { title: "Mikan Drill 10 Minutes", description: "10 minutes of Mikan drill at the rim", xpReward: 20, statReward: "athletics" },
  { title: "Defensive Slides 10 Min", description: "10 minutes of defensive slide drills", xpReward: 25, statReward: "athletics" },
  { title: "30 Vertical Jumps", description: "Complete 30 max-effort vertical jumps", xpReward: 25, statReward: "athletics" },
  { title: "Watch Basketball Film 20 Min", description: "Study game film for 20 minutes", xpReward: 20, statReward: "intellect" },
  { title: "Practice Finishes 20 Min", description: "20 minutes of layup and finishing drills", xpReward: 25, statReward: "athletics" },
  { title: "Practice 50 Free Throws", description: "Shoot 50 free throws", xpReward: 20, statReward: "athletics" },
  { title: "Play with Better Players", description: "Play basketball with people better than you", xpReward: 35, statReward: "athletics" },

  // ── Piano / Creative ──
  { title: "Piano 45 Minutes", description: "Full 45-minute piano practice session", xpReward: 35, statReward: "creativity" },
  { title: "Practice Un Sospiro 30 Min", description: "30 minutes dedicated to Un Sospiro", xpReward: 30, statReward: "creativity" },
  { title: "Practice a Hard Part Slowly", description: "20 minutes slowly practicing a difficult passage", xpReward: 25, statReward: "creativity" },
  { title: "Memorize 10 Bars of Music", description: "Memorize 10 bars from a piece", xpReward: 25, statReward: "creativity" },
  { title: "Improvise Piano 15 Min", description: "15 minutes of free improvisation", xpReward: 20, statReward: "creativity" },
  { title: "Write Music / Create 20 Min", description: "Compose or create something musical for 20 minutes", xpReward: 25, statReward: "creativity" },
  { title: "Perform for Someone", description: "Play piano in front of another person", xpReward: 40, statReward: "charisma" },

  // ── Social & Courage ──
  { title: "Talk to Someone New", description: "Start a conversation with someone you don't know", xpReward: 30, statReward: "charisma" },
  { title: "Talk to a Stranger", description: "Initiate a conversation with a complete stranger", xpReward: 35, statReward: "charisma" },
  { title: "Give 3 Compliments", description: "Give genuine compliments to 3 different people", xpReward: 25, statReward: "charisma" },
  { title: "Call a Friend or Family", description: "Call someone you care about", xpReward: 20, statReward: "charisma" },
  { title: "10 Min Conversation", description: "Have a meaningful 10-minute conversation", xpReward: 20, statReward: "charisma" },
  { title: "Talk to Someone You Usually Don't", description: "Reach out to someone outside your usual circle", xpReward: 25, statReward: "charisma" },
  { title: "Eye Contact All Day", description: "Maintain eye contact in every conversation today", xpReward: 25, statReward: "charisma" },
  { title: "Introduce Yourself", description: "Introduce yourself to someone new", xpReward: 30, statReward: "charisma" },
  { title: "Ask and Listen Fully", description: "Ask someone about their life and truly listen", xpReward: 25, statReward: "charisma" },
  { title: "No One-Word Answers", description: "Give thoughtful responses all day — no one-word answers", xpReward: 20, statReward: "charisma" },
  { title: "Go Somewhere Alone", description: "Go to a cafe, library, or park alone", xpReward: 25, statReward: "discipline" },
  { title: "Ask a Question in Class", description: "Raise your hand and ask a question publicly", xpReward: 30, statReward: "charisma" },
  { title: "Answer a Question in Class", description: "Volunteer an answer in class", xpReward: 25, statReward: "charisma" },
  { title: "Do Something That Scares You", description: "Face a fear — do something uncomfortable", xpReward: 40, statReward: "discipline" },
  { title: "Try Something New", description: "Try an activity or experience you've never done", xpReward: 30, statReward: "creativity" },
  { title: "Say Yes to the Uncomfortable", description: "Accept something you'd normally avoid", xpReward: 35, statReward: "discipline" },
  { title: "Ask Someone for Advice", description: "Seek guidance from someone you respect", xpReward: 20, statReward: "charisma" },
  { title: "Write 3 Things You Did Well", description: "Reflect on 3 wins from today", xpReward: 15, statReward: "discipline" },
  { title: "Write 3 Things to Improve", description: "Identify 3 areas for growth", xpReward: 15, statReward: "discipline" },
  { title: "Spend 20 Min on a Main Quest", description: "Dedicate 20 minutes to a major life goal", xpReward: 25, statReward: "discipline" },
  { title: "Spend 20 Min on a Side Quest", description: "Work on a secondary goal for 20 minutes", xpReward: 20, statReward: "discipline" },
  { title: "Declutter Something", description: "Clean out your room, bag, or computer files", xpReward: 20, statReward: "discipline" },
  { title: "Random Act of Kindness", description: "Do something kind for someone without being asked", xpReward: 25, statReward: "charisma" },
  { title: "Help Someone", description: "Offer genuine help to someone today", xpReward: 20, statReward: "charisma" },
  { title: "Write Thoughts Honestly 20 Min", description: "Journal your honest thoughts for 20 minutes", xpReward: 25, statReward: "discipline" },
  { title: "Plan Your Future 30 Min", description: "Seriously plan your next steps for 30 minutes", xpReward: 30, statReward: "discipline" },

  // ── Wealth & Career ──
  { title: "Work 2+ Hours", description: "Put in at least 2 hours of productive work", xpReward: 30, statReward: "wealth" },
  { title: "Work on a Project 30 Min", description: "Work on a personal or professional project", xpReward: 25, statReward: "wealth" },
  { title: "Save Money Today", description: "No unnecessary spending today", xpReward: 20, statReward: "wealth" },
  { title: "Learn About Money 20 Min", description: "Study finance, investing, or money management", xpReward: 25, statReward: "wealth" },
  { title: "Update Your Resume", description: "Polish your resume or portfolio", xpReward: 30, statReward: "wealth" },
  { title: "Apply to One Job", description: "Submit a job application today", xpReward: 35, statReward: "wealth" },
  { title: "Research a Career 20 Min", description: "Research career paths or opportunities", xpReward: 20, statReward: "wealth" },
  { title: "Network with Someone", description: "Have a professional conversation about work/career", xpReward: 30, statReward: "wealth" },
  { title: "Sell or List One Item", description: "Sell something online or in person", xpReward: 25, statReward: "wealth" },
  { title: "Build Something for Portfolio", description: "Create something useful that shows your skills", xpReward: 35, statReward: "wealth" },
  { title: "Practice a Professional Skill 30 Min", description: "Practice a skill that advances your career", xpReward: 25, statReward: "wealth" },
  { title: "Organize Work/Study Files", description: "Clean up and organize your workspace or files", xpReward: 15, statReward: "wealth" },
  { title: "Plan Your Career 20 Min", description: "Plan concrete career steps for the next month", xpReward: 25, statReward: "wealth" },
  { title: "Budget or Track Expenses", description: "Review your budget or track all expenses today", xpReward: 20, statReward: "wealth" },
];
