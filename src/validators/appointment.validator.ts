import { z } from "zod";

export const createAppointmentSchema = z.object({
  body: z
    .object({
      patientName: z.string().trim().min(1),
      doctorName: z.string().trim().min(1),
      scheduledAt: z.iso.datetime(),
    })
    .superRefine((data, ctx) => {
      const scheduledAt = new Date(data.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid date",
          path: ["scheduledAt"],
        });
        return;
      }

      if (scheduledAt.getTime() <= Date.now()) {
        ctx.addIssue({
          code: "custom",
          message: "Appointment cannot be in the past",
          path: ["scheduledAt"],
        });
      }
    }),
});

export const listAppointmentsSchema = z.object({
  query: z
    .object({
      doctor: z.string().trim().min(1).optional(),
      patient: z.string().trim().min(1).optional(),
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
    id: z.uuid(),
  }),
});
