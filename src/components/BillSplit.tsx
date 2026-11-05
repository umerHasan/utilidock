'use client';

import { useMemo, useRef, useState } from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import { calculateBillSplit, formatCents } from '@/lib/bill-split';

type ItemDraft = { id: string; name: string; amount: string };
type PersonDraft = { id: string; name: string; items: ItemDraft[] };
type ChargeDraft = { id: string; name: string; amount: string; split: 'equal' | 'proportional' };

function toNumber(value: string) {
  return value.trim() === '' ? 0 : Number(value);
}

export function BillSplit() {
  const [receiptTotal, setReceiptTotal] = useState('');
  const [people, setPeople] = useState<PersonDraft[]>([
    { id: 'person-1', name: 'Person 1', items: [{ id: 'item-1', name: '', amount: '' }] },
  ]);
  const [taxType, setTaxType] = useState<'percentage' | 'fixed'>('percentage');
  const [taxValue, setTaxValue] = useState('');
  const [charges, setCharges] = useState<ChargeDraft[]>([]);
  const sequence = useRef(2);

  const result = useMemo(() => calculateBillSplit({
    receiptTotal: toNumber(receiptTotal),
    people: people.map((person) => ({
      name: person.name,
      items: person.items.map((item) => ({ name: item.name, amount: toNumber(item.amount) })),
    })),
    tax: { type: taxType, value: toNumber(taxValue) },
    charges: charges.map((charge) => ({
      name: charge.name,
      amount: toNumber(charge.amount),
      split: charge.split,
    })),
  }), [receiptTotal, people, taxType, taxValue, charges]);

  const addPerson = () => {
    const id = sequence.current++;
    setPeople((current) => [...current, {
      id: `person-${id}`,
      name: `Person ${current.length + 1}`,
      items: [{ id: `item-${id}`, name: '', amount: '' }],
    }]);
  };

  const updatePerson = (personId: string, update: Partial<PersonDraft>) => {
    setPeople((current) => current.map((person) => person.id === personId ? { ...person, ...update } : person));
  };

  const addItem = (personId: string) => {
    const id = sequence.current++;
    setPeople((current) => current.map((person) => person.id === personId
      ? { ...person, items: [...person.items, { id: `item-${id}`, name: '', amount: '' }] }
      : person));
  };

  const updateItem = (personId: string, itemId: string, update: Partial<ItemDraft>) => {
    setPeople((current) => current.map((person) => person.id === personId
      ? { ...person, items: person.items.map((item) => item.id === itemId ? { ...item, ...update } : item) }
      : person));
  };

  const addCharge = () => {
    const id = sequence.current++;
    setCharges((current) => [...current, { id: `charge-${id}`, name: '', amount: '', split: 'equal' }]);
  };

  const updateCharge = (chargeId: string, update: Partial<ChargeDraft>) => {
    setCharges((current) => current.map((charge) => charge.id === chargeId ? { ...charge, ...update } : charge));
  };

  const differenceClass = result.differenceCents === 0 && result.issues.length === 0 ? 'balanced' : 'unbalanced';
  const differenceLabel = result.differenceCents === 0
    ? result.issues.length === 0 ? 'Matches receipt' : 'Match, but check split'
    : result.differenceCents > 0
      ? `${formatCents(result.differenceCents)} still to assign`
      : `${formatCents(Math.abs(result.differenceCents))} over receipt`;

  return (
    <div className="bill-workspace">
      <div className="bill-main">
        <section className="bill-section">
          <div className="bill-section-heading">
            <div>
              <span className="eyebrow">01 · RECEIPT</span>
              <h2>Start with the total</h2>
              <p>Enter the final amount shown on your receipt, including tax and extra charges.</p>
            </div>
          </div>
          <label className="bill-field bill-total-field">
            <span>Final receipt total</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={receiptTotal}
              onChange={(event) => setReceiptTotal(event.target.value)}
              aria-label="Final receipt total"
              placeholder="0.00"
            />
          </label>
        </section>

        <section className="bill-section">
          <div className="bill-section-heading">
            <div>
              <span className="eyebrow">02 · PEOPLE AND ITEMS</span>
              <h2>Who had what?</h2>
              <p>Add each person and as many items as needed.</p>
            </div>
            <button type="button" className="button button-secondary bill-add-button" onClick={addPerson}>
              <Users size={15} /> Add person
            </button>
          </div>

          <div className="bill-people">
            {people.map((person, personIndex) => (
              <section className="bill-person" key={person.id} aria-label={`Person ${personIndex + 1}`}>
                <div className="bill-person-heading">
                  <label className="bill-field bill-person-name">
                    <span>Person {personIndex + 1}</span>
                    <input
                      type="text"
                      value={person.name}
                      onChange={(event) => updatePerson(person.id, { name: event.target.value })}
                      aria-label={`Person ${personIndex + 1} name`}
                      placeholder={`Person ${personIndex + 1}`}
                    />
                  </label>
                  {people.length > 1 && (
                    <button
                      type="button"
                      className="bill-icon-button"
                      aria-label={`Remove ${person.name || `person ${personIndex + 1}`}`}
                      onClick={() => setPeople((current) => current.filter((entry) => entry.id !== person.id))}
                    >
                      <Minus size={16} />
                    </button>
                  )}
                </div>
                <div className="bill-items">
                  {person.items.map((item, itemIndex) => (
                    <div className="bill-item-row" key={item.id}>
                      <label className="bill-field bill-item-name">
                        {itemIndex === 0 && <span>Item</span>}
                        <input
                          type="text"
                          value={item.name}
                          onChange={(event) => updateItem(person.id, item.id, { name: event.target.value })}
                          aria-label={`Person ${personIndex + 1} item ${itemIndex + 1} name`}
                          placeholder="e.g. Lunch"
                        />
                      </label>
                      <label className="bill-field bill-item-amount">
                        {itemIndex === 0 && <span>Amount</span>}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={item.amount}
                          onChange={(event) => updateItem(person.id, item.id, { amount: event.target.value })}
                          aria-label={`Person ${personIndex + 1} item ${itemIndex + 1} amount`}
                          placeholder="0.00"
                        />
                      </label>
                      {person.items.length > 1 && (
                        <button
                          type="button"
                          className="bill-icon-button bill-item-remove"
                          aria-label={`Remove item ${itemIndex + 1} for person ${personIndex + 1}`}
                          onClick={() => updatePerson(person.id, {
                            items: person.items.filter((entry) => entry.id !== item.id),
                          })}
                        >
                          <Minus size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="bill-inline-button" onClick={() => addItem(person.id)}>
                  <Plus size={14} /> Add item
                </button>
              </section>
            ))}
          </div>
        </section>

        <section className="bill-section bill-tax-section">
          <div className="bill-section-heading">
            <div>
              <span className="eyebrow">03 · TAX</span>
              <h2>Add tax</h2>
              <p>Tax is always split in proportion to each person&apos;s item subtotal.</p>
            </div>
          </div>
          <div className="bill-tax-controls">
            <fieldset className="bill-tax-modes">
              <legend>Tax entry</legend>
              <label>
                <input type="radio" name="bill-tax-type" checked={taxType === 'percentage'} onChange={() => setTaxType('percentage')} />
                Percentage
              </label>
              <label>
                <input type="radio" name="bill-tax-type" checked={taxType === 'fixed'} onChange={() => setTaxType('fixed')} />
                Total tax amount
              </label>
            </fieldset>
            <label className="bill-field bill-tax-value">
              <span>{taxType === 'percentage' ? 'Tax percentage' : 'Total tax amount'}</span>
              <span className="bill-input-suffix">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={taxValue}
                  onChange={(event) => setTaxValue(event.target.value)}
                  aria-label={taxType === 'percentage' ? 'Tax percentage' : 'Total tax amount'}
                  placeholder="0"
                />
                <span>{taxType === 'percentage' ? '%' : 'amount'}</span>
              </span>
            </label>
          </div>
        </section>

        <section className="bill-section bill-charges-section">
          <div className="bill-section-heading">
            <div>
              <span className="eyebrow">04 · EXTRA CHARGES</span>
              <h2>Anything else?</h2>
              <p>Add delivery, service, or other charges and choose how each one is split.</p>
            </div>
            <button type="button" className="button button-secondary bill-add-button" onClick={addCharge}>
              <Plus size={15} /> Add charge
            </button>
          </div>
          {charges.length === 0 ? (
            <p className="bill-empty-charges">No extra charges added.</p>
          ) : (
            <div className="bill-charges">
              {charges.map((charge, index) => (
                <div className="bill-charge-row" key={charge.id}>
                  <label className="bill-field bill-charge-name">
                    <span>{index === 0 ? 'Charge' : `Charge ${index + 1}`}</span>
                    <input
                      type="text"
                      value={charge.name}
                      onChange={(event) => updateCharge(charge.id, { name: event.target.value })}
                      aria-label={`Charge ${index + 1} name`}
                      placeholder="e.g. Delivery"
                    />
                  </label>
                  <label className="bill-field bill-charge-amount">
                    <span>Amount</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={charge.amount}
                      onChange={(event) => updateCharge(charge.id, { amount: event.target.value })}
                      aria-label={`Charge ${index + 1} amount`}
                      placeholder="0.00"
                    />
                  </label>
                  <label className="bill-field bill-charge-split">
                    <span>Split</span>
                    <select
                      value={charge.split}
                      onChange={(event) => updateCharge(charge.id, {
                        split: event.target.value === 'proportional' ? 'proportional' : 'equal',
                      })}
                      aria-label={`How to split charge ${index + 1}`}
                    >
                      <option value="equal">Equally</option>
                      <option value="proportional">By item subtotal</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="bill-icon-button bill-charge-remove"
                    aria-label={`Remove charge ${index + 1}`}
                    onClick={() => setCharges((current) => current.filter((entry) => entry.id !== charge.id))}
                  >
                    <Minus size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="bill-summary" aria-live="polite">
        <span className="eyebrow">YOUR SPLIT</span>
        <h2>Amount per person</h2>
        <p className="bill-summary-note">Tax follows item subtotals. Extra charges use the split method selected for each one.</p>
        <div className="bill-summary-totals">
          <div><span>Items</span><strong>{formatCents(result.subtotalCents)}</strong></div>
          <div><span>Tax</span><strong>{formatCents(result.taxCents)}</strong></div>
          <div><span>Extra charges</span><strong>{formatCents(result.chargesCents)}</strong></div>
          <div className="bill-calculated-total"><span>Calculated total</span><strong>{formatCents(result.calculatedTotalCents)}</strong></div>
          <div><span>Receipt total</span><strong>{formatCents(result.receiptTotalCents)}</strong></div>
        </div>
        <p className={`bill-difference ${differenceClass}`}>
          <span>Reconciliation</span>
          <strong>{differenceLabel}</strong>
        </p>
        <div className="bill-person-totals">
          {result.people.map((person, index) => (
            <div className="bill-person-total" key={`${person.name}-${index}`} role="group" aria-label={`${person.name} split total`}>
              <div><strong>{person.name}</strong><b>{formatCents(person.totalCents)}</b></div>
              <small>Items {formatCents(person.subtotalCents)} · Tax {formatCents(person.taxCents)} · Charges {formatCents(person.chargesCents)}</small>
            </div>
          ))}
        </div>
        {result.issues.length > 0 && (
          <ul className="bill-issues" role="alert">
            {result.issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        )}
      </aside>
    </div>
  );
}
