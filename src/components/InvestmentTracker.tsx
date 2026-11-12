'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Download, Minus, Plus, TrendingUp, Upload } from 'lucide-react';
import {
  emptyInvestmentStore,
  getInvestmentTotals,
  getPortfolioTotals,
  INVESTMENT_STORAGE_KEY,
  parseInvestmentStore,
  type Investment,
} from '@/lib/investments';

const currencyFormatter = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  currencyDisplay: 'code',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(amount: number) {
  return currencyFormatter.format(amount);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected browser storage error occurred.';
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('The selected file could not be read as text.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('The selected file could not be read.'));
    reader.readAsText(file);
  });
}

function CurrencyInput({ investment, onSave }: { investment: Investment; onSave: (amount: number) => void }) {
  const [draft, setDraft] = useState(investment.currentValue.toFixed(2));

  const commit = () => {
    const value = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(value) || value < 0) {
      setDraft(investment.currentValue.toFixed(2));
      return;
    }
    const amount = Math.round(value * 100) / 100;
    setDraft(amount.toFixed(2));
    onSave(amount);
  };

  return (
    <label className="investment-value-field">
      <span>Current value</span>
      <span className="investment-currency-input">
        <span>PKR</span>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          aria-label={`Current value for ${investment.name}`}
        />
      </span>
    </label>
  );
}

function AddContributionForm({
  years,
  onAdd,
}: {
  years: number[];
  onAdd: (year: number, amount: number) => string | null;
}) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isInteger(Number(year)) || Number(year) < 1900 || Number(year) > currentYear) {
      setError(`Choose a year from 1900 to ${currentYear}.`);
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    const message = onAdd(Number(year), Math.round(value * 100) / 100);
    if (message) {
      setError(message);
      return;
    }
    setAmount('');
    setError('');
  };

  return (
    <form className="investment-contribution-form" onSubmit={submit}>
      <label>
        Year
        <input
          type="number"
          min="1900"
          max={currentYear}
          step="1"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          aria-label="Contribution year"
          required
        />
      </label>
      <label>
        Amount (PKR)
        <input
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label="Contribution amount"
          placeholder="0.00"
          required
        />
      </label>
      <button type="submit" className="button button-secondary"><Plus size={14} /> Add year</button>
      {error && <p className="investment-inline-error" role="alert">{error}</p>}
      {years.length > 0 && <span className="visually-hidden">Recorded years: {years.join(', ')}</span>}
    </form>
  );
}

export function InvestmentTracker() {
  const [store, setStore] = useState(emptyInvestmentStore);
  const [initialized, setInitialized] = useState(false);
  const [canPersist, setCanPersist] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [investmentName, setInvestmentName] = useState('');
  const [formError, setFormError] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const idSequence = useRef(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(INVESTMENT_STORAGE_KEY);
        if (saved) setStore(parseInvestmentStore(saved));
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
      window.localStorage.setItem(INVESTMENT_STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      const message = `Your changes are not being saved in this browser. ${getErrorMessage(error)}`;
      window.setTimeout(() => {
        setCanPersist(false);
        setStorageError(message);
      }, 0);
    }
  }, [store, initialized, canPersist]);

  const totals = useMemo(() => getPortfolioTotals(store.investments), [store.investments]);

  const addInvestment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = investmentName.trim();
    if (!name) {
      setFormError('Enter an investment name.');
      return;
    }
    const investment: Investment = {
      id: `investment-${Date.now()}-${idSequence.current++}`,
      name,
      contributions: [],
      currentValue: 0,
    };
    setStore((current) => ({ ...current, investments: [...current.investments, investment] }));
    setInvestmentName('');
    setFormError('');
  };

  const updateInvestment = (id: string, update: Partial<Investment>) => {
    setStore((current) => ({
      ...current,
      investments: current.investments.map((investment) => investment.id === id
        ? { ...investment, ...update }
        : investment),
    }));
  };

  const addContribution = (investment: Investment, year: number, amount: number) => {
    if (investment.contributions.some((contribution) => contribution.year === year)) {
      return `A contribution for ${year} already exists.`;
    }
    updateInvestment(investment.id, {
      contributions: [...investment.contributions, { year, amount }].sort((a, b) => a.year - b.year),
    });
    return null;
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const imported = parseInvestmentStore(await readFileAsText(file));
      setStore(imported);
      setCanPersist(true);
      setStorageError('');
      setImportStatus(`Imported ${imported.investments.length} investment${imported.investments.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setImportStatus('');
      setStorageError(getErrorMessage(error));
    } finally {
      input.value = '';
    }
  };

  const exportJson = () => {
    const file = new Blob([`${JSON.stringify(store, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'utilidock-investments.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!initialized) {
    return <div className="investment-loading" role="status">Loading your investment data…</div>;
  }

  return (
    <div className="investment-workspace">
      {storageError && <p className="investment-alert" role="alert">{storageError}</p>}

      <section className="investment-summary" aria-label="Portfolio summary" aria-live="polite">
        <div className="investment-summary-heading">
          <div>
            <span className="eyebrow">PORTFOLIO OVERVIEW</span>
            <h2>Your investments</h2>
          </div>
          <div className="investment-data-actions">
            <label className="button button-secondary investment-import-button">
              <Upload size={15} /> Import JSON
              <input type="file" accept="application/json,.json" onChange={importJson} aria-label="Import investments from JSON" />
            </label>
            <button type="button" className="button button-secondary" onClick={exportJson}>
              <Download size={15} /> Export JSON
            </button>
          </div>
        </div>
        {importStatus && <p className="investment-import-status" role="status">{importStatus}</p>}
        <div className="investment-summary-grid">
          <div><span>Total invested</span><strong>{formatAmount(totals.invested)}</strong></div>
          <div><span>Current value</span><strong>{formatAmount(totals.currentValue)}</strong></div>
          <div className={totals.profit >= 0 ? 'investment-positive' : 'investment-negative'}>
            <span>Total profit / loss</span><strong>{formatAmount(totals.profit)}</strong>
          </div>
        </div>
        <p className="investment-summary-note">All amounts are in PKR. Profit or loss is current value minus all recorded yearly contributions.</p>
      </section>

      <section className="investment-panel" aria-labelledby="investment-list-heading">
        <div className="investment-panel-heading">
          <div>
            <span className="eyebrow">INVESTMENT RECORDS</span>
            <h2 id="investment-list-heading">Track each investment</h2>
            <p>Add each investment, record what you put in by year, and update its current total value.</p>
          </div>
          <form className="investment-add-form" onSubmit={addInvestment}>
            <label>
              <span className="visually-hidden">Investment name</span>
              <input
                type="text"
                value={investmentName}
                onChange={(event) => setInvestmentName(event.target.value)}
                aria-label="Investment name"
                placeholder="e.g. Mutual fund"
                maxLength={80}
                required
              />
            </label>
            <button type="submit" className="button button-primary"><Plus size={15} /> Add investment</button>
          </form>
        </div>
        {formError && <p className="investment-inline-error" role="alert">{formError}</p>}

        {store.investments.length === 0 ? (
          <div className="investment-empty">
            <span className="investment-empty-icon"><TrendingUp size={20} /></span>
            <strong>No investments yet</strong>
            <p>Add an investment to start recording contributions and tracking its value.</p>
          </div>
        ) : (
          <div className="investment-list">
            {store.investments.map((investment) => {
              const investmentTotals = getInvestmentTotals(investment);
              return (
                <article className="investment-card" key={investment.id} aria-label={investment.name}>
                  <div className="investment-card-heading">
                    <div className="investment-card-title">
                      <span className="investment-card-icon"><TrendingUp size={16} /></span>
                      <div><h3>{investment.name}</h3><span>{investment.contributions.length} contribution year{investment.contributions.length === 1 ? '' : 's'}</span></div>
                    </div>
                    <button
                      type="button"
                      className="investment-remove"
                      aria-label={`Remove ${investment.name}`}
                      onClick={() => setStore((current) => ({
                        ...current,
                        investments: current.investments.filter((entry) => entry.id !== investment.id),
                      }))}
                    >
                      <Minus size={16} />
                    </button>
                  </div>

                  <div className="investment-card-totals">
                    <div><span>Total invested</span><strong>{formatAmount(investmentTotals.invested)}</strong></div>
                    <div className={investmentTotals.profit >= 0 ? 'investment-positive' : 'investment-negative'}>
                      <span>Profit / loss</span><strong>{formatAmount(investmentTotals.profit)}</strong>
                    </div>
                    <CurrencyInput
                      key={`${investment.id}-${investment.currentValue}`}
                      investment={investment}
                      onSave={(currentValue) => updateInvestment(investment.id, { currentValue })}
                    />
                  </div>

                  <div className="investment-history">
                    <div className="investment-history-heading"><strong>Yearly contributions</strong><span>Amounts added in each year</span></div>
                    {investment.contributions.length > 0 ? (
                      <ul>
                        {investment.contributions.map((contribution) => (
                          <li key={contribution.year}>
                            <span>{contribution.year}</span>
                            <strong>{formatAmount(contribution.amount)}</strong>
                            <button
                              type="button"
                              className="investment-remove"
                              aria-label={`Remove ${contribution.year} contribution from ${investment.name}`}
                              onClick={() => updateInvestment(investment.id, {
                                contributions: investment.contributions.filter((entry) => entry.year !== contribution.year),
                              })}
                            >
                              <Minus size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="investment-no-history">No yearly contributions recorded.</p>
                    )}
                    <AddContributionForm
                      years={investment.contributions.map(({ year }) => year)}
                      onAdd={(year, amount) => addContribution(investment, year, amount)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <p className="investment-privacy"><TrendingUp size={14} /> Investment data is saved only in this browser and is not uploaded.</p>
      </section>
    </div>
  );
}
