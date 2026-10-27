import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { randomUUID } from "node:crypto";
import { pool } from "../config/database.js";
import { AppError } from "../errors/app-error.js";
import type { AppointmentRecord } from "../views/appointment.view.js";

type AppointmentRow = RowDataPacket & {
  id: string;
  nome_paciente: string;
  nome_medico: string;
  agendado_em: Date;
  status: "ATIVO" | "CANCELADO";
};

export type CreateAppointmentInput = {
  patientName: string;
  doctorName: string;
  scheduledAt: Date;
};

export type ListAppointmentsFilters = {
  doctor?: string;
  patient?: string;
  from?: Date;
  to?: Date;
};

function mapStatus(
  status: AppointmentRow["status"],
): AppointmentRecord["status"] {
  return status === "ATIVO" ? "ACTIVE" : "CANCELLED";
}

function mapRow(row: AppointmentRow): AppointmentRecord {
  return {
    id: row.id,
    patientName: row.nome_paciente,
    doctorName: row.nome_medico,
    scheduledAt: new Date(row.agendado_em),
    status: mapStatus(row.status),
  };
}

function isDuplicateError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "ER_DUP_ENTRY"
  );
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<AppointmentRecord> {
  const id = randomUUID();

  try {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO agendamentos (id, nome_paciente, nome_medico, agendado_em, status)
       VALUES (?, ?, ?, ?, 'ATIVO')`,
      [id, input.patientName, input.doctorName, input.scheduledAt],
    );
  } catch (error) {
    if (isDuplicateError(error)) {
      throw new AppError(
        "O médico já possui um atendimento agendado para este horário",
        409,
      );
    }
    throw error;
  }

  const appointment = await findAppointmentById(id);
  if (!appointment) {
    throw new AppError("Falha ao criar o agendamento", 500);
  }

  return appointment;
}

export async function findAppointmentById(
  id: string,
): Promise<AppointmentRecord | null> {
  const [rows] = await pool.execute<AppointmentRow[]>(
    `SELECT id, nome_paciente, nome_medico, agendado_em, status
     FROM agendamentos
     WHERE id = ?`,
    [id],
  );

  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function listAppointments(
  filters: ListAppointmentsFilters,
): Promise<AppointmentRecord[]> {
  const conditions: string[] = [];
  const values: Array<string | Date> = [];

  if (filters.doctor) {
    conditions.push("nome_medico = ?");
    values.push(filters.doctor);
  }

  if (filters.patient) {
    conditions.push("nome_paciente = ?");
    values.push(filters.patient);
  }

  if (filters.from) {
    conditions.push("agendado_em >= ?");
    values.push(filters.from);
  }

  if (filters.to) {
    conditions.push("agendado_em <= ?");
    values.push(filters.to);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query<AppointmentRow[]>(
    `SELECT id, nome_paciente, nome_medico, agendado_em, status
     FROM agendamentos
     ${where}
     ORDER BY agendado_em ASC`,
    values,
  );

  return rows.map(mapRow);
}

export async function cancelAppointment(
  id: string,
): Promise<AppointmentRecord> {
  const existing = await findAppointmentById(id);
  if (!existing) {
    throw new AppError("Agendamento não encontrado", 404);
  }

  if (existing.status === "CANCELLED") {
    return existing;
  }

  await pool.execute<ResultSetHeader>(
    `UPDATE agendamentos SET status = 'CANCELADO' WHERE id = ? AND status = 'ATIVO'`,
    [id],
  );

  const updated = await findAppointmentById(id);
  if (!updated) {
    throw new AppError("Agendamento não encontrado", 404);
  }

  return updated;
}
