const errorResponse = {
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const appointmentResponse = {
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Appointment" },
    },
  },
};

export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "API de Agendamento",
    description: "API REST de agendamento",
    version: "1.0.0",
  },
  servers: [{ url: "/api" }],
  tags: [{ name: "Health" }, { name: "Appointments" }],
  components: {
    schemas: {
      Appointment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          patientName: { type: "string", example: "Maria Silva" },
          doctorName: { type: "string", example: "Dr. João" },
          scheduledAt: {
            type: "string",
            format: "date-time",
            example: "2026-12-01T14:00:00.000Z",
          },
          status: { type: "string", enum: ["ACTIVE", "CANCELLED"] },
        },
      },
      CreateAppointment: {
        type: "object",
        required: ["patientName", "doctorName", "scheduledAt"],
        properties: {
          patientName: { type: "string", minLength: 1, example: "Maria Silva" },
          doctorName: { type: "string", minLength: 1, example: "Dr. João" },
          scheduledAt: {
            type: "string",
            format: "date-time",
            example: "2026-12-01T14:00:00.000Z",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              message: { type: "string" },
              status: { type: "integer" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Verifica se a API está no ar",
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                },
              },
            },
          },
        },
      },
    },
    "/appointments": {
      post: {
        tags: ["Appointments"],
        summary: "Cria um agendamento",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAppointment" },
            },
          },
        },
        responses: {
          201: { description: "Agendamento criado", ...appointmentResponse },
          400: { description: "Dados inválidos", ...errorResponse },
        },
      },
      get: {
        tags: ["Appointments"],
        summary: "Lista agendamentos",
        parameters: [
          { name: "doctor", in: "query", schema: { type: "string" } },
          { name: "patient", in: "query", schema: { type: "string" } },
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date-time" },
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: {
          200: {
            description: "Lista de agendamentos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Appointment" },
                },
              },
            },
          },
          400: { description: "Filtros inválidos", ...errorResponse },
        },
      },
    },
    "/appointments/{id}/cancel": {
      patch: {
        tags: ["Appointments"],
        summary: "Cancela um agendamento",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Agendamento cancelado", ...appointmentResponse },
          400: { description: "ID inválido", ...errorResponse },
          404: { description: "Agendamento não encontrado", ...errorResponse },
        },
      },
    },
  },
};
