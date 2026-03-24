export const STAT_NAMES = [
  "strength",
  "stamina",
  "athletics",
  "intellect",
  "focus",
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
  focus: "Focus",
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

export interface DailyLogInput {
  activities: string[];
  notes?: string | null;
  gymDone?: boolean;
  runningDone?: boolean;
  basketballDone?: boolean;
  studyDone?: boolean;
  deepWorkDone?: boolean;
  pianoDone?: boolean;
  sleepHours?: number;
  ateJunkFood?: boolean;
  phoneHours?: number;
  socializedToday?: boolean;
  plannedDay?: boolean;
  coldShower?: boolean;
  meditatedToday?: boolean;
  drankWater?: boolean;
}

export function calculateXpChanges(input: DailyLogInput): XpChange[] {
  const changes: XpChange[] = [];

  if (input.gymDone) {
    changes.push({ statName: "strength", amount: 40, reason: "Gym workout" });
    changes.push({ statName: "discipline", amount: 10, reason: "Gym consistency" });
  }

  if (input.runningDone) {
    changes.push({ statName: "stamina", amount: 30, reason: "Running / Cardio" });
    changes.push({ statName: "health", amount: 10, reason: "Cardio for health" });
  }

  if (input.basketballDone) {
    changes.push({ statName: "athletics", amount: 50, reason: "Basketball session" });
    changes.push({ statName: "stamina", amount: 20, reason: "Basketball cardio" });
    changes.push({ statName: "health", amount: -10, reason: "Physical fatigue" });
  }

  if (input.studyDone) {
    changes.push({ statName: "intellect", amount: 35, reason: "Study session" });
    changes.push({ statName: "focus", amount: 15, reason: "Deep study focus" });
  }

  if (input.deepWorkDone) {
    changes.push({ statName: "focus", amount: 40, reason: "Deep work session" });
    changes.push({ statName: "discipline", amount: 15, reason: "Deep work discipline" });
  }

  if (input.pianoDone) {
    changes.push({ statName: "creativity", amount: 40, reason: "Piano practice" });
    changes.push({ statName: "focus", amount: 20, reason: "Piano focus" });
  }

  if (input.socializedToday) {
    changes.push({ statName: "charisma", amount: 25, reason: "Social interaction" });
  }

  if (input.plannedDay) {
    changes.push({ statName: "discipline", amount: 20, reason: "Planned the day" });
  }

  if (input.coldShower) {
    changes.push({ statName: "discipline", amount: 15, reason: "Cold shower" });
    changes.push({ statName: "health", amount: 10, reason: "Cold shower health" });
  }

  if (input.meditatedToday) {
    changes.push({ statName: "focus", amount: 20, reason: "Meditation" });
    changes.push({ statName: "health", amount: 10, reason: "Mental health" });
  }

  if (input.drankWater) {
    changes.push({ statName: "health", amount: 10, reason: "Stayed hydrated" });
  }

  if (input.sleepHours !== undefined) {
    if (input.sleepHours >= 8) {
      changes.push({ statName: "health", amount: 30, reason: "Great sleep (8h+)" });
      changes.push({ statName: "focus", amount: 10, reason: "Well-rested focus" });
    } else if (input.sleepHours >= 7) {
      changes.push({ statName: "health", amount: 20, reason: "Good sleep (7h+)" });
    } else if (input.sleepHours >= 6) {
      changes.push({ statName: "health", amount: 5, reason: "Adequate sleep" });
    } else if (input.sleepHours <= 5) {
      changes.push({ statName: "health", amount: -30, reason: "Poor sleep (5h or less)" });
      changes.push({ statName: "focus", amount: -15, reason: "Sleep deprivation" });
    }
  }

  if (input.ateJunkFood) {
    changes.push({ statName: "health", amount: -20, reason: "Junk food" });
    changes.push({ statName: "discipline", amount: -10, reason: "Lack of discipline" });
  }

  if (input.phoneHours !== undefined) {
    if (input.phoneHours >= 5) {
      changes.push({ statName: "focus", amount: -30, reason: "5+ hours on phone" });
      changes.push({ statName: "discipline", amount: -20, reason: "Phone addiction" });
    } else if (input.phoneHours >= 3) {
      changes.push({ statName: "focus", amount: -15, reason: "3+ hours on phone" });
    }
  }

  return changes;
}

export const DAILY_QUEST_POOL = [
  { title: "Cold Shower", description: "Take a cold shower for at least 2 minutes", xpReward: 30, statReward: "discipline" },
  { title: "Talk to Someone New", description: "Start a conversation with someone you don't know well", xpReward: 25, statReward: "charisma" },
  { title: "Stretch 15 Minutes", description: "Do a full 15-minute stretching routine", xpReward: 20, statReward: "health" },
  { title: "Write 1 Page", description: "Write at least one full page about anything", xpReward: 25, statReward: "creativity" },
  { title: "No Phone 1h Before Sleep", description: "Put your phone away 1 hour before going to sleep", xpReward: 30, statReward: "discipline" },
  { title: "Read 20 Pages", description: "Read at least 20 pages of any book", xpReward: 25, statReward: "intellect" },
  { title: "Meditate 10 Minutes", description: "Sit in stillness and meditate for 10 minutes", xpReward: 25, statReward: "focus" },
  { title: "Compliment Someone", description: "Give a genuine compliment to someone today", xpReward: 20, statReward: "charisma" },
  { title: "Wake Up Before 9", description: "Get out of bed before 9:00 AM", xpReward: 20, statReward: "discipline" },
  { title: "Run 10 Minutes", description: "Go for a 10-minute run or jog", xpReward: 25, statReward: "stamina" },
  { title: "Drink 2L of Water", description: "Drink at least 2 liters of water today", xpReward: 20, statReward: "health" },
  { title: "Do 50 Pushups", description: "Complete 50 pushups throughout the day", xpReward: 30, statReward: "strength" },
  { title: "Plan Tomorrow", description: "Write out a plan for tomorrow before bed", xpReward: 25, statReward: "discipline" },
  { title: "Practice Piano 15 Min", description: "Practice piano for at least 15 minutes", xpReward: 25, statReward: "creativity" },
  { title: "No Social Media", description: "Avoid all social media for the entire day", xpReward: 35, statReward: "focus" },
];
