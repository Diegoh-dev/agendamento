export const APP_TIME_ZONE = "America/Sao_Paulo";

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  timeZoneName: "longOffset",
});

function offsetMinutesAt(instant: number): number {
  const zoneName =
    offsetFormatter
      .formatToParts(instant)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";

  const match = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(zoneName);
  if (!match || !match[1]) {
    return 0;
  }

  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

function parseDate(dateStr: string): [number, number, number] {
  const [year, month, day] = dateStr.split("-").map(Number);
  return [year!, month!, day!];
}

function midnightInAppZone(year: number, month: number, day: number): Date {
  const wallClock = Date.UTC(year, month - 1, day);
  let instant = wallClock - offsetMinutesAt(wallClock) * 60_000;
  // O deslocamento pode diferir no instante corrigido em torno das transições do horário de verão..
  instant = wallClock - offsetMinutesAt(instant) * 60_000;
  return new Date(instant);
}

export function startOfDay(dateStr: string): Date {
  const [year, month, day] = parseDate(dateStr);
  return midnightInAppZone(year, month, day);
}

export function endOfDay(dateStr: string): Date {
  const [year, month, day] = parseDate(dateStr);
  const nextMidnight = midnightInAppZone(year, month, day + 1);
  return new Date(nextMidnight.getTime() - 1);
}
