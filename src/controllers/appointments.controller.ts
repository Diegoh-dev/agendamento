import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import {
  cancelAppointment,
  createAppointment,
  listAppointments,
} from "../models/appointment.model.js";
import type { listAppointmentsSchema } from "../validators/appointment.validator.js";
import { toAppointmentResponse } from "../views/appointment.view.js";

type ListAppointmentsQuery = z.output<typeof listAppointmentsSchema>["query"];

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const appointment = await createAppointment({
      patientName: req.body.patientName,
      doctorName: req.body.doctorName,
      scheduledAt: new Date(req.body.scheduledAt),
    });

    res.status(201).json(toAppointmentResponse(appointment));
  } catch (error) {
    next(error);
  }
}

export async function list(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = res.locals.query as ListAppointmentsQuery;
    const appointments = await listAppointments(filters);

    res.status(200).json(appointments.map(toAppointmentResponse));
  } catch (error) {
    next(error);
  }
}

export async function cancel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const appointment = await cancelAppointment(req.params.id as string);
    res.status(200).json(toAppointmentResponse(appointment));
  } catch (error) {
    next(error);
  }
}
