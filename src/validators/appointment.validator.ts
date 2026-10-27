import { z } from "zod";
import { endOfDay, startOfDay } from "../utils/date-range.js";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function dateFilter(message: string) {
  return z
    .union([z.iso.date(), z.iso.datetime({ offset: true })], { error: message })
    .transform((value): { start: Date; end: Date } => {
      if (DATE_ONLY.test(value)) {
        return { start: startOfDay(value), end: endOfDay(value) };
      }
      const instant = new Date(value);
      return { start: instant, end: instant };
    });
}

export const createAppointmentSchema = z.object({
  body: z
    .object({
      patientName: z
        .string({ error: "O nome do paciente é obrigatório" })
        .trim()
        .min(1, "O nome do paciente é obrigatório"),
      doctorName: z
        .string({ error: "O nome do médico é obrigatório" })
        .trim()
        .min(1, "O nome do médico é obrigatório"),
      scheduledAt: z.iso.datetime({
        offset: true,
        error:
          "A data do agendamento deve estar no formato ISO 8601 (com Z ou offset, como -03:00)",
      }),
    })
    .superRefine((data, ctx) => {
      const scheduledAt = new Date(data.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        ctx.addIssue({
          code: "custom",
          message: "Data inválida",
          path: ["scheduledAt"],
        });
        return;
      }

      if (scheduledAt.getTime() <= Date.now()) {
        ctx.addIssue({
          code: "custom",
          message: "O agendamento não pode ser no passado",
          path: ["scheduledAt"],
        });
      }
    }),
});

export const listAppointmentsSchema = z.object({
  query: z
    .object({
      doctor: z
        .string()
        .trim()
        .min(1, "O filtro de médico não pode ser vazio")
        .optional(),
      patient: z
        .string()
        .trim()
        .min(1, "O filtro de paciente não pode ser vazio")
        .optional(),
      from: dateFilter(
        "A data inicial deve estar no formato AAAA-MM-DD ou ISO 8601",
      ).optional(),
      to: dateFilter(
        "A data final deve estar no formato AAAA-MM-DD ou ISO 8601",
      ).optional(),
    })
    .transform(({ from, to, ...rest }) => ({
      ...rest,
      from: from?.start ?? to?.start,
      to: to?.end ?? from?.end,
    }))
    .refine((query) => !(query.from && query.to && query.from > query.to), {
      message: "A data inicial deve ser anterior ou igual à data final",
      path: ["from"],
    }),
});

export const cancelAppointmentSchema = z.object({
  params: z.object({
    id: z.uuid({ error: "O ID do agendamento deve ser um UUID válido" }),
  }),
});
