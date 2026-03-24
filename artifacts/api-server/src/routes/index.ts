import { Router, type IRouter } from "express";
import healthRouter from "./health";
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

const router: IRouter = Router();

router.use(healthRouter);
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

export default router;
