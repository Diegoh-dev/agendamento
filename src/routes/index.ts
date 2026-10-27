import { Router } from "express";
import { healthRoutes } from "./health.routes.js";

const routes = Router();

routes.use(healthRoutes);

export { routes };
