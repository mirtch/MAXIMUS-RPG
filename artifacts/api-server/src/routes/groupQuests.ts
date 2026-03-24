import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import {
  db, partiesTable, partyMembersTable, groupQuestsTable,
  groupQuestContributionsTable, usersTable, characterTable,
  activityFeedTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

// ── Parties ──

// POST /api/parties — create a party
router.post("/parties", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: "Party name is required" });
    return;
  }

  const [party] = await db.insert(partiesTable).values({ name, leaderId: userId }).returning();

  // Auto-add creator as member
  await db.insert(partyMembersTable).values({ partyId: party.id, userId });

  res.status(201).json(party);
});

// GET /api/parties — list parties user is in
router.get("/parties", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const memberships = await db.select().from(partyMembersTable).where(eq(partyMembersTable.userId, userId));
  if (memberships.length === 0) {
    res.json([]);
    return;
  }

  const partyIds = memberships.map(m => m.partyId);
  const parties = await db.select().from(partiesTable).where(inArray(partiesTable.id, partyIds));

  // Get all members for these parties
  const allMembers = await db.select({
    partyId: partyMembersTable.partyId,
    userId: partyMembersTable.userId,
    username: usersTable.username,
    displayName: usersTable.displayName,
    avatar: usersTable.avatar,
  })
    .from(partyMembersTable)
    .innerJoin(usersTable, eq(partyMembersTable.userId, usersTable.id))
    .where(inArray(partyMembersTable.partyId, partyIds));

  const result = parties.map(p => ({
    ...p,
    members: allMembers.filter(m => m.partyId === p.id),
    isLeader: p.leaderId === userId,
  }));

  res.json(result);
});

// POST /api/parties/:id/invite — invite a friend to party
router.post("/parties/:id/invite", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const partyId = Number(req.params.id);
  const { username } = req.body;

  const [party] = await db.select().from(partiesTable).where(eq(partiesTable.id, partyId)).limit(1);
  if (!party) {
    res.status(404).json({ error: "Party not found" });
    return;
  }

  // Check inviter is a member
  const [isMember] = await db.select().from(partyMembersTable).where(
    and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, userId)),
  ).limit(1);
  if (!isMember) {
    res.status(403).json({ error: "You are not in this party" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase())).limit(1);
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Check not already a member
  const [alreadyMember] = await db.select().from(partyMembersTable).where(
    and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, target.id)),
  ).limit(1);
  if (alreadyMember) {
    res.status(409).json({ error: "User is already in this party" });
    return;
  }

  await db.insert(partyMembersTable).values({ partyId, userId: target.id });
  res.status(201).json({ message: `${target.displayName} added to ${party.name}` });
});

// ── Group Quests ──

// POST /api/group-quests — create a group quest for a party
router.post("/group-quests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { partyId, title, description, xpReward, bonusMultiplier } = req.body;

  if (!partyId || !title || !description) {
    res.status(400).json({ error: "partyId, title, and description are required" });
    return;
  }

  // Check user is in the party
  const [isMember] = await db.select().from(partyMembersTable).where(
    and(eq(partyMembersTable.partyId, partyId), eq(partyMembersTable.userId, userId)),
  ).limit(1);
  if (!isMember) {
    res.status(403).json({ error: "You are not in this party" });
    return;
  }

  const [quest] = await db.insert(groupQuestsTable).values({
    partyId,
    title,
    description,
    xpReward: xpReward || 500,
    bonusMultiplier: bonusMultiplier || "1.5",
  }).returning();

  // Create contribution entries for all party members
  const members = await db.select().from(partyMembersTable).where(eq(partyMembersTable.partyId, partyId));
  for (const member of members) {
    await db.insert(groupQuestContributionsTable).values({
      questId: quest.id,
      userId: member.userId,
      contributed: false,
    });
  }

  res.status(201).json(quest);
});

// GET /api/group-quests — list group quests for user's parties
router.get("/group-quests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const memberships = await db.select().from(partyMembersTable).where(eq(partyMembersTable.userId, userId));
  if (memberships.length === 0) {
    res.json([]);
    return;
  }

  const partyIds = memberships.map(m => m.partyId);
  const quests = await db.select().from(groupQuestsTable).where(inArray(groupQuestsTable.partyId, partyIds));

  if (quests.length === 0) {
    res.json([]);
    return;
  }

  const questIds = quests.map(q => q.id);
  const contributions = await db.select({
    questId: groupQuestContributionsTable.questId,
    userId: groupQuestContributionsTable.userId,
    contributed: groupQuestContributionsTable.contributed,
    contributedAt: groupQuestContributionsTable.contributedAt,
    username: usersTable.username,
    displayName: usersTable.displayName,
    avatar: usersTable.avatar,
  })
    .from(groupQuestContributionsTable)
    .innerJoin(usersTable, eq(groupQuestContributionsTable.userId, usersTable.id))
    .where(inArray(groupQuestContributionsTable.questId, questIds));

  const parties = await db.select().from(partiesTable).where(inArray(partiesTable.id, partyIds));

  const result = quests.map(q => ({
    ...q,
    party: parties.find(p => p.id === q.partyId),
    contributions: contributions.filter(c => c.questId === q.id),
    yourContribution: contributions.find(c => c.questId === q.id && c.userId === userId),
  }));

  res.json(result);
});

// POST /api/group-quests/:id/contribute — mark your contribution
router.post("/group-quests/:id/contribute", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const questId = Number(req.params.id);

  const [contribution] = await db.select().from(groupQuestContributionsTable).where(
    and(
      eq(groupQuestContributionsTable.questId, questId),
      eq(groupQuestContributionsTable.userId, userId),
    ),
  ).limit(1);

  if (!contribution) {
    res.status(404).json({ error: "You don't have a contribution for this quest" });
    return;
  }

  if (contribution.contributed) {
    res.status(409).json({ error: "You already contributed" });
    return;
  }

  await db.update(groupQuestContributionsTable)
    .set({ contributed: true, contributedAt: new Date() })
    .where(eq(groupQuestContributionsTable.id, contribution.id));

  // Check if ALL members have contributed — if so, complete the quest
  const allContributions = await db.select().from(groupQuestContributionsTable).where(
    eq(groupQuestContributionsTable.questId, questId),
  );

  const allDone = allContributions.every(c => c.id === contribution.id ? true : c.contributed);

  if (allDone) {
    await db.update(groupQuestsTable)
      .set({ completed: true, completedAt: new Date() })
      .where(eq(groupQuestsTable.id, questId));

    const [quest] = await db.select().from(groupQuestsTable).where(eq(groupQuestsTable.id, questId)).limit(1);

    // Award XP to all members with bonus multiplier
    const xpEach = Math.floor((quest?.xpReward || 500) * parseFloat(quest?.bonusMultiplier || "1.5"));

    for (const contrib of allContributions) {
      // Add to each member's character XP
      const [char] = await db.select().from(characterTable).where(eq(characterTable.userId, contrib.userId)).limit(1);
      if (char) {
        await db.update(characterTable)
          .set({ totalXp: char.totalXp + xpEach })
          .where(eq(characterTable.id, char.id));
      }

      // Feed entry for each member
      await db.insert(activityFeedTable).values({
        userId: contrib.userId,
        type: "group_quest_completed",
        data: { questTitle: quest?.title, xpEarned: xpEach, partyId: quest?.partyId },
      });
    }
  }

  res.json({
    contributed: true,
    questCompleted: allDone,
    message: allDone ? "Quest completed! All members earned bonus XP!" : "Contribution recorded. Waiting for other members.",
  });
});

export default router;
