import { Router } from "express";
import { appointmentsRoutes } from "./appointments.routes.js";
import { healthRoutes } from "./health.routes.js";

const routes = Router();

routes.use(healthRoutes);
routes.use(appointmentsRoutes);

export { routes };
