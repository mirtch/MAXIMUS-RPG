import { Router, type IRouter } from "express";
import { db, streaksTable } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_STREAKS = [
  { name: "gym", displayName: "Gym Streak" },
  { name: "running", displayName: "Running Streak" },
  { name: "piano", displayName: "Piano Streak" },
  { name: "sleep_8h", displayName: "8h Sleep Streak" },
  { name: "deep_work", displayName: "Deep Work Streak" },
  { name: "planned_day", displayName: "Planned Day Streak" },
];

async function ensureStreaksExist() {
  const existing = await db.select().from(streaksTable);
  for (const s of DEFAULT_STREAKS) {
    if (!existing.find(e => e.name === s.name)) {
      await db.insert(streaksTable).values({
        name: s.name,
        displayName: s.displayName,
        currentStreak: 0,
        longestStreak: 0,
      });
    }
  }
}

router.get("/streaks", async (req, res): Promise<void> => {
  await ensureStreaksExist();
  const streaks = await db.select().from(streaksTable).orderBy(streaksTable.name);
  res.json(streaks);
});

export default router;
