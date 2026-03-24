import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, characterTable, statsTable, dailyLogTable, dailyQuestsTable, sideQuestsTable, mainQuestsTable, streaksTable, rewardsTable, punishmentsTable, achievementsTable, bossFightsTable, activitiesTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const SAVE_VERSION = 2;

router.get("/save-game/export", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [
    character,
    stats,
    dailyLogs,
    dailyQuests,
    sideQuests,
    mainQuests,
    streaks,
    rewards,
    punishments,
    achievements,
    bossFights,
    activities,
  ] = await Promise.all([
    db.select().from(characterTable).where(eq(characterTable.userId, userId)),
    db.select().from(statsTable).where(eq(statsTable.userId, userId)),
    db.select().from(dailyLogTable).where(eq(dailyLogTable.userId, userId)),
    db.select().from(dailyQuestsTable).where(eq(dailyQuestsTable.userId, userId)),
    db.select().from(sideQuestsTable).where(eq(sideQuestsTable.userId, userId)),
    db.select().from(mainQuestsTable).where(eq(mainQuestsTable.userId, userId)),
    db.select().from(streaksTable).where(eq(streaksTable.userId, userId)),
    db.select().from(rewardsTable).where(eq(rewardsTable.userId, userId)),
    db.select().from(punishmentsTable).where(eq(punishmentsTable.userId, userId)),
    db.select().from(achievementsTable).where(eq(achievementsTable.userId, userId)),
    db.select().from(bossFightsTable).where(eq(bossFightsTable.userId, userId)),
    db.select().from(activitiesTable).where(eq(activitiesTable.userId, userId)),
  ]);

  const saveData = {
    version: SAVE_VERSION,
    exportedAt: new Date().toISOString(),
    game: "MAXIMUS RPG",
    character: character[0] ?? null,
    stats,
    dailyLogs,
    dailyQuests,
    sideQuests,
    mainQuests,
    streaks,
    rewards,
    punishments,
    achievements,
    bossFights,
    activities,
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="maximus-save-${new Date().toISOString().slice(0, 10)}.json"`,
  );
  res.json(saveData);
});

router.post("/save-game/import", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const saveData = req.body;

  if (!saveData || saveData.game !== "MAXIMUS RPG" || !saveData.version) {
    res.status(400).json({ error: "Invalid save file. Must be a MAXIMUS RPG save." });
    return;
  }

  try {
    // Clear user's data only
    await db.delete(dailyLogTable).where(eq(dailyLogTable.userId, userId));
    await db.delete(dailyQuestsTable).where(eq(dailyQuestsTable.userId, userId));
    await db.delete(sideQuestsTable).where(eq(sideQuestsTable.userId, userId));
    await db.delete(mainQuestsTable).where(eq(mainQuestsTable.userId, userId));
    await db.delete(bossFightsTable).where(eq(bossFightsTable.userId, userId));
    await db.delete(rewardsTable).where(eq(rewardsTable.userId, userId));
    await db.delete(punishmentsTable).where(eq(punishmentsTable.userId, userId));
    await db.delete(achievementsTable).where(eq(achievementsTable.userId, userId));
    await db.delete(streaksTable).where(eq(streaksTable.userId, userId));
    await db.delete(statsTable).where(eq(statsTable.userId, userId));
    await db.delete(activitiesTable).where(eq(activitiesTable.userId, userId));
    await db.delete(characterTable).where(eq(characterTable.userId, userId));

    // Restore character
    if (saveData.character) {
      const { id, userId: _, ...charData } = saveData.character;
      await db.insert(characterTable).values({ ...charData, userId });
    }

    // Restore all collection tables
    const collections = [
      { data: saveData.stats, table: statsTable },
      { data: saveData.activities, table: activitiesTable },
      { data: saveData.streaks, table: streaksTable },
      { data: saveData.achievements, table: achievementsTable },
      { data: saveData.rewards, table: rewardsTable },
      { data: saveData.punishments, table: punishmentsTable },
      { data: saveData.dailyQuests, table: dailyQuestsTable },
      { data: saveData.sideQuests, table: sideQuestsTable },
      { data: saveData.mainQuests, table: mainQuestsTable },
      { data: saveData.bossFights, table: bossFightsTable },
      { data: saveData.dailyLogs, table: dailyLogTable },
    ];

    for (const { data, table } of collections) {
      if (Array.isArray(data) && data.length > 0) {
        const rows = data.map((row: Record<string, unknown>) => {
          const { id, userId: _, ...rest } = row;
          return { ...rest, userId };
        });
        await db.insert(table).values(rows);
      }
    }

    res.json({
      success: true,
      message: "Save game imported successfully!",
      importedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Import failed:", err);
    res.status(500).json({ error: "Import failed. Your database may be in an inconsistent state — try importing again." });
  }
});

export default router;
