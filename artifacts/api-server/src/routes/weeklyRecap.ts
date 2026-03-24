import { Router, type IRouter } from "express";
import { eq, and, gte, desc, or, inArray } from "drizzle-orm";
import { db, dailyLogTable, characterTable, statsTable, streaksTable, activityFeedTable, friendshipsTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

function weekAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/weekly-recap — generate weekly recap for current user
router.get("/weekly-recap", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const since = weekAgo();

  // Get this week's daily logs
  const logs = await db.select().from(dailyLogTable)
    .where(and(eq(dailyLogTable.userId, userId), gte(dailyLogTable.date, since)))
    .orderBy(desc(dailyLogTable.date));

  // Get character info
  const [character] = await db.select().from(characterTable).where(eq(characterTable.userId, userId)).limit(1);

  // Get stats
  const stats = await db.select().from(statsTable).where(eq(statsTable.userId, userId));

  // Get streaks
  const streaks = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));

  // Calculate totals
  const totalXpGained = logs.reduce((sum, l) => sum + l.totalXpGained, 0);
  const totalXpLost = logs.reduce((sum, l) => sum + l.totalXpLost, 0);
  const netXp = totalXpGained - totalXpLost;
  const daysLogged = logs.length;

  // Count all activities completed
  const allActivities = logs.flatMap(l => l.activities || []);
  const activityCounts: Record<string, number> = {};
  for (const a of allActivities) {
    activityCounts[a] = (activityCounts[a] || 0) + 1;
  }
  const topActivities = Object.entries(activityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Level ups this week
  const levelUps = logs.flatMap(l => (l.newLevelUps || []) as Array<{ statName: string; newLevel: number; newTitle: string }>);

  // Active streaks
  const activeStreaks = streaks
    .filter(s => s.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak);

  // Best streak
  const bestStreak = activeStreaks.length > 0 ? activeStreaks[0] : null;

  const recap = {
    period: { from: since.toISOString(), to: new Date().toISOString() },
    character: character ? { name: character.name, class: character.class, level: character.overallLevel, totalXp: character.totalXp, title: character.title } : null,
    summary: {
      daysLogged,
      totalXpGained,
      totalXpLost,
      netXp,
      activitiesCompleted: allActivities.length,
      levelUps: levelUps.length,
    },
    topActivities,
    levelUps,
    activeStreaks: activeStreaks.map(s => ({ name: s.displayName, current: s.currentStreak, longest: s.longestStreak })),
    bestStreak: bestStreak ? { name: bestStreak.displayName, days: bestStreak.currentStreak } : null,
  };

  res.json(recap);
});

// GET /api/weekly-recap/friends — get recaps for all friends (for the feed)
router.get("/weekly-recap/friends", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const since = weekAgo();

  // Get friend IDs
  const friendships = await db.select().from(friendshipsTable).where(
    and(
      or(eq(friendshipsTable.userId, userId), eq(friendshipsTable.friendId, userId)),
      eq(friendshipsTable.status, "accepted"),
    ),
  );
  const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);
  const allIds = [userId, ...friendIds];

  if (allIds.length === 0) {
    res.json([]);
    return;
  }

  // Get characters for all
  const characters = await db.select().from(characterTable).where(inArray(characterTable.userId, allIds));
  const users = await db.select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatar: usersTable.avatar })
    .from(usersTable).where(inArray(usersTable.id, allIds));

  // Get logs for all
  const logs = await db.select().from(dailyLogTable)
    .where(and(inArray(dailyLogTable.userId, allIds), gte(dailyLogTable.date, since)));

  // Build per-user summaries
  const recaps = allIds.map(uid => {
    const userLogs = logs.filter(l => l.userId === uid);
    const char = characters.find(c => c.userId === uid);
    const user = users.find(u => u.id === uid);
    const xpGained = userLogs.reduce((sum, l) => sum + l.totalXpGained, 0);

    return {
      userId: uid,
      username: user?.username,
      displayName: user?.displayName,
      avatar: user?.avatar,
      character: char ? { name: char.name, class: char.class, level: char.overallLevel } : null,
      daysLogged: userLogs.length,
      xpGained,
      activitiesCompleted: userLogs.flatMap(l => l.activities || []).length,
      isYou: uid === userId,
    };
  }).sort((a, b) => b.xpGained - a.xpGained);

  res.json(recaps);
});

export default router;
