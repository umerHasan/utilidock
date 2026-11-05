import { describe, expect, it } from 'vitest';
import { calculateBillSplit } from './bill-split';

describe('bill splitting calculations', () => {
  it('allocates tax proportionally and each misc charge using its selected method', () => {
    const result = calculateBillSplit({
      receiptTotal: 56,
      people: [
        { name: 'Alex', items: [{ name: 'Soup', amount: 10 }] },
        { name: 'Sam', items: [{ name: 'Dinner', amount: 30 }] },
      ],
      tax: { type: 'percentage', value: 10 },
      charges: [
        { name: 'Delivery', amount: 8, split: 'equal' },
        { name: 'Service', amount: 4, split: 'proportional' },
      ],
    });

    expect(result.people.map(({ subtotalCents, taxCents, chargesCents, totalCents }) => ({
      subtotalCents, taxCents, chargesCents, totalCents,
    }))).toEqual([
      { subtotalCents: 1000, taxCents: 100, chargesCents: 500, totalCents: 1600 },
      { subtotalCents: 3000, taxCents: 300, chargesCents: 700, totalCents: 4000 },
    ]);
    expect(result.calculatedTotalCents).toBe(5600);
    expect(result.differenceCents).toBe(0);
    expect(result.issues).toEqual([]);
  });

  it('allocates fixed tax proportionally and reconciles the receipt total', () => {
    const result = calculateBillSplit({
      receiptTotal: 44,
      people: [
        { name: 'Alex', items: [{ name: 'Soup', amount: 10 }] },
        { name: 'Sam', items: [{ name: 'Dinner', amount: 30 }] },
      ],
      tax: { type: 'fixed', value: 4 },
      charges: [],
    });

    expect(result.people.map((person) => person.taxCents)).toEqual([100, 300]);
    expect(result.differenceCents).toBe(0);
    expect(result.issues).toEqual([]);
  });

  it('distributes leftover cents deterministically for equal splits', () => {
    const result = calculateBillSplit({
      receiptTotal: 0.05,
      people: [
        { name: 'Alex', items: [] },
        { name: 'Sam', items: [] },
      ],
      tax: { type: 'percentage', value: 0 },
      charges: [{ name: 'Delivery', amount: 0.05, split: 'equal' }],
    });

    expect(result.people.map((person) => person.chargesCents)).toEqual([3, 2]);
    expect(result.differenceCents).toBe(0);
  });

  it('reports a proportional charge that cannot be allocated without item subtotals', () => {
    const result = calculateBillSplit({
      receiptTotal: 5,
      people: [{ name: 'Alex', items: [] }],
      tax: { type: 'fixed', value: 0 },
      charges: [{ name: 'Delivery', amount: 5, split: 'proportional' }],
    });

    expect(result.people[0].chargesCents).toBe(0);
    expect(result.calculatedTotalCents).toBe(500);
    expect(result.issues).toContain('Charge Delivery cannot be allocated until item subtotals are entered.');
  });

  it('rejects invalid amounts instead of silently including them', () => {
    const result = calculateBillSplit({
      receiptTotal: 10,
      people: [{ name: 'Alex', items: [{ name: 'Invalid', amount: -2 }] }],
      tax: { type: 'percentage', value: 0 },
      charges: [],
    });

    expect(result.subtotalCents).toBe(0);
    expect(result.issues).toContain('Person 1, item 1 must be a non-negative number.');
  });
});
