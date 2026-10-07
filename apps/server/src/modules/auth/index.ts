import { Hono } from "hono";
import { authRouter } from "./auth/routes";
import { profileRouter } from "./profile/routes";
import { workplacesRouter } from "./workplaces/routes";
import { certificatesRouter } from "./certificates/routes";
import { privatePracticeRouter } from "./private-practice/routes";
import { personalInsuranceRouter } from "./personal-insurance/routes";
import { personalDocumentsRouter } from "./personal-documents/routes";
import { workplaceDocumentsRouter } from "./workplace-documents/routes";
import { privatePracticeDocumentsRouter } from "./private-practice-documents/routes";

export const authRoutes = new Hono();

authRoutes.route("/", authRouter);
authRoutes.route("/", profileRouter);
authRoutes.route("/", workplacesRouter);
authRoutes.route("/", certificatesRouter);
authRoutes.route("/", privatePracticeRouter);
authRoutes.route("/", personalInsuranceRouter);
authRoutes.route("/", personalDocumentsRouter);
authRoutes.route("/", workplaceDocumentsRouter);
authRoutes.route("/", privatePracticeDocumentsRouter);

export default authRoutes;
