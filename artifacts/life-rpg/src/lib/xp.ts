export function calculateLevelInfo(totalXp: number) {
  const level = 1 + Math.floor(totalXp / 200);
  const currentLevelXp = totalXp % 200;
  const xpNeeded = 200;
  const progress = (currentLevelXp / xpNeeded) * 100;
  
  return {
    level,
    currentLevelXp,
    xpNeeded,
    progress
  };
}

export function calculateStatLevelInfo(statLevel: number, statXp: number) {
  const xpForCurrentLevel = Math.floor(100 * Math.pow(statLevel - 1, 1.8));
  const xpForNextLevel = Math.floor(100 * Math.pow(statLevel, 1.8));
  const xpInCurrentLevel = statXp - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const progress = (xpInCurrentLevel / xpNeededForNextLevel) * 100;
  
  return {
    level: statLevel,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progress: Math.max(0, Math.min(100, progress))
  };
}

export const STAT_ICONS: Record<string, string> = {
  Strength: "💪",
  Stamina: "🏃",
  Athletics: "🏀",
  Intellect: "📚",
  Wealth: "💰",
  Discipline: "⚔️",
  Health: "❤️",
  Charisma: "🗣️",
  Creativity: "🎹"
};

export function getStatBadge(level: number): string {
  if (level < 5) return "Novice";
  if (level < 10) return "Apprentice";
  if (level < 15) return "Adept";
  if (level < 20) return "Skilled";
  if (level < 25) return "Expert";
  if (level < 30) return "Elite";
  if (level < 40) return "Master";
  if (level < 50) return "Champion";
  if (level < 60) return "Legend";
  return "Mythic";
}
