'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Clock3, Minus, Plus } from 'lucide-react';
import {
  calculateAttendanceSummary,
  durationMinutes,
  emptyAttendanceStore,
  formatDuration,
  getMonthDates,
  parseAttendanceStore,
  STORAGE_KEY,
  type AttendanceDayEntry,
  type AttendanceMonth,
  type AttendanceShift,
  type ScheduleMode,
} from '@/lib/attendance';

const emptyEntry = (): AttendanceDayEntry => ({
  clockIn: '',
  clockOut: '',
  shiftId: '',
  scheduledHours: '',
});

function currentMonthValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function currentDateValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected browser storage error occurred.';
}

function formatDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getScheduledMinutes(entry: AttendanceDayEntry, month: AttendanceMonth, shifts: AttendanceShift[]) {
  if (month.mode === 'shift') {
    const shift = shifts.find((item) => item.id === entry.shiftId);
    return shift ? durationMinutes(shift.start, shift.end) : null;
  }
  if (!entry.scheduledHours.trim()) return null;
  const hours = Number(entry.scheduledHours);
  return Number.isFinite(hours) && hours >= 0 ? Math.round(hours * 60) : null;
}

export function AttendanceTracker() {
  const [month, setMonth] = useState('');
  const [store, setStore] = useState(emptyAttendanceStore);
  const [initialized, setInitialized] = useState(false);
  const [canPersist, setCanPersist] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [shiftError, setShiftError] = useState('');
  const [bulkShiftId, setBulkShiftId] = useState('');
  const shiftSequence = useRef(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMonth(currentMonthValue());
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setStore(parseAttendanceStore(saved));
      } catch (error) {
        setCanPersist(false);
        setStorageError(getErrorMessage(error));
      }
      setInitialized(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!initialized || !canPersist) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      const message = `Your changes are not being saved in this browser. ${getErrorMessage(error)}`;
      window.setTimeout(() => {
        setCanPersist(false);
        setStorageError(message);
      }, 0);
    }
  }, [store, initialized, canPersist]);

  const dates = useMemo(() => getMonthDates(month), [month]);
  const monthData = useMemo(
    () => store.months[month] ?? {
      mode: 'shift' as const,
      entries: store.defaultShiftId
        ? Object.fromEntries(dates.map((date) => [date, { ...emptyEntry(), shiftId: store.defaultShiftId }]))
        : {},
    },
    [store.months, store.defaultShiftId, month, dates],
  );
  const asOfDate = currentDateValue();
  const summary = useMemo(
    () => calculateAttendanceSummary(monthData.entries, store.shifts, monthData.mode, asOfDate),
    [monthData, store.shifts, asOfDate],
  );

  const updateMonth = (update: (current: AttendanceMonth) => AttendanceMonth) => {
    setStore((current) => {
      const currentMonth = current.months[month] ?? {
        mode: 'shift' as const,
        entries: current.defaultShiftId
          ? Object.fromEntries(getMonthDates(month).map((date) => [date, { ...emptyEntry(), shiftId: current.defaultShiftId }]))
          : {},
      };
      return {
        ...current,
        months: { ...current.months, [month]: update(currentMonth) },
      };
    });
  };

  const updateEntry = (date: string, update: Partial<AttendanceDayEntry>) => {
    updateMonth((current) => ({
      ...current,
      entries: {
        ...current.entries,
        [date]: { ...emptyEntry(), ...current.entries[date], ...update },
      },
    }));
  };

  const changeMode = (mode: ScheduleMode) => {
    updateMonth((current) => ({ ...current, mode }));
  };

  const addShift = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = shiftName.trim();
    if (!name || !shiftStart || !shiftEnd) return;
    if (shiftStart === shiftEnd) {
      setShiftError('Shift start and end times must be different.');
      return;
    }
    if (store.shifts.some((shift) => shift.name.toLowerCase() === name.toLowerCase())) {
      setShiftError('A shift with this name already exists.');
      return;
    }

    const newShift: AttendanceShift = {
      id: `shift-${Date.now()}-${shiftSequence.current++}`,
      name,
      start: shiftStart,
      end: shiftEnd,
    };
    setStore((current) => {
      const currentMonth = current.months[month] ?? {
        mode: 'shift' as const,
        entries: current.defaultShiftId
          ? Object.fromEntries(getMonthDates(month).map((date) => [date, { ...emptyEntry(), shiftId: current.defaultShiftId }]))
          : {},
      };
      const entries = currentMonth.mode === 'shift'
        ? Object.fromEntries(getMonthDates(month).map((date) => [
          date,
          { ...emptyEntry(), ...currentMonth.entries[date], shiftId: currentMonth.entries[date]?.shiftId || newShift.id },
        ]))
        : currentMonth.entries;
      return {
        ...current,
        shifts: [...current.shifts, newShift],
        defaultShiftId: newShift.id,
        months: { ...current.months, [month]: { ...currentMonth, entries } },
      };
    });
    setShiftName('');
    setShiftStart('');
    setShiftEnd('');
    setShiftError('');
    setShowShiftForm(false);
  };

  const removeShift = (shiftId: string) => {
    const used = Object.values(store.months).some((savedMonth) =>
      savedMonth.mode === 'shift' && Object.values(savedMonth.entries).some((entry) => entry.shiftId === shiftId),
    );
    if (used) {
      setShiftError('This shift is assigned to attendance entries. Change those assignments before removing it.');
      return;
    }
    setStore((current) => {
      const shifts = current.shifts.filter((shift) => shift.id !== shiftId);
      return {
        ...current,
        shifts,
        defaultShiftId: current.defaultShiftId === shiftId ? shifts.at(-1)?.id : current.defaultShiftId,
      };
    });
    setShiftError('');
  };

  const applyShiftToSelected = () => {
    if (!bulkShiftId || selectedDates.size === 0) return;
    updateMonth((current) => ({
      ...current,
      entries: {
        ...current.entries,
        ...Object.fromEntries([...selectedDates].map((date) => [
          date,
          { ...emptyEntry(), ...current.entries[date], shiftId: bulkShiftId },
        ])),
      },
    }));
    setSelectedDates(new Set());
    setBulkShiftId('');
  };

  if (!initialized) {
    return <div className="attendance-loading" role="status">Loading your attendance data…</div>;
  }

  return (
    <div className="attendance-workspace">
      {storageError && <p className="attendance-alert" role="alert">{storageError}</p>}

      <section className="attendance-summary" aria-label="Monthly summary" aria-live="polite">
        <div className="attendance-summary-heading">
          <div>
            <span className="eyebrow">MONTHLY PAYROLL CHECK</span>
            <h2>Monthly statistics</h2>
          </div>
          <p>{summary.comparedDays} scheduled day{summary.comparedDays === 1 ? '' : 's'} checked so far</p>
        </div>
        <div className="attendance-summary-grid">
          <div><span>Scheduled this month</span><strong>{formatDuration(summary.scheduledMinutes)}</strong><small>{summary.scheduledDays} scheduled days</small></div>
          <div><span>Worked this month</span><strong>{formatDuration(summary.workedMinutes)}</strong><small>{summary.workedDays} complete days</small></div>
          <div><span>Scheduled through today</span><strong>{formatDuration(summary.scheduledToDateMinutes)}</strong><small>Expected by now</small></div>
          <div><span>Still scheduled</span><strong>{formatDuration(Math.max(0, summary.scheduledMinutes - summary.scheduledToDateMinutes))}</strong><small>Remaining this month</small></div>
          <div className="attendance-positive"><span>Overtime so far</span><strong>{formatDuration(summary.overtimeMinutes)}</strong><small>On checked days</small></div>
          <div className="attendance-negative"><span>Shortfall so far</span><strong>{formatDuration(summary.shortfallMinutes)}</strong><small>Potential deduction hours</small></div>
          <div><span>Past entries pending</span><strong>{summary.pendingDays}</strong><small>Scheduled days not entered</small></div>
        </div>
        <p className="attendance-summary-note">
          Totals update as you enter attendance. Only completed time entries count toward shortfall or overtime; past days without entries stay pending, not assumed absent. Clear the shift on days off.
          {summary.incompleteDays > 0 && ` ${summary.incompleteDays} incomplete ${summary.incompleteDays === 1 ? 'entry needs' : 'entries need'} both clock times.`}
        </p>
      </section>

      <section className="attendance-panel" aria-labelledby="attendance-month-heading">
        <div className="attendance-panel-heading">
          <div>
            <span className="eyebrow">MONTHLY ATTENDANCE</span>
            <h2 id="attendance-month-heading">Enter your daily hours</h2>
            <p>Every date is listed. Your default shift is applied across the month; clear it on days off.</p>
          </div>
          <label className="attendance-month-field">
            <span>Attendance month</span>
            <input
              type="month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setSelectedDates(new Set());
              }}
            />
          </label>
        </div>

        <fieldset className="attendance-mode">
          <legend>Schedule by</legend>
          <label>
            <input type="radio" name="attendance-mode" checked={monthData.mode === 'shift'} onChange={() => changeMode('shift')} />
            Shift
          </label>
          <label>
            <input type="radio" name="attendance-mode" checked={monthData.mode === 'hours'} onChange={() => changeMode('hours')} />
            Scheduled hours
          </label>
        </fieldset>

        <div className="attendance-shifts">
          <div className="attendance-shifts-heading">
            <div>
              <strong>Saved shifts</strong>
              <span>Reusable start and end times, including overnight shifts.</span>
            </div>
            <button type="button" className="button button-secondary" onClick={() => {
              setShowShiftForm((visible) => !visible);
              setShiftError('');
            }}>
              <Plus size={15} /> Add shift
            </button>
          </div>
          {store.shifts.length > 0 && (
            <ul className="attendance-shift-list">
              {store.shifts.map((shift) => {
                const minutes = durationMinutes(shift.start, shift.end) ?? 0;
                return (
                  <li key={shift.id}>
                    <span><strong>{shift.name}</strong><small>{shift.start}–{shift.end} · {formatDuration(minutes)}</small></span>
                    <button type="button" className="attendance-remove" aria-label={`Remove ${shift.name}`} onClick={() => removeShift(shift.id)}>
                      <Minus size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {showShiftForm && (
            <form className="attendance-shift-form" onSubmit={addShift}>
              <label>
                Shift name
                <input type="text" value={shiftName} onChange={(event) => setShiftName(event.target.value)} required maxLength={40} placeholder="e.g. Morning shift" />
              </label>
              <label>
                Start time
                <input type="time" value={shiftStart} onChange={(event) => setShiftStart(event.target.value)} required />
              </label>
              <label>
                End time
                <input type="time" value={shiftEnd} onChange={(event) => setShiftEnd(event.target.value)} required />
              </label>
              <div className="attendance-shift-form-actions">
                <button type="button" className="text-button" onClick={() => setShowShiftForm(false)}>Cancel</button>
                <button type="submit" className="button button-primary"><Plus size={14} /> Save shift</button>
              </div>
            </form>
          )}
          {shiftError && <p className="attendance-inline-error" role="alert">{shiftError}</p>}
        </div>

        {monthData.mode === 'shift' && store.shifts.length === 0 && (
          <p className="attendance-empty-shifts"><Clock3 size={15} /> Add a shift above, or switch to scheduled hours to enter hours directly.</p>
        )}

        {monthData.mode === 'shift' && selectedDates.size > 0 && store.shifts.length > 0 && (
          <div className="attendance-bulk" role="group" aria-label="Apply a shift to selected dates">
            <span>{selectedDates.size} date{selectedDates.size === 1 ? '' : 's'} selected</span>
            <label>
              <span className="visually-hidden">Shift for selected dates</span>
              <select aria-label="Shift for selected dates" value={bulkShiftId} onChange={(event) => setBulkShiftId(event.target.value)}>
                <option value="">Choose a shift</option>
                {store.shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
              </select>
            </label>
            <button type="button" className="button button-secondary" onClick={applyShiftToSelected} disabled={!bulkShiftId}>
              Apply to selected
            </button>
          </div>
        )}

        <div className="attendance-table-wrap">
          <table className="attendance-table">
            <thead>
              <tr>
                <th scope="col"><span className="visually-hidden">Select date</span></th>
                <th scope="col">Date</th>
                <th scope="col">{monthData.mode === 'shift' ? 'Scheduled shift' : 'Scheduled hours'}</th>
                <th scope="col">Clock in</th>
                <th scope="col">Clock out</th>
                <th scope="col">Worked</th>
                <th scope="col">Difference</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => {
                const entry = { ...emptyEntry(), ...monthData.entries[date] };
                const scheduleMinutes = getScheduledMinutes(entry, monthData, store.shifts);
                const workedMinutes = entry.clockIn && entry.clockOut ? durationMinutes(entry.clockIn, entry.clockOut) : null;
                const difference = scheduleMinutes !== null && workedMinutes !== null ? workedMinutes - scheduleMinutes : null;
                const shift = store.shifts.find((item) => item.id === entry.shiftId);

                return (
                  <tr key={date}>
                    <td className="attendance-select-cell">
                      <input
                        type="checkbox"
                        checked={selectedDates.has(date)}
                        onChange={(event) => {
                          setSelectedDates((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(date);
                            else next.delete(date);
                            return next;
                          });
                        }}
                        aria-label={`Select ${date}`}
                      />
                    </td>
                    <th scope="row"><time dateTime={date}>{formatDay(date)}</time></th>
                    <td>
                      {monthData.mode === 'shift' ? (
                        <>
                          <select
                            aria-label={`Scheduled shift for ${date}`}
                            value={entry.shiftId}
                            onChange={(event) => updateEntry(date, { shiftId: event.target.value })}
                          >
                            <option value="">No shift</option>
                            {store.shifts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                          {shift && <small className="attendance-schedule-detail">{shift.start}–{shift.end} · {formatDuration(scheduleMinutes ?? 0)}</small>}
                        </>
                      ) : (
                        <label className="attendance-hours-field">
                          <span className="visually-hidden">Scheduled hours for {date}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            inputMode="decimal"
                            value={entry.scheduledHours}
                            onChange={(event) => updateEntry(date, { scheduledHours: event.target.value })}
                            aria-label={`Scheduled hours for ${date}`}
                            placeholder="e.g. 8"
                          />
                          <span>hours</span>
                        </label>
                      )}
                    </td>
                    <td>
                      <label>
                        <span className="visually-hidden">Clock in for {date}</span>
                        <input type="time" value={entry.clockIn} onChange={(event) => updateEntry(date, { clockIn: event.target.value })} aria-label={`Clock in for ${date}`} />
                      </label>
                    </td>
                    <td>
                      <label>
                        <span className="visually-hidden">Clock out for {date}</span>
                        <input type="time" value={entry.clockOut} onChange={(event) => updateEntry(date, { clockOut: event.target.value })} aria-label={`Clock out for ${date}`} />
                      </label>
                    </td>
                    <td>{workedMinutes === null ? <span className="attendance-muted">—</span> : formatDuration(workedMinutes)}</td>
                    <td>
                      {difference === null ? (
                        entry.clockIn || entry.clockOut ? <span className="attendance-muted">Incomplete</span> : <span className="attendance-muted">—</span>
                      ) : difference > 0 ? (
                        <span className="attendance-positive">+{formatDuration(difference)}</span>
                      ) : difference < 0 ? (
                        <span className="attendance-negative">−{formatDuration(Math.abs(difference))}</span>
                      ) : (
                        <span className="attendance-muted">On schedule</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="attendance-privacy"><Clock3 size={14} /> Attendance and shifts are saved only in this browser; they are not uploaded.</p>
      </section>
    </div>
  );
}
