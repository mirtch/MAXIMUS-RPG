import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, characterTable, statsTable } from "@workspace/db";
import { generateToken, requireAuth, type AuthRequest } from "../lib/auth.js";
import { STAT_NAMES, STAT_DISPLAY_NAMES } from "../lib/rpg.js";

const router: IRouter = Router();

// POST /api/auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, password, displayName, avatar, characterName, characterClass } = req.body;

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
  }).returning();

  // Create character for the new user
  await db.insert(characterTable).values({
    userId: user.id,
    name: characterName || user.displayName,
    avatar: avatar || "⚔️",
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

  const token = generateToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar },
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
    user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar },
  });
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
    lastSeenAt: user.lastSeenAt,
    createdAt: user.createdAt,
  });
});

export default router;
