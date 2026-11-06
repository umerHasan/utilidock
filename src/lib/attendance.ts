export type ScheduleMode = 'shift' | 'hours';

export type AttendanceShift = {
  id: string;
  name: string;
  start: string;
  end: string;
};

export type AttendanceDayEntry = {
  clockIn: string;
  clockOut: string;
  shiftId: string;
  scheduledHours: string;
};

export type AttendanceMonth = {
  mode: ScheduleMode;
  entries: Record<string, AttendanceDayEntry>;
};

export type AttendanceStore = {
  version: 1;
  shifts: AttendanceShift[];
  defaultShiftId?: string;
  months: Record<string, AttendanceMonth>;
};

export type AttendanceSummary = {
  scheduledMinutes: number;
  workedMinutes: number;
  scheduledToDateMinutes: number;
  workedToDateMinutes: number;
  overtimeMinutes: number;
  shortfallMinutes: number;
  scheduledDays: number;
  workedDays: number;
  pendingDays: number;
  comparedDays: number;
  incompleteDays: number;
};

export const STORAGE_KEY = 'utilidock.attendance.v1';

export function emptyAttendanceStore(): AttendanceStore {
  return { version: 1, shifts: [], months: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isShift(value: unknown): value is AttendanceShift {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.start === 'string'
    && typeof value.end === 'string';
}

function isEntry(value: unknown): value is AttendanceDayEntry {
  return isRecord(value)
    && typeof value.clockIn === 'string'
    && typeof value.clockOut === 'string'
    && typeof value.shiftId === 'string'
    && typeof value.scheduledHours === 'string';
}

function isMonth(value: unknown): value is AttendanceMonth {
  return isRecord(value)
    && (value.mode === 'shift' || value.mode === 'hours')
    && isRecord(value.entries)
    && Object.values(value.entries).every(isEntry);
}

function isAttendanceStore(value: unknown): value is AttendanceStore {
  return isRecord(value)
    && value.version === 1
    && Array.isArray(value.shifts)
    && value.shifts.every(isShift)
    && (value.defaultShiftId === undefined || typeof value.defaultShiftId === 'string')
    && isRecord(value.months)
    && Object.values(value.months).every(isMonth);
}

export function parseAttendanceStore(serialized: string): AttendanceStore {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new Error('Saved attendance data could not be read. It has not been overwritten.');
  }
  if (!isAttendanceStore(value)) {
    throw new Error('Saved attendance data has an unsupported format. It has not been overwritten.');
  }
  return value;
}

function parseTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function durationMinutes(start: string, end: string) {
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  if (startMinutes === null || endMinutes === null) return null;
  return endMinutes < startMinutes ? endMinutes + 24 * 60 - startMinutes : endMinutes - startMinutes;
}

function scheduledDuration(entry: AttendanceDayEntry, mode: ScheduleMode, shifts: AttendanceShift[]) {
  if (mode === 'shift') {
    const shift = shifts.find((candidate) => candidate.id === entry.shiftId);
    return shift ? durationMinutes(shift.start, shift.end) : null;
  }
  if (!entry.scheduledHours.trim()) return null;
  const hours = Number(entry.scheduledHours);
  return Number.isFinite(hours) && hours >= 0 ? Math.round(hours * 60) : null;
}

export function calculateAttendanceSummary(
  entries: Record<string, AttendanceDayEntry>,
  shifts: AttendanceShift[],
  mode: ScheduleMode,
  asOfDate: string,
): AttendanceSummary {
  const summary: AttendanceSummary = {
    scheduledMinutes: 0,
    workedMinutes: 0,
    scheduledToDateMinutes: 0,
    workedToDateMinutes: 0,
    overtimeMinutes: 0,
    shortfallMinutes: 0,
    scheduledDays: 0,
    workedDays: 0,
    pendingDays: 0,
    comparedDays: 0,
    incompleteDays: 0,
  };

  for (const [date, entry] of Object.entries(entries)) {
    const plannedMinutes = scheduledDuration(entry, mode, shifts);
    if (plannedMinutes !== null) {
      summary.scheduledMinutes += plannedMinutes;
      summary.scheduledDays += 1;
    }

    const actualMinutes = entry.clockIn && entry.clockOut
      ? durationMinutes(entry.clockIn, entry.clockOut)
      : null;
    if (actualMinutes !== null) {
      summary.workedMinutes += actualMinutes;
      summary.workedDays += 1;
    } else if (entry.clockIn || entry.clockOut) {
      summary.incompleteDays += 1;
    }

    if (date > asOfDate) continue;
    if (plannedMinutes !== null) summary.scheduledToDateMinutes += plannedMinutes;
    if (actualMinutes !== null) summary.workedToDateMinutes += actualMinutes;

    if (plannedMinutes === null) continue;
    if (actualMinutes === null && (entry.clockIn || entry.clockOut)) continue;
    if (actualMinutes === null && date === asOfDate) continue;
    if (actualMinutes === null) {
      summary.pendingDays += 1;
      continue;
    }
    summary.comparedDays += 1;

    const difference = actualMinutes - plannedMinutes;
    if (difference > 0) summary.overtimeMinutes += difference;
    else summary.shortfallMinutes += Math.abs(difference);
  }

  return summary;
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`;
}

export function getMonthDates(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return [];
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return [];
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    return `${match[1]}-${match[2]}-${String(day).padStart(2, '0')}`;
  });
}
