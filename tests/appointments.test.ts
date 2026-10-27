import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { pool } from "../src/config/database.js";

function futureDate(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function spDay(daysAhead: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
}

function spDateTime(day: string, time: string): string {
  return new Date(`${day}T${time}:00-03:00`).toISOString();
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

  it("rejects malformed JSON", async () => {
    const response = await request(app)
      .post("/api/appointments")
      .set("Content-Type", "application/json")
      .send('{"patientName": ');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "JSON inválido no corpo da requisição",
    );
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

  it("accepts scheduledAt with an explicit offset", async () => {
    const day = spDay(3);

    const response = await request(app).post("/api/appointments").send({
      patientName: "Ana Silva",
      doctorName: "Dr. Souza",
      scheduledAt: `${day}T11:00:00-03:00`,
    });

    expect(response.status).toBe(201);
    expect(response.body.scheduledAt).toBe(`${day}T14:00:00.000Z`);
  });

  it("detects conflict for the same instant in different offsets", async () => {
    const day = spDay(3);

    await request(app).post("/api/appointments").send({
      patientName: "Ana Silva",
      doctorName: "Dr. Souza",
      scheduledAt: `${day}T11:00:00-03:00`,
    });

    const response = await request(app).post("/api/appointments").send({
      patientName: "Bruno Lima",
      doctorName: "Dr. Souza",
      scheduledAt: `${day}T14:00:00Z`,
    });

    expect(response.status).toBe(409);
  });

  it("rejects scheduledAt without a timezone", async () => {
    const response = await request(app).post("/api/appointments").send({
      patientName: "Ana Silva",
      doctorName: "Dr. Souza",
      scheduledAt: `${spDay(3)}T14:00:00`,
    });

    expect(response.status).toBe(400);
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

  describe("date filter", () => {
    const day = spDay(5);
    const nextDay = spDay(6);

    async function seed(): Promise<void> {
      const slots = [
        spDateTime(day, "08:00"),
        spDateTime(day, "14:30"),
        spDateTime(day, "23:30"),
        spDateTime(nextDay, "09:00"),
      ];
      for (const scheduledAt of slots) {
        const response = await request(app).post("/api/appointments").send({
          patientName: "Ana Silva",
          doctorName: "Dr. Souza",
          scheduledAt,
        });
        expect(response.status).toBe(201);
      }
    }

    function scheduledTimes(body: Array<{ scheduledAt: string }>): string[] {
      return body.map((item) => new Date(item.scheduledAt).toISOString());
    }

    it("filters the whole day in Sao Paulo time when only the date is given", async () => {
      await seed();

      const response = await request(app)
        .get("/api/appointments")
        .query({ from: day, to: day });

      expect(response.status).toBe(200);
      expect(scheduledTimes(response.body)).toEqual([
        spDateTime(day, "08:00"),
        spDateTime(day, "14:30"),
        spDateTime(day, "23:30"),
      ]);
    });

    it("filters by exact instants with inclusive bounds when time is given", async () => {
      await seed();

      const response = await request(app)
        .get("/api/appointments")
        .query({
          from: spDateTime(day, "08:00"),
          to: spDateTime(day, "14:30"),
        });

      expect(response.status).toBe(200);
      expect(scheduledTimes(response.body)).toEqual([
        spDateTime(day, "08:00"),
        spDateTime(day, "14:30"),
      ]);
    });

    it("accepts a date-only lower bound mixed with a datetime upper bound", async () => {
      await seed();

      const response = await request(app)
        .get("/api/appointments")
        .query({ from: day, to: spDateTime(nextDay, "08:59") });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it("accepts datetimes with an explicit offset", async () => {
      await seed();

      const response = await request(app)
        .get("/api/appointments")
        .query({ from: `${day}T14:00:00-03:00`, to: `${day}T23:59:00-03:00` });

      expect(response.status).toBe(200);
      expect(scheduledTimes(response.body)).toEqual([
        spDateTime(day, "14:30"),
        spDateTime(day, "23:30"),
      ]);
    });

    it.each([["from"], ["to"]])(
      "filters only that day when just %s is given as a date",
      async (bound) => {
        await seed();

        const response = await request(app)
          .get("/api/appointments")
          .query({ [bound]: day });

        expect(response.status).toBe(200);
        expect(scheduledTimes(response.body)).toEqual([
          spDateTime(day, "08:00"),
          spDateTime(day, "14:30"),
          spDateTime(day, "23:30"),
        ]);
      },
    );

    it.each([["from"], ["to"]])(
      "filters the exact instant when just %s is given with time",
      async (bound) => {
        await seed();

        const response = await request(app)
          .get("/api/appointments")
          .query({ [bound]: spDateTime(day, "14:30") });

        expect(response.status).toBe(200);
        expect(scheduledTimes(response.body)).toEqual([
          spDateTime(day, "14:30"),
        ]);
      },
    );

    it("returns nothing when the single instant has no appointment", async () => {
      await seed();

      const response = await request(app)
        .get("/api/appointments")
        .query({ from: spDateTime(day, "14:31") });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it.each([
      [{ from: "2026-13-01" }],
      [{ to: "27/10/2026" }],
      [{ from: nextDay, to: day }],
      [{ from: spDateTime(day, "15:00"), to: spDateTime(day, "10:00") }],
    ])("rejects invalid date filters %o", async (query) => {
      const response = await request(app).get("/api/appointments").query(query);
      expect(response.status).toBe(400);
    });
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
