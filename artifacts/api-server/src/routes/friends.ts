import { Router, type IRouter } from "express";
import { eq, and, or, desc, inArray, gt } from "drizzle-orm";
import { db, usersTable, friendshipsTable, activityFeedTable, characterTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

// GET /api/friends — list accepted friends with online status
router.get("/friends", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const friendships = await db.select().from(friendshipsTable).where(
    and(
      or(
        eq(friendshipsTable.userId, userId),
        eq(friendshipsTable.friendId, userId),
      ),
      eq(friendshipsTable.status, "accepted"),
    ),
  );

  const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);

  if (friendIds.length === 0) {
    res.json([]);
    return;
  }

  const friends = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    avatar: usersTable.avatar,
    lastSeenAt: usersTable.lastSeenAt,
  }).from(usersTable).where(inArray(usersTable.id, friendIds));

  // Get character info for each friend
  const characters = await db.select({
    userId: characterTable.userId,
    name: characterTable.name,
    class: characterTable.class,
    overallLevel: characterTable.overallLevel,
    totalXp: characterTable.totalXp,
    title: characterTable.title,
    avatar: characterTable.avatar,
  }).from(characterTable).where(inArray(characterTable.userId, friendIds));

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const result = friends.map(friend => {
    const char = characters.find(c => c.userId === friend.id);
    return {
      ...friend,
      character: char || null,
      isOnline: friend.lastSeenAt > fiveMinAgo,
    };
  });

  res.json(result);
});

// GET /api/friends/requests — list pending friend requests for current user
router.get("/friends/requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const pending = await db.select().from(friendshipsTable).where(
    and(
      eq(friendshipsTable.friendId, userId),
      eq(friendshipsTable.status, "pending"),
    ),
  );

  if (pending.length === 0) {
    res.json([]);
    return;
  }

  const senderIds = pending.map(p => p.userId);
  const senders = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    avatar: usersTable.avatar,
  }).from(usersTable).where(inArray(usersTable.id, senderIds));

  const result = pending.map(p => ({
    id: p.id,
    sender: senders.find(s => s.id === p.userId),
    createdAt: p.createdAt,
  }));

  res.json(result);
});

// POST /api/friends/request — send a friend request by username
router.post("/friends/request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { username } = req.body;

  if (!username) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase())).limit(1);
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.id === userId) {
    res.status(400).json({ error: "You cannot add yourself" });
    return;
  }

  // Check if already friends or pending
  const [existing] = await db.select().from(friendshipsTable).where(
    or(
      and(eq(friendshipsTable.userId, userId), eq(friendshipsTable.friendId, target.id)),
      and(eq(friendshipsTable.userId, target.id), eq(friendshipsTable.friendId, userId)),
    ),
  ).limit(1);

  if (existing) {
    if (existing.status === "accepted") {
      res.status(409).json({ error: "Already friends" });
    } else if (existing.status === "pending") {
      res.status(409).json({ error: "Friend request already pending" });
    } else {
      // Re-send if previously declined
      await db.update(friendshipsTable).set({ status: "pending" }).where(eq(friendshipsTable.id, existing.id));
      res.json({ message: "Friend request sent" });
    }
    return;
  }

  await db.insert(friendshipsTable).values({ userId, friendId: target.id, status: "pending" });
  res.status(201).json({ message: "Friend request sent" });
});

// POST /api/friends/accept — accept a friend request
router.post("/friends/accept", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { friendshipId } = req.body;

  const [friendship] = await db.select().from(friendshipsTable).where(
    and(
      eq(friendshipsTable.id, friendshipId),
      eq(friendshipsTable.friendId, userId),
      eq(friendshipsTable.status, "pending"),
    ),
  ).limit(1);

  if (!friendship) {
    res.status(404).json({ error: "Friend request not found" });
    return;
  }

  await db.update(friendshipsTable).set({ status: "accepted" }).where(eq(friendshipsTable.id, friendship.id));

  // Add to activity feed
  await db.insert(activityFeedTable).values({
    userId: friendship.userId,
    type: "friend_joined",
    data: { friendId: userId },
  });
  await db.insert(activityFeedTable).values({
    userId,
    type: "friend_joined",
    data: { friendId: friendship.userId },
  });

  res.json({ message: "Friend request accepted" });
});

// POST /api/friends/decline — decline a friend request
router.post("/friends/decline", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { friendshipId } = req.body;

  const [friendship] = await db.select().from(friendshipsTable).where(
    and(
      eq(friendshipsTable.id, friendshipId),
      eq(friendshipsTable.friendId, userId),
      eq(friendshipsTable.status, "pending"),
    ),
  ).limit(1);

  if (!friendship) {
    res.status(404).json({ error: "Friend request not found" });
    return;
  }

  await db.update(friendshipsTable).set({ status: "declined" }).where(eq(friendshipsTable.id, friendship.id));
  res.json({ message: "Friend request declined" });
});

// GET /api/friends/feed — social feed from friends
router.get("/friends/feed", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  // Get friend IDs
  const friendships = await db.select().from(friendshipsTable).where(
    and(
      or(
        eq(friendshipsTable.userId, userId),
        eq(friendshipsTable.friendId, userId),
      ),
      eq(friendshipsTable.status, "accepted"),
    ),
  );

  const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);
  // Include own feed too
  const allIds = [userId, ...friendIds];

  const feed = await db.select({
    id: activityFeedTable.id,
    userId: activityFeedTable.userId,
    type: activityFeedTable.type,
    data: activityFeedTable.data,
    createdAt: activityFeedTable.createdAt,
    username: usersTable.username,
    displayName: usersTable.displayName,
    avatar: usersTable.avatar,
  })
    .from(activityFeedTable)
    .innerJoin(usersTable, eq(activityFeedTable.userId, usersTable.id))
    .where(inArray(activityFeedTable.userId, allIds))
    .orderBy(desc(activityFeedTable.createdAt))
    .limit(50);

  res.json(feed);
});

// GET /api/friends/leaderboard — ranking among friends
router.get("/friends/leaderboard", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  // Get friend IDs
  const friendships = await db.select().from(friendshipsTable).where(
    and(
      or(
        eq(friendshipsTable.userId, userId),
        eq(friendshipsTable.friendId, userId),
      ),
      eq(friendshipsTable.status, "accepted"),
    ),
  );

  const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);
  const allIds = [userId, ...friendIds];

  const characters = await db.select({
    userId: characterTable.userId,
    name: characterTable.name,
    avatar: characterTable.avatar,
    class: characterTable.class,
    overallLevel: characterTable.overallLevel,
    totalXp: characterTable.totalXp,
    title: characterTable.title,
  }).from(characterTable).where(inArray(characterTable.userId, allIds));

  const users = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    lastSeenAt: usersTable.lastSeenAt,
  }).from(usersTable).where(inArray(usersTable.id, allIds));

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const leaderboard = characters
    .map(char => {
      const user = users.find(u => u.id === char.userId);
      return {
        ...char,
        username: user?.username,
        displayName: user?.displayName,
        isOnline: user ? user.lastSeenAt > fiveMinAgo : false,
        isYou: char.userId === userId,
      };
    })
    .sort((a, b) => b.totalXp - a.totalXp)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  res.json(leaderboard);
});

export default router;
