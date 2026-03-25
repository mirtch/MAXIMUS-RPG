import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, activityFeedTable, characterTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

// GET /api/timeline — returns the user's own activity feed for the timeline view
router.get("/timeline", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;

  const events = await db
    .select()
    .from(activityFeedTable)
    .where(eq(activityFeedTable.userId, userId))
    .orderBy(desc(activityFeedTable.createdAt))
    .limit(limit);

  // Also get character creation date as the "inception" event
  const [character] = await db
    .select({ createdAt: characterTable.createdAt, name: characterTable.name, class: characterTable.class })
    .from(characterTable)
    .where(eq(characterTable.userId, userId))
    .limit(1);

  res.json({
    events,
    characterCreatedAt: character?.createdAt || null,
    characterName: character?.name || null,
    characterClass: character?.class || null,
  });
});

export default router;
