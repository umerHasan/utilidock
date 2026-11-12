import { describe, expect, it } from 'vitest';
import {
  emptyInvestmentStore,
  getInvestmentTotals,
  getPortfolioTotals,
  parseInvestmentStore,
  type Investment,
} from './investments';

const firstInvestment: Investment = {
  id: 'index-fund',
  name: 'Index fund',
  contributions: [{ year: 2020, amount: 1000.25 }, { year: 2023, amount: 500.5 }],
  currentValue: 2000.75,
};

describe('investment tracking data', () => {
  it('calculates exact per-investment and portfolio profit totals', () => {
    const secondInvestment: Investment = {
      id: 'savings',
      name: 'Savings',
      contributions: [{ year: 2022, amount: 250 }],
      currentValue: 225,
    };
    expect(getInvestmentTotals(firstInvestment)).toEqual({
      invested: 1500.75,
      currentValue: 2000.75,
      profit: 500,
    });
    expect(getPortfolioTotals([firstInvestment, secondInvestment])).toEqual({
      invested: 1750.75,
      currentValue: 2225.75,
      profit: 475,
    });
    expect(getPortfolioTotals([])).toEqual({ invested: 0, currentValue: 0, profit: 0 });
  });

  it('reads supported JSON and rejects invalid imports without returning partial data', () => {
    const store = { ...emptyInvestmentStore(), investments: [firstInvestment] };
    expect(parseInvestmentStore(JSON.stringify(store))).toEqual(store);
    expect(() => parseInvestmentStore('{')).toThrow(/could not be read/);
    expect(() => parseInvestmentStore(JSON.stringify({
      ...store,
      investments: [{ ...firstInvestment, contributions: [...firstInvestment.contributions, { year: 2023, amount: 10 }] }],
    }))).toThrow(/invalid format/);
    expect(() => parseInvestmentStore(JSON.stringify({ ...store, currency: 'USD' }))).toThrow(/invalid format/);
  });
});
