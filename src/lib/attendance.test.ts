import { describe, expect, it } from 'vitest';
import {
  calculateAttendanceSummary,
  durationMinutes,
  emptyAttendanceStore,
  formatDuration,
  getMonthDates,
  parseAttendanceStore,
  type AttendanceDayEntry,
} from './attendance';

const emptyEntry = (): AttendanceDayEntry => ({
  clockIn: '',
  clockOut: '',
  shiftId: '',
  scheduledHours: '',
});

describe('attendance calculations', () => {
  it('calculates a running month-to-date total from 15 complete attendance days', () => {
    const shift = { id: 'day', name: 'Day shift', start: '09:00', end: '17:00' };
    const entries = Object.fromEntries(
      Array.from({ length: 30 }, (_, index) => [
        `2026-11-${String(index + 1).padStart(2, '0')}`,
        {
          ...emptyEntry(),
          ...(index < 15 ? { clockIn: '09:00', clockOut: '16:30' } : {}),
          shiftId: shift.id,
        },
      ]),
    );

    const summary = calculateAttendanceSummary(entries, [shift], 'shift', '2026-11-15');

    expect(summary).toEqual({
      scheduledMinutes: 30 * 8 * 60,
      workedMinutes: 15 * 7.5 * 60,
      scheduledToDateMinutes: 15 * 8 * 60,
      workedToDateMinutes: 15 * 7.5 * 60,
      overtimeMinutes: 0,
      shortfallMinutes: 15 * 30,
      scheduledDays: 30,
      workedDays: 15,
      pendingDays: 0,
      comparedDays: 15,
      incompleteDays: 0,
    });
  });

  it('supports overnight work and reports overtime separately from shortfall', () => {
    const shift = { id: 'night', name: 'Night shift', start: '22:00', end: '06:00' };
    const entries = {
      '2026-11-01': { ...emptyEntry(), clockIn: '21:30', clockOut: '06:00', shiftId: shift.id },
      '2026-11-02': { ...emptyEntry(), clockIn: '22:00', clockOut: '05:30', shiftId: shift.id },
    };

    const summary = calculateAttendanceSummary(entries, [shift], 'shift', '2026-11-02');

    expect(durationMinutes('22:00', '06:00')).toBe(8 * 60);
    expect(summary.scheduledMinutes).toBe(16 * 60);
    expect(summary.workedMinutes).toBe(16 * 60);
    expect(summary.scheduledToDateMinutes).toBe(16 * 60);
    expect(summary.workedToDateMinutes).toBe(16 * 60);
    expect(summary.overtimeMinutes).toBe(30);
    expect(summary.shortfallMinutes).toBe(30);
    expect(summary.pendingDays).toBe(0);
  });

  it('uses manually entered scheduled hours, counts past missed shifts, and skips today and incomplete entries', () => {
    const entries = {
      '2026-11-02': { ...emptyEntry(), clockIn: '09:00', clockOut: '17:00', scheduledHours: '7.5' },
      '2026-11-03': { ...emptyEntry(), clockIn: '09:00', scheduledHours: '8' },
      '2026-11-04': { ...emptyEntry(), scheduledHours: '8' },
      '2026-11-05': { ...emptyEntry(), clockIn: '09:00', clockOut: '18:00' },
      '2026-11-06': { ...emptyEntry(), scheduledHours: '8' },
      '2026-11-07': { ...emptyEntry(), scheduledHours: '8' },
    };

    const summary = calculateAttendanceSummary(entries, [], 'hours', '2026-11-06');

    expect(summary).toEqual({
      scheduledMinutes: 7.5 * 60 + 4 * 8 * 60,
      workedMinutes: 17 * 60,
      scheduledToDateMinutes: 7.5 * 60 + 3 * 8 * 60,
      workedToDateMinutes: 17 * 60,
      overtimeMinutes: 30,
      shortfallMinutes: 0,
      scheduledDays: 5,
      workedDays: 2,
      pendingDays: 1,
      comparedDays: 1,
      incompleteDays: 1,
    });
  });

  it('formats durations and generates every date in the selected month', () => {
    expect(formatDuration(450)).toBe('7h 30m');
    expect(getMonthDates('2028-02')).toHaveLength(29);
    expect(getMonthDates('2026-13')).toEqual([]);
  });

  it('validates saved attendance data before loading it', () => {
    expect(parseAttendanceStore(JSON.stringify(emptyAttendanceStore()))).toEqual(emptyAttendanceStore());
    expect(() => parseAttendanceStore('{broken')).toThrow('has not been overwritten');
    expect(() => parseAttendanceStore('{"version":2}')).toThrow('unsupported format');
  });
});
