import { Router, type IRouter } from "express";
import { db, characterTable, statsTable, dailyLogTable, dailyQuestsTable, sideQuestsTable, mainQuestsTable, streaksTable, rewardsTable, punishmentsTable, achievementsTable, bossFightsTable, activitiesTable } from "@workspace/db";

const router: IRouter = Router();

const SAVE_VERSION = 1;

// ─── Export: snapshot every table into a single JSON document ───

router.get("/save-game/export", async (_req, res): Promise<void> => {
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
    db.select().from(characterTable),
    db.select().from(statsTable),
    db.select().from(dailyLogTable),
    db.select().from(dailyQuestsTable),
    db.select().from(sideQuestsTable),
    db.select().from(mainQuestsTable),
    db.select().from(streaksTable),
    db.select().from(rewardsTable),
    db.select().from(punishmentsTable),
    db.select().from(achievementsTable),
    db.select().from(bossFightsTable),
    db.select().from(activitiesTable),
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

// ─── Import: wipe current data and restore from a save file ───

router.post("/save-game/import", async (req, res): Promise<void> => {
  const saveData = req.body;

  if (!saveData || saveData.game !== "MAXIMUS RPG" || !saveData.version) {
    res.status(400).json({ error: "Invalid save file. Must be a MAXIMUS RPG save." });
    return;
  }

  if (saveData.version > SAVE_VERSION) {
    res.status(400).json({ error: `Save file version ${saveData.version} is newer than supported (${SAVE_VERSION}). Update your app first.` });
    return;
  }

  try {
    // Clear all tables (order matters for referential safety — children first)
    await db.delete(dailyLogTable);
    await db.delete(dailyQuestsTable);
    await db.delete(sideQuestsTable);
    await db.delete(mainQuestsTable);
    await db.delete(bossFightsTable);
    await db.delete(rewardsTable);
    await db.delete(punishmentsTable);
    await db.delete(achievementsTable);
    await db.delete(streaksTable);
    await db.delete(statsTable);
    await db.delete(activitiesTable);
    await db.delete(characterTable);

    // Restore character
    if (saveData.character) {
      const { id, ...charData } = saveData.character;
      await db.insert(characterTable).values(charData);
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
          const { id, ...rest } = row;
          return rest;
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
