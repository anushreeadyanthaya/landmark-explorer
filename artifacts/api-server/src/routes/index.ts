import { Router, type IRouter } from "express";
import healthRouter from "./health";
import landmarksRouter from "./landmarks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(landmarksRouter);

export default router;
