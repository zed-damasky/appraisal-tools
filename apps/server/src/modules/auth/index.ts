import { Hono } from "hono";
import { authRouter } from "./auth/routes";
import { profileRouter } from "./profile/routes";
import { workplacesRouter } from "./workplaces/routes";
import { certificatesRouter } from "./certificates/routes";
import { privatePracticeRouter } from "./private-practice/routes";

export const authRoutes = new Hono();

authRoutes.route("/", authRouter);
authRoutes.route("/", profileRouter);
authRoutes.route("/", workplacesRouter);
authRoutes.route("/", certificatesRouter);
authRoutes.route("/", privatePracticeRouter);

export default authRoutes;