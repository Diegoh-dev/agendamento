import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { pool } from "../src/config/database.js";

function futureDate(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

async function resetDatabase(): Promise<void> {
  await pool.execute("DELETE FROM agendamentos");
}

describe("Appointments API", () => {
  beforeAll(async () => {
    await pool.execute("SELECT 1");
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates a valid appointment", async () => {
    const scheduledAt = futureDate(24);

    const response = await request(app).post("/api/appointments").send({
      patientName: "Ana Silva",
      doctorName: "Dr. Souza",
      scheduledAt,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      patientName: "Ana Silva",
      doctorName: "Dr. Souza",
      status: "ACTIVE",
    });
    expect(response.body.id).toBeTruthy();
    expect(response.body.scheduledAt).toBe(scheduledAt);
    expect(response.body.createdAt).toBeUndefined();
  });

  it("rejects appointments in the past", async () => {
    const response = await request(app).post("/api/appointments").send({
      patientName: "Ana Silva",
      doctorName: "Dr. Souza",
      scheduledAt: new Date(Date.now() - 60_000).toISOString(),
    });

    expect(response.status).toBe(400);
    expect(response.body.error.status).toBe(400);
  });

  it("rejects invalid payload", async () => {
    const response = await request(app).post("/api/appointments").send({
      patientName: "",
      doctorName: "Dr. Souza",
      scheduledAt: futureDate(24),
    });

    expect(response.status).toBe(400);
  });

  it("rejects conflict for the same doctor and time", async () => {
    const scheduledAt = futureDate(48);
    const payload = {
      patientName: "Ana Silva",
      doctorName: "Dr. Souza",
      scheduledAt,
    };

    await request(app).post("/api/appointments").send(payload);

    const response = await request(app)
      .post("/api/appointments")
      .send({ ...payload, patientName: "Bruno Lima" });

    expect(response.status).toBe(409);
  });

  it("allows booking after cancellation", async () => {
    const scheduledAt = futureDate(72);
    const created = await request(app).post("/api/appointments").send({
      patientName: "Ana Silva",
      doctorName: "Dr. Souza",
      scheduledAt,
    });

    const cancelled = await request(app).patch(
      `/api/appointments/${created.body.id}/cancel`,
    );
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("CANCELLED");

    const again = await request(app).post("/api/appointments").send({
      patientName: "Bruno Lima",
      doctorName: "Dr. Souza",
      scheduledAt,
    });

    expect(again.status).toBe(201);
    expect(again.body.status).toBe("ACTIVE");
  });

  it("returns 404 when cancelling a missing appointment", async () => {
    const response = await request(app).patch(
      "/api/appointments/11111111-1111-4111-8111-111111111111/cancel",
    );

    expect(response.status).toBe(404);
  });

  it("filters appointments by doctor, patient and period", async () => {
    const slotA = futureDate(10);
    const slotB = futureDate(20);
    const slotC = futureDate(30);

    await request(app).post("/api/appointments").send({
      patientName: "Ana Silva",
      doctorName: "Dr. Souza",
      scheduledAt: slotA,
    });
    await request(app).post("/api/appointments").send({
      patientName: "Bruno Lima",
      doctorName: "Dr. Souza",
      scheduledAt: slotB,
    });
    await request(app).post("/api/appointments").send({
      patientName: "Ana Silva",
      doctorName: "Dra. Alves",
      scheduledAt: slotC,
    });

    const byDoctor = await request(app).get("/api/appointments").query({
      doctor: "Dr. Souza",
    });
    expect(byDoctor.status).toBe(200);
    expect(byDoctor.body).toHaveLength(2);

    const byPatient = await request(app).get("/api/appointments").query({
      patient: "Ana Silva",
    });
    expect(byPatient.status).toBe(200);
    expect(byPatient.body).toHaveLength(2);

    const byPeriod = await request(app).get("/api/appointments").query({
      from: slotA,
      to: slotB,
    });
    expect(byPeriod.status).toBe(200);
    expect(byPeriod.body).toHaveLength(2);
  });

  it("prevents concurrent bookings for the same slot", async () => {
    const scheduledAt = futureDate(96);
    const payload = {
      patientName: "Ana Silva",
      doctorName: "Dr. Concurrent",
      scheduledAt,
    };

    const results = await Promise.all([
      request(app)
        .post("/api/appointments")
        .send({ ...payload, patientName: "Ana Silva" }),
      request(app)
        .post("/api/appointments")
        .send({ ...payload, patientName: "Bruno Lima" }),
    ]);

    const statuses = results.map((result) => result.status).sort();
    expect(statuses).toEqual([201, 409]);
  });
});
