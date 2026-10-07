import { Hono } from "hono";
import { coreRouter } from "./core/routes";
import { objectsRouter } from "./objects/routes";
import { taskRouter } from "./task/routes";
import { marketAnalysisRouter } from "./market-analysis/routes";
import { analoguesRouter } from "./analogues/routes";
import { valuationRouter } from "./valuation/routes";
import { appraisersRouter } from "./appraisers/routes";
import { reportDocumentsRouter } from "./report-documents/routes";
import { reportPhotosRouter } from "./report-photos/routes";
import { marketAnalysisDocumentsRouter } from "./market-analysis-documents/routes";

export const reportsRouter = new Hono();
reportsRouter.route("/", coreRouter);
reportsRouter.route("/", objectsRouter);
reportsRouter.route("/", taskRouter);
reportsRouter.route("/", marketAnalysisRouter);
reportsRouter.route("/", analoguesRouter);
reportsRouter.route("/", valuationRouter);
reportsRouter.route("/", appraisersRouter);
reportsRouter.route("/", reportDocumentsRouter);
reportsRouter.route("/", reportPhotosRouter);
reportsRouter.route("/", marketAnalysisDocumentsRouter);

export default reportsRouter;
