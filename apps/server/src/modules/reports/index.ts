import { Hono } from "hono";
import { coreRouter } from "./core/routes";
import { objectsRouter } from "./objects/routes";
import { taskRouter } from "./task/routes";

export const reportsRouter = new Hono();
reportsRouter.route("/", coreRouter);
reportsRouter.route("/", objectsRouter);
reportsRouter.route("/", taskRouter);

export default reportsRouter;