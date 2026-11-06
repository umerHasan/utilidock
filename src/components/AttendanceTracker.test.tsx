import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { AttendanceTracker } from './AttendanceTracker';
import { getMonthDates, parseAttendanceStore, STORAGE_KEY } from '@/lib/attendance';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

describe('attendance tracker', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows every date and updates a mid-month hours comparison immediately', async () => {
    const user = userEvent.setup();
    const view = render(<AttendanceTracker />);

    await screen.findByRole('region', { name: 'Monthly summary' });
    const month = currentMonth();
    const firstDate = `${month}-01`;
    fireEvent.change(screen.getByLabelText('Attendance month'), { target: { value: month } });
    expect(screen.getAllByRole('row')).toHaveLength(getMonthDates(month).length + 1);

    await user.click(screen.getByRole('radio', { name: 'Scheduled hours' }));
    fireEvent.change(screen.getByLabelText(`Scheduled hours for ${firstDate}`), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(`Clock in for ${firstDate}`), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText(`Clock out for ${firstDate}`), { target: { value: '15:30' } });

    const summary = within(screen.getByRole('region', { name: 'Monthly summary' }));
    await waitFor(() => expect(summary.getByText('1 scheduled day checked so far')).toBeInTheDocument());
    expect(summary.getAllByText('7h 00m')).toHaveLength(2);
    expect(summary.getByText('6h 30m')).toBeInTheDocument();
    expect(summary.getByText('0h 30m')).toBeInTheDocument();
    expect(summary.getByText('Potential deduction hours')).toBeInTheDocument();

    await waitFor(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      expect(saved).not.toBeNull();
      expect(parseAttendanceStore(saved ?? '').months[month].entries[firstDate].scheduledHours).toBe('7');
    });

    view.unmount();
    render(<AttendanceTracker />);
    await screen.findByRole('region', { name: 'Monthly summary' });
    fireEvent.change(screen.getByLabelText('Attendance month'), { target: { value: month } });
    await waitFor(() => {
      expect(screen.getByLabelText(`Clock in for ${firstDate}`)).toHaveValue('09:00');
      expect(within(screen.getByRole('region', { name: 'Monthly summary' })).getByText('1 scheduled day checked so far')).toBeInTheDocument();
    });
  });

  it('applies a saved shift across the month and defaults it in later months', async () => {
    const user = userEvent.setup();
    render(<AttendanceTracker />);
    await screen.findByRole('region', { name: 'Monthly summary' });
    const month = currentMonth();
    const firstDate = `${month}-01`;
    fireEvent.change(screen.getByLabelText('Attendance month'), { target: { value: month } });

    await user.click(screen.getByRole('button', { name: 'Add shift' }));
    await user.type(screen.getByLabelText('Shift name'), 'Day shift');
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '17:00' } });
    await user.click(screen.getByRole('button', { name: 'Save shift' }));

    expect(screen.getByRole('combobox', { name: `Scheduled shift for ${firstDate}` })).toHaveDisplayValue('Day shift');
    fireEvent.change(screen.getByLabelText(`Clock in for ${firstDate}`), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText(`Clock out for ${firstDate}`), { target: { value: '16:30' } });

    const summary = within(screen.getByRole('region', { name: 'Monthly summary' }));
    await waitFor(() => expect(summary.getByText('7h 30m')).toBeInTheDocument());
    expect(summary.getByText(`${getMonthDates(month).length * 8}h 00m`)).toBeInTheDocument();
    expect(summary.getByText('Potential deduction hours')).toBeInTheDocument();

    const now = new Date();
    const nextMonth = now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;
    fireEvent.change(screen.getByLabelText('Attendance month'), { target: { value: nextMonth } });
    expect(screen.getByRole('combobox', { name: `Scheduled shift for ${nextMonth}-01` })).toHaveDisplayValue('Day shift');
  });
});
