export type InvestmentContribution = {
  year: number;
  amount: number;
};

export type Investment = {
  id: string;
  name: string;
  contributions: InvestmentContribution[];
  currentValue: number;
};

export type InvestmentStore = {
  version: 1;
  currency: 'PKR';
  investments: Investment[];
};

export type InvestmentTotals = {
  invested: number;
  currentValue: number;
  profit: number;
};

export const INVESTMENT_STORAGE_KEY = 'utilidock.investments.v1';

export function emptyInvestmentStore(): InvestmentStore {
  return { version: 1, currency: 'PKR', investments: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAmount(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
  const minorUnits = value * 100;
  return Number.isSafeInteger(Math.round(minorUnits))
    && Math.abs(minorUnits - Math.round(minorUnits)) < 1e-8;
}

function isContribution(value: unknown): value is InvestmentContribution {
  return isRecord(value)
    && typeof value.year === 'number'
    && Number.isInteger(value.year)
    && value.year >= 1900
    && value.year <= new Date().getFullYear()
    && isAmount(value.amount);
}

function isInvestment(value: unknown): value is Investment {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || !value.id
    || typeof value.name !== 'string'
    || !value.name.trim()
    || value.name.length > 80
    || !isAmount(value.currentValue)
    || !Array.isArray(value.contributions)
    || !value.contributions.every(isContribution)) {
    return false;
  }
  return new Set(value.contributions.map((contribution) => contribution.year)).size === value.contributions.length;
}

function isInvestmentStore(value: unknown): value is InvestmentStore {
  return isRecord(value)
    && value.version === 1
    && value.currency === 'PKR'
    && Array.isArray(value.investments)
    && value.investments.every(isInvestment)
    && new Set(value.investments.map((investment) => investment.id)).size === value.investments.length;
}

export function parseInvestmentStore(serialized: string): InvestmentStore {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new Error('Investment data could not be read as JSON. Your existing data has not been changed.');
  }
  if (!isInvestmentStore(value)) {
    throw new Error('Investment data has an unsupported or invalid format. Your existing data has not been changed.');
  }
  return value;
}

function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

function fromMinorUnits(amount: number) {
  return amount / 100;
}

export function getInvestmentTotals(investment: Investment): InvestmentTotals {
  const invested = investment.contributions.reduce((sum, contribution) => sum + toMinorUnits(contribution.amount), 0);
  const currentValue = toMinorUnits(investment.currentValue);
  return {
    invested: fromMinorUnits(invested),
    currentValue: fromMinorUnits(currentValue),
    profit: fromMinorUnits(currentValue - invested),
  };
}

export function getPortfolioTotals(investments: Investment[]): InvestmentTotals {
  const totals = investments.reduce((sum, investment) => {
    const investmentTotals = getInvestmentTotals(investment);
    return {
      invested: sum.invested + toMinorUnits(investmentTotals.invested),
      currentValue: sum.currentValue + toMinorUnits(investmentTotals.currentValue),
    };
  }, { invested: 0, currentValue: 0 });
  return {
    invested: fromMinorUnits(totals.invested),
    currentValue: fromMinorUnits(totals.currentValue),
    profit: fromMinorUnits(totals.currentValue - totals.invested),
  };
}
