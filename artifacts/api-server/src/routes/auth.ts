import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, characterTable, statsTable, activitiesTable, streaksTable } from "@workspace/db";
import { generateToken, requireAuth, type AuthRequest } from "../lib/auth.js";
import { STAT_NAMES, STAT_DISPLAY_NAMES } from "../lib/rpg.js";
import { CORE_ACTIVITIES } from "../lib/seed-activities.js";

const router: IRouter = Router();

// POST /api/auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, password, displayName, avatar, profilePicture, characterName, characterClass, selectedActivities, customActivities } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  if (username.length < 3 || username.length > 20) {
    res.status(400).json({ error: "Username must be 3-20 characters" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  // Check if username taken
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase())).limit(1);
  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.insert(usersTable).values({
    username: username.toLowerCase(),
    displayName: displayName || username,
    passwordHash,
    avatar: avatar || "⚔️",
    profilePicture: profilePicture || null,
  }).returning();

  // Create character for the new user
  await db.insert(characterTable).values({
    userId: user.id,
    name: characterName || user.displayName,
    avatar: avatar || "⚔️",
    profilePicture: profilePicture || null,
    class: characterClass || "Warrior",
    overallLevel: 1,
    totalXp: 0,
    title: "Novice",
  });

  // Create default stats for the new user
  for (const name of STAT_NAMES) {
    await db.insert(statsTable).values({
      userId: user.id,
      name,
      displayName: STAT_DISPLAY_NAMES[name],
      xp: 0,
      level: 1,
      title: "Novice",
    });
  }

  // Seed activities — only selected ones from the catalog, plus any custom
  const selectedSet = new Set<string>(Array.isArray(selectedActivities) ? selectedActivities : []);

  // XP reward defaults by category
  const CATEGORY_XP: Record<string, Array<{ statName: string; amount: number }>> = {
    fitness: [{ statName: "strength", amount: 35 }, { statName: "stamina", amount: 15 }],
    athletics: [{ statName: "athletics", amount: 40 }, { statName: "stamina", amount: 15 }],
    intellect: [{ statName: "intellect", amount: 35 }, { statName: "discipline", amount: 15 }],
    wealth: [{ statName: "wealth", amount: 35 }, { statName: "discipline", amount: 15 }],
    creativity: [{ statName: "creativity", amount: 35 }, { statName: "discipline", amount: 15 }],
    discipline: [{ statName: "discipline", amount: 25 }, { statName: "health", amount: 10 }],
    social: [{ statName: "charisma", amount: 25 }],
    family: [{ statName: "family", amount: 30 }, { statName: "health", amount: 10 }],
    health: [{ statName: "health", amount: 15 }],
    bad_habit: [{ statName: "health", amount: -20 }, { statName: "discipline", amount: -10 }],
  };

  if (selectedSet.size > 0) {
    // Seed only selected core activities
    for (const activity of CORE_ACTIVITIES) {
      if (selectedSet.has(activity.name)) {
        await db.insert(activitiesTable).values({ ...activity, userId: user.id });
      }
    }

    // Also seed catalog activities not in CORE_ACTIVITIES (new ones we added to the catalog)
    const coreNames = new Set(CORE_ACTIVITIES.map(a => a.name));
    for (const name of selectedSet) {
      if (!coreNames.has(name)) {
        // This is a catalog activity not in the seed file — create it
        const xpRewards = CATEGORY_XP["fitness"]; // default
        await db.insert(activitiesTable).values({
          userId: user.id,
          name,
          displayName: name.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim(),
          description: `${name} activity`,
          category: "fitness",
          xpRewards,
          isCore: true,
          isReusable: true,
          archived: false,
          sortOrder: 50,
        });
      }
    }
  } else {
    // No selection — seed all core activities (fallback)
    for (const activity of CORE_ACTIVITIES) {
      await db.insert(activitiesTable).values({ ...activity, userId: user.id });
    }
  }

  // Seed custom activities from registration
  if (Array.isArray(customActivities)) {
    for (const ca of customActivities) {
      if (!ca.displayName) continue;
      const xpRewards = CATEGORY_XP[ca.category] || CATEGORY_XP["fitness"];
      await db.insert(activitiesTable).values({
        userId: user.id,
        name: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        displayName: ca.displayName,
        description: ca.displayName,
        category: ca.category,
        xpRewards,
        isCore: true,
        isReusable: true,
        archived: false,
        sortOrder: 50,
      });
    }
  }

  // Seed default streaks (always — these track consistency regardless of activity choice)
  const defaultStreaks = [
    { name: "gym", displayName: "Gym Streak" },
    { name: "running", displayName: "Running Streak" },
    { name: "piano", displayName: "Piano Streak" },
    { name: "sleep_8h", displayName: "8h Sleep Streak" },
    { name: "deep_work", displayName: "Deep Work Streak" },
    { name: "planned_day", displayName: "Planned Day Streak" },
  ];
  for (const s of defaultStreaks) {
    await db.insert(streaksTable).values({ userId: user.id, name: s.name, displayName: s.displayName, currentStreak: 0, longestStreak: 0 });
  }

  const token = generateToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, profilePicture: user.profilePicture },
  });
});

// POST /api/auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  // Update last seen
  await db.update(usersTable).set({ lastSeenAt: new Date() }).where(eq(usersTable.id, user.id));

  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, profilePicture: user.profilePicture },
  });
});

// PATCH /api/auth/profile-picture — update profile picture
router.patch("/auth/profile-picture", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { profilePicture } = req.body;

  if (!profilePicture || typeof profilePicture !== "string") {
    res.status(400).json({ error: "profilePicture (base64 data URL) is required" });
    return;
  }

  // Limit to ~500KB base64
  if (profilePicture.length > 500000) {
    res.status(400).json({ error: "Image too large. Please use a smaller photo." });
    return;
  }

  await db.update(usersTable).set({ profilePicture }).where(eq(usersTable.id, userId));
  await db.update(characterTable).set({ profilePicture }).where(eq(characterTable.userId, userId));

  res.json({ success: true });
});

// GET /api/auth/me — get current user info
router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    profilePicture: user.profilePicture,
    lastSeenAt: user.lastSeenAt,
    createdAt: user.createdAt,
  });
});

export default router;
