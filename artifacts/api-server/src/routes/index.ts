import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import characterRouter from "./character";
import statsRouter from "./stats";
import activitiesRouter from "./activities";
import dailyLogRouter from "./dailyLog";
import questsRouter from "./quests";
import streaksRouter from "./streaks";
import rewardsRouter from "./rewards";
import punishmentsRouter from "./punishments";
import achievementsRouter from "./achievements";
import bossFightsRouter from "./bossFights";
import saveGameRouter from "./saveGame";
import friendsRouter from "./friends";
import groupQuestsRouter from "./groupQuests";
import lifeLogRouter from "./lifeLog";
import challengesRouter from "./challenges";
import weeklyRecapRouter from "./weeklyRecap";

const router: IRouter = Router();

// Public routes (no auth needed)
router.use(healthRouter);
router.use(authRouter);

// All game routes (require auth — middleware is applied per-route)
router.use(characterRouter);
router.use(statsRouter);
router.use(activitiesRouter);
router.use(dailyLogRouter);
router.use(questsRouter);
router.use(streaksRouter);
router.use(rewardsRouter);
router.use(punishmentsRouter);
router.use(achievementsRouter);
router.use(bossFightsRouter);
router.use(saveGameRouter);
router.use(friendsRouter);
router.use(groupQuestsRouter);
router.use(lifeLogRouter);
router.use(challengesRouter);
router.use(weeklyRecapRouter);

export default router;
