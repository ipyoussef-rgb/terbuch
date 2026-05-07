import {
  addDays,
  addMinutes,
  isBefore,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
} from "date-fns";
import { db } from "./db";

export type DayWindow = { startHour: number; endHour: number };

const DEFAULT_WINDOW: DayWindow = { startHour: 8, endHour: 16 };
const DEFAULT_DAYS_AHEAD = 14;
const SLOT_GRID_MIN = 30;

function workdaysAhead(days: number): Date[] {
  const today = startOfDay(new Date());
  const out: Date[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(today, i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    out.push(d);
  }
  return out;
}

function clockIn(d: Date, hour: number): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(d, hour), 0), 0), 0);
}

export async function generateSlots(opts?: {
  daysAhead?: number;
  window?: DayWindow;
}): Promise<{ created: number }> {
  const days = opts?.daysAhead ?? DEFAULT_DAYS_AHEAD;
  const window = opts?.window ?? DEFAULT_WINDOW;

  const offices = await db.office.findMany({
    include: { services: true },
  });

  type Row = {
    officeId: string;
    serviceId: string;
    startsAt: Date;
    endsAt: Date;
  };

  const rows: Row[] = [];
  const now = new Date();
  for (const office of offices) {
    for (const service of office.services) {
      for (const day of workdaysAhead(days)) {
        let cursor = clockIn(day, window.startHour);
        const dayEnd = clockIn(day, window.endHour);
        while (
          isBefore(addMinutes(cursor, SLOT_GRID_MIN), dayEnd) ||
          +addMinutes(cursor, SLOT_GRID_MIN) === +dayEnd
        ) {
          if (!isBefore(cursor, now)) {
            rows.push({
              officeId: office.id,
              serviceId: service.id,
              startsAt: cursor,
              endsAt: addMinutes(cursor, SLOT_GRID_MIN),
            });
          }
          cursor = addMinutes(cursor, SLOT_GRID_MIN);
        }
      }
    }
  }

  if (rows.length === 0) return { created: 0 };

  const result = await db.slot.createMany({
    data: rows.map((r) => ({ ...r, status: "FREE" as const })),
    skipDuplicates: true,
  });
  return { created: result.count };
}
