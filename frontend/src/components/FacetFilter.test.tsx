import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FacetGroup } from '../lib/api';
import { FacetFilter } from './FacetFilter';

const group: FacetGroup = {
  key: 'category',
  title: 'Тип чая',
  values: [
    { value: 'green', label: 'Зелёный', count: 5, selected: true },
    { value: 'black', label: 'Чёрный', count: 6, selected: false },
    { value: 'white', label: 'Белый', count: 0, selected: false },
  ],
};

describe('FacetFilter (US-02)', () => {
  it('показывает значения со счётчиками и отмеченный выбор', () => {
    render(<FacetFilter group={group} onToggle={() => {}} />);
    expect(screen.getByRole('group', { name: 'Тип чая' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Зелёный/)).toBeChecked();
    expect(screen.getByLabelText(/Чёрный/)).not.toBeChecked();
    expect(screen.getByText('(6)')).toBeInTheDocument();
  });

  it('значение с нулём недоступно, но видно', () => {
    render(<FacetFilter group={group} onToggle={() => {}} />);
    expect(screen.getByLabelText(/Белый/)).toBeDisabled();
  });

  it('клик передаёт значение наверх', async () => {
    const onToggle = vi.fn();
    render(<FacetFilter group={group} onToggle={onToggle} />);
    await userEvent.click(screen.getByLabelText(/Чёрный/));
    expect(onToggle).toHaveBeenCalledWith('black');
  });
});
