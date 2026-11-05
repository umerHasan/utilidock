export type BillSplitInput = {
  receiptTotal: number;
  people: Array<{
    name: string;
    items: Array<{ name: string; amount: number }>;
  }>;
  tax: { type: 'percentage' | 'fixed'; value: number };
  charges: Array<{
    name: string;
    amount: number;
    split: 'equal' | 'proportional';
  }>;
};

export type BillSplitResult = {
  people: Array<{
    name: string;
    subtotalCents: number;
    taxCents: number;
    chargesCents: number;
    totalCents: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  chargesCents: number;
  calculatedTotalCents: number;
  receiptTotalCents: number;
  differenceCents: number;
  issues: string[];
};

function toCents(amount: number, label: string, issues: string[]) {
  if (!Number.isFinite(amount) || amount < 0) {
    issues.push(`${label} must be a non-negative number.`);
    return 0;
  }

  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents)) {
    issues.push(`${label} is too large to calculate.`);
    return 0;
  }
  return cents;
}

function sumCents(values: number[], label: string, issues: string[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) {
    issues.push(`${label} is too large to calculate.`);
    return 0;
  }
  return total;
}

function allocateCents(totalCents: number, weights: number[], mode: 'equal' | 'proportional', label: string, issues: string[]) {
  const shares = weights.map(() => 0);
  if (totalCents === 0) return shares;
  if (shares.length === 0) {
    issues.push(`${label} cannot be allocated until at least one person is added.`);
    return shares;
  }

  if (mode === 'equal') {
    const each = Math.floor(totalCents / shares.length);
    const remainder = totalCents % shares.length;
    return shares.map((_, index) => each + (index < remainder ? 1 : 0));
  }

  const weightTotal = sumCents(weights, `${label} allocation`, issues);
  if (weightTotal === 0) {
    issues.push(`${label} cannot be allocated until item subtotals are entered.`);
    return shares;
  }

  const remainders: Array<{ index: number; value: number }> = [];
  let assigned = 0;
  for (let index = 0; index < weights.length; index += 1) {
    const exactShare = (totalCents * weights[index]) / weightTotal;
    shares[index] = Math.floor(exactShare);
    assigned += shares[index];
    remainders.push({ index, value: exactShare - shares[index] });
  }

  remainders.sort((left, right) => right.value - left.value || left.index - right.index);
  for (let remaining = totalCents - assigned, index = 0; remaining > 0; remaining -= 1, index += 1) {
    shares[remainders[index % remainders.length].index] += 1;
  }
  return shares;
}

export function calculateBillSplit(input: BillSplitInput): BillSplitResult {
  const issues: string[] = [];
  const people = input.people.map((person, personIndex) => {
    const itemCents = person.items.map((item, itemIndex) =>
      toCents(item.amount, `Person ${personIndex + 1}, item ${itemIndex + 1}`, issues),
    );
    return {
      name: person.name.trim() || `Person ${personIndex + 1}`,
      subtotalCents: sumCents(itemCents, `Person ${personIndex + 1} subtotal`, issues),
      taxCents: 0,
      chargesCents: 0,
      totalCents: 0,
    };
  });
  const subtotalCents = sumCents(people.map((person) => person.subtotalCents), 'Item subtotal', issues);
  const weights = people.map((person) => person.subtotalCents);

  let taxCents = 0;
  if (input.tax.type === 'percentage') {
    if (!Number.isFinite(input.tax.value) || input.tax.value < 0) {
      issues.push('Tax percentage must be a non-negative number.');
    } else {
      taxCents = Math.round((subtotalCents * input.tax.value) / 100);
      if (!Number.isSafeInteger(taxCents)) {
        issues.push('Tax is too large to calculate.');
        taxCents = 0;
      }
    }
  } else {
    taxCents = toCents(input.tax.value, 'Tax amount', issues);
  }

  const taxShares = allocateCents(taxCents, weights, 'proportional', 'Tax', issues);
  people.forEach((person, index) => {
    person.taxCents = taxShares[index] ?? 0;
  });

  let chargesCents = 0;
  for (const [index, charge] of input.charges.entries()) {
    const amountCents = toCents(charge.amount, `Charge ${charge.name.trim() || index + 1}`, issues);
    chargesCents = sumCents([chargesCents, amountCents], 'Miscellaneous charges', issues);
    const shares = allocateCents(
      amountCents,
      weights,
      charge.split,
      `Charge ${charge.name.trim() || index + 1}`,
      issues,
    );
    people.forEach((person, personIndex) => {
      person.chargesCents += shares[personIndex] ?? 0;
    });
  }

  people.forEach((person) => {
    person.totalCents = sumCents(
      [person.subtotalCents, person.taxCents, person.chargesCents],
      `${person.name} total`,
      issues,
    );
  });

  const calculatedTotalCents = sumCents([subtotalCents, taxCents, chargesCents], 'Calculated bill total', issues);
  const receiptTotalCents = toCents(input.receiptTotal, 'Receipt total', issues);

  return {
    people,
    subtotalCents,
    taxCents,
    chargesCents,
    calculatedTotalCents,
    receiptTotalCents,
    differenceCents: receiptTotalCents - calculatedTotalCents,
    issues,
  };
}

export function formatCents(cents: number) {
  return (cents / 100).toFixed(2);
}
