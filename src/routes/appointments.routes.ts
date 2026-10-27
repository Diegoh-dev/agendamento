import { Router } from "express";
import {
  cancel,
  create,
  list,
} from "../controllers/appointments.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  listAppointmentsSchema,
} from "../validators/appointment.validator.js";

const appointmentsRoutes = Router();

appointmentsRoutes.post(
  "/appointments",
  validate(createAppointmentSchema),
  create,
);

appointmentsRoutes.get(
  "/appointments",
  validate(listAppointmentsSchema),
  list,
);

appointmentsRoutes.patch(
  "/appointments/:id/cancel",
  validate(cancelAppointmentSchema),
  cancel,
);

export { appointmentsRoutes };
