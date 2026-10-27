import { z } from "zod";

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
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.from && Number.isNaN(new Date(data.from).getTime())) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid from date",
          path: ["from"],
        });
      }

      if (data.to && Number.isNaN(new Date(data.to).getTime())) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid to date",
          path: ["to"],
        });
      }

      if (data.from && data.to && new Date(data.from) > new Date(data.to)) {
        ctx.addIssue({
          code: "custom",
          message: "from must be before or equal to to",
          path: ["from"],
        });
      }
    }),
});

export const cancelAppointmentSchema = z.object({
  params: z.object({
    id: z.uuid({ error: "O ID do agendamento deve ser um UUID válido" }),
  }),
});
