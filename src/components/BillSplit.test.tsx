import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BillSplit } from './BillSplit';

describe('bill splitter interface', () => {
  it('splits tax by item totals and supports equal and proportional extra charges', async () => {
    const user = userEvent.setup();
    render(<BillSplit />);

    await user.type(screen.getByRole('spinbutton', { name: 'Final receipt total' }), '56');
    await user.clear(screen.getByRole('textbox', { name: 'Person 1 name' }));
    await user.type(screen.getByRole('textbox', { name: 'Person 1 name' }), 'Alex');
    await user.type(screen.getByRole('textbox', { name: 'Person 1 item 1 name' }), 'Lunch');
    await user.type(screen.getByRole('spinbutton', { name: 'Person 1 item 1 amount' }), '6');
    await user.click(screen.getAllByRole('button', { name: 'Add item' })[0]);
    await user.type(screen.getByRole('textbox', { name: 'Person 1 item 2 name' }), 'Coffee');
    await user.type(screen.getByRole('spinbutton', { name: 'Person 1 item 2 amount' }), '4');

    await user.click(screen.getByRole('button', { name: 'Add person' }));
    await user.clear(screen.getByRole('textbox', { name: 'Person 2 name' }));
    await user.type(screen.getByRole('textbox', { name: 'Person 2 name' }), 'Sam');
    await user.type(screen.getByRole('spinbutton', { name: 'Person 2 item 1 amount' }), '30');
    await user.type(screen.getByRole('spinbutton', { name: 'Tax percentage' }), '10');

    await user.click(screen.getByRole('button', { name: 'Add charge' }));
    await user.type(screen.getByRole('textbox', { name: 'Charge 1 name' }), 'Delivery');
    await user.type(screen.getByRole('spinbutton', { name: 'Charge 1 amount' }), '8');
    await user.click(screen.getByRole('button', { name: 'Add charge' }));
    await user.type(screen.getByRole('textbox', { name: 'Charge 2 name' }), 'Service');
    await user.type(screen.getByRole('spinbutton', { name: 'Charge 2 amount' }), '4');
    await user.selectOptions(screen.getByRole('combobox', { name: 'How to split charge 2' }), 'proportional');

    expect(screen.getByText('Matches receipt')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Alex split total' })).getByText('16.00')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Sam split total' })).getByText('40.00')).toBeInTheDocument();
  });

  it('allows fixed tax amounts and reports an unallocatable proportional charge', async () => {
    const user = userEvent.setup();
    render(<BillSplit />);

    await user.click(screen.getByRole('radio', { name: 'Total tax amount' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Total tax amount' }), '5');
    await user.click(screen.getByRole('button', { name: 'Add charge' }));
    await user.type(screen.getByRole('textbox', { name: 'Charge 1 name' }), 'Delivery');
    await user.type(screen.getByRole('spinbutton', { name: 'Charge 1 amount' }), '5');
    await user.selectOptions(screen.getByRole('combobox', { name: 'How to split charge 1' }), 'proportional');

    expect(screen.getByRole('alert')).toHaveTextContent('Tax cannot be allocated until item subtotals are entered.');
    expect(screen.getByRole('alert')).toHaveTextContent('Charge Delivery cannot be allocated until item subtotals are entered.');
  });

  it('removes extra items and people', async () => {
    const user = userEvent.setup();
    render(<BillSplit />);

    await user.click(screen.getByRole('button', { name: 'Add person' }));
    await user.click(screen.getAllByRole('button', { name: 'Add item' })[0]);
    await user.click(screen.getByRole('button', { name: 'Remove item 2 for person 1' }));
    expect(screen.queryByRole('textbox', { name: 'Person 1 item 2 name' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Person 2' }));
    expect(screen.queryByRole('textbox', { name: 'Person 2 name' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Person 1' })).getByRole('textbox', { name: 'Person 1 name' })).toBeInTheDocument();
  });
});
