import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, streaksTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const DEFAULT_STREAKS = [
  { name: "gym", displayName: "Gym Streak" },
  { name: "running", displayName: "Running Streak" },
  { name: "piano", displayName: "Piano Streak" },
  { name: "sleep_8h", displayName: "8h Sleep Streak" },
  { name: "deep_work", displayName: "Deep Work Streak" },
  { name: "planned_day", displayName: "Planned Day Streak" },
];

async function ensureStreaksExist(userId: number) {
  const existing = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
  for (const s of DEFAULT_STREAKS) {
    if (!existing.find(e => e.name === s.name)) {
      await db.insert(streaksTable).values({
        userId,
        name: s.name,
        displayName: s.displayName,
        currentStreak: 0,
        longestStreak: 0,
      });
    }
  }
}

router.get("/streaks", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  await ensureStreaksExist(userId);
  const streaks = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId)).orderBy(streaksTable.name);
  res.json(streaks);
});

export default router;
