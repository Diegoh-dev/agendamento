import type { NextFunction, Request, Response } from "express";
import {
  cancelAppointment,
  createAppointment,
  listAppointments,
} from "../models/appointment.model.js";
import { toAppointmentResponse } from "../views/appointment.view.js";

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
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const appointments = await listAppointments({
      doctor: typeof req.query.doctor === "string" ? req.query.doctor : undefined,
      patient:
        typeof req.query.patient === "string" ? req.query.patient : undefined,
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
    });

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
