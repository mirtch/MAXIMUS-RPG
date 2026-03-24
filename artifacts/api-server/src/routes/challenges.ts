import { Router, type IRouter } from "express";
import { eq, and, or, desc } from "drizzle-orm";
import { db, challengesTable, usersTable, characterTable, activityFeedTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

// GET /api/challenges — list user's challenges
router.get("/challenges", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const challenges = await db.select().from(challengesTable).where(
    or(
      eq(challengesTable.challengerId, userId),
      eq(challengesTable.challengedId, userId),
    ),
  ).orderBy(desc(challengesTable.createdAt));

  // Enrich with usernames
  const userIds = new Set<number>();
  challenges.forEach(c => { userIds.add(c.challengerId); userIds.add(c.challengedId); });

  const users = userIds.size > 0
    ? await db.select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatar: usersTable.avatar })
        .from(usersTable)
    : [];

  const userMap = new Map(users.map(u => [u.id, u]));

  const result = challenges.map(c => ({
    ...c,
    challenger: userMap.get(c.challengerId),
    challenged: userMap.get(c.challengedId),
    isChallenger: c.challengerId === userId,
    yourCompleted: c.challengerId === userId ? c.challengerCompleted : c.challengedCompleted,
  }));

  res.json(result);
});

// POST /api/challenges — create a challenge
router.post("/challenges", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { username, title, description, xpStake, deadline } = req.body;

  if (!username || !title || !deadline) {
    res.status(400).json({ error: "username, title, and deadline are required" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase())).limit(1);
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.id === userId) {
    res.status(400).json({ error: "You cannot challenge yourself" });
    return;
  }

  const [challenge] = await db.insert(challengesTable).values({
    challengerId: userId,
    challengedId: target.id,
    title,
    description: description || null,
    xpStake: xpStake || 100,
    deadline: new Date(deadline),
    status: "pending",
  }).returning();

  res.status(201).json(challenge);
});

// POST /api/challenges/:id/accept
router.post("/challenges/:id/accept", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseInt(req.params.id as string, 10);

  const [challenge] = await db.select().from(challengesTable).where(
    and(eq(challengesTable.id, id), eq(challengesTable.challengedId, userId), eq(challengesTable.status, "pending")),
  ).limit(1);

  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }

  await db.update(challengesTable).set({ status: "active" }).where(eq(challengesTable.id, id));
  res.json({ message: "Challenge accepted!" });
});

// POST /api/challenges/:id/decline
router.post("/challenges/:id/decline", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseInt(req.params.id as string, 10);

  const [challenge] = await db.select().from(challengesTable).where(
    and(eq(challengesTable.id, id), eq(challengesTable.challengedId, userId), eq(challengesTable.status, "pending")),
  ).limit(1);

  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }

  await db.update(challengesTable).set({ status: "declined" }).where(eq(challengesTable.id, id));
  res.json({ message: "Challenge declined" });
});

// POST /api/challenges/:id/complete — mark your side as done
router.post("/challenges/:id/complete", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseInt(req.params.id as string, 10);

  const [challenge] = await db.select().from(challengesTable).where(
    and(
      eq(challengesTable.id, id),
      eq(challengesTable.status, "active"),
      or(eq(challengesTable.challengerId, userId), eq(challengesTable.challengedId, userId)),
    ),
  ).limit(1);

  if (!challenge) {
    res.status(404).json({ error: "Active challenge not found" });
    return;
  }

  const isChallenger = challenge.challengerId === userId;
  const update = isChallenger ? { challengerCompleted: true } : { challengedCompleted: true };
  await db.update(challengesTable).set(update).where(eq(challengesTable.id, id));

  // Check if both completed or deadline passed
  const otherCompleted = isChallenger ? challenge.challengedCompleted : challenge.challengerCompleted;

  if (otherCompleted) {
    // Both completed — it's a draw, both get the XP
    await db.update(challengesTable).set({ status: "completed", completedAt: new Date() }).where(eq(challengesTable.id, id));

    // Award XP to both
    for (const uid of [challenge.challengerId, challenge.challengedId]) {
      const [char] = await db.select().from(characterTable).where(eq(characterTable.userId, uid)).limit(1);
      if (char) {
        await db.update(characterTable).set({ totalXp: char.totalXp + challenge.xpStake }).where(eq(characterTable.id, char.id));
      }
      await db.insert(activityFeedTable).values({
        userId: uid,
        type: "challenge_completed",
        data: { challengeTitle: challenge.title, xpEarned: challenge.xpStake, result: "draw" },
      });
    }

    res.json({ message: "Both completed! It's a draw — you both earn the XP!", bothDone: true });
  } else {
    // Check if deadline has passed
    const now = new Date();
    if (now > new Date(challenge.deadline)) {
      // Only the completer wins
      const loserId = isChallenger ? challenge.challengedId : challenge.challengerId;
      await db.update(challengesTable).set({
        status: "completed",
        winnerId: userId,
        completedAt: now,
      }).where(eq(challengesTable.id, id));

      // Winner gets XP, loser loses XP
      const [winnerChar] = await db.select().from(characterTable).where(eq(characterTable.userId, userId)).limit(1);
      if (winnerChar) {
        await db.update(characterTable).set({ totalXp: winnerChar.totalXp + challenge.xpStake }).where(eq(characterTable.id, winnerChar.id));
      }
      const [loserChar] = await db.select().from(characterTable).where(eq(characterTable.userId, loserId)).limit(1);
      if (loserChar) {
        await db.update(characterTable).set({ totalXp: Math.max(0, loserChar.totalXp - challenge.xpStake) }).where(eq(characterTable.id, loserChar.id));
      }

      await db.insert(activityFeedTable).values({
        userId,
        type: "challenge_won",
        data: { challengeTitle: challenge.title, xpEarned: challenge.xpStake },
      });

      res.json({ message: `You won! +${challenge.xpStake} XP. Your opponent didn't finish in time.`, won: true });
    } else {
      res.json({ message: "Marked as complete! Waiting for your opponent to finish before the deadline.", waiting: true });
    }
  }
});

export default router;
