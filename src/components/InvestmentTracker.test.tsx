import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { InvestmentTracker } from './InvestmentTracker';
import { INVESTMENT_STORAGE_KEY, parseInvestmentStore } from '@/lib/investments';

describe('investment tracker', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adds historical contribution years and calculates investment and portfolio profit', async () => {
    const user = userEvent.setup();
    render(<InvestmentTracker />);
    const summary = within(await screen.findByRole('region', { name: 'Portfolio summary' }));

    await user.type(screen.getByLabelText('Investment name'), 'Mutual fund');
    await user.click(screen.getByRole('button', { name: 'Add investment' }));
    fireEvent.change(screen.getByLabelText('Contribution year'), { target: { value: '2020' } });
    await user.type(screen.getByLabelText('Contribution amount'), '1000.25');
    await user.click(screen.getByRole('button', { name: 'Add year' }));
    fireEvent.change(screen.getByLabelText('Contribution year'), { target: { value: '2023' } });
    await user.type(screen.getByLabelText('Contribution amount'), '500.50');
    await user.click(screen.getByRole('button', { name: 'Add year' }));
    fireEvent.change(screen.getByLabelText('Current value for Mutual fund'), { target: { value: '2000.75' } });
    fireEvent.blur(screen.getByLabelText('Current value for Mutual fund'));

    await waitFor(() => {
      expect(summary.getByText(/1,500\.75/)).toBeInTheDocument();
      expect(summary.getByText(/500\.00/)).toBeInTheDocument();
      expect(window.localStorage.getItem(INVESTMENT_STORAGE_KEY)).not.toBeNull();
    });
    const saved = parseInvestmentStore(window.localStorage.getItem(INVESTMENT_STORAGE_KEY) ?? '');
    expect(saved.investments[0].contributions).toEqual([
      { year: 2020, amount: 1000.25 },
      { year: 2023, amount: 500.5 },
    ]);
  });

  it('rejects duplicate contribution years without changing totals', async () => {
    const user = userEvent.setup();
    render(<InvestmentTracker />);
    await screen.findByRole('region', { name: 'Portfolio summary' });

    await user.type(screen.getByLabelText('Investment name'), 'Property');
    await user.click(screen.getByRole('button', { name: 'Add investment' }));
    fireEvent.change(screen.getByLabelText('Contribution year'), { target: { value: '2022' } });
    await user.type(screen.getByLabelText('Contribution amount'), '300');
    await user.click(screen.getByRole('button', { name: 'Add year' }));
    fireEvent.change(screen.getByLabelText('Contribution amount'), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: 'Add year' }));

    expect(screen.getByRole('alert')).toHaveTextContent('A contribution for 2022 already exists.');
    expect(window.localStorage.getItem(INVESTMENT_STORAGE_KEY)).not.toBeNull();
    await waitFor(() => expect(parseInvestmentStore(window.localStorage.getItem(INVESTMENT_STORAGE_KEY) ?? '').investments[0].contributions).toHaveLength(1));
  });

  it('imports valid JSON and leaves saved records untouched when an import is invalid', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(INVESTMENT_STORAGE_KEY, 'invalid saved data');
    render(<InvestmentTracker />);
    await screen.findByRole('region', { name: 'Portfolio summary' });
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be read as JSON');
    const input = screen.getByLabelText('Import investments from JSON');
    const imported = {
      version: 1,
      currency: 'PKR',
      investments: [{
        id: 'savings',
        name: 'Savings',
        contributions: [{ year: 2021, amount: 800 }],
        currentValue: 950,
      }],
    };

    await user.upload(input, new File([JSON.stringify(imported)], 'portfolio.json', { type: 'application/json' }));
    await screen.findByRole('article', { name: 'Savings' });
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    await waitFor(() => expect(parseInvestmentStore(window.localStorage.getItem(INVESTMENT_STORAGE_KEY) ?? '')).toEqual(imported));

    await user.upload(input, new File(['not json'], 'broken.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be read as JSON');
    expect(parseInvestmentStore(window.localStorage.getItem(INVESTMENT_STORAGE_KEY) ?? '')).toEqual(imported);
  });
});
