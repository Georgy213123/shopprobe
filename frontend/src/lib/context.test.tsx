import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from './context';
import { useCart } from './contexts';

function Probe() {
  const { lines, dispatch } = useCart();
  return (
    <button onClick={() => dispatch({ type: 'add', item: { slug: 'a', name: 'А', price: 1 } })}>
      позиций: {lines.length}
    </button>
  );
}

describe('AppProviders без доступа к localStorage (ревью Codex, R9)', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage');

  afterEach(() => {
    if (original) Object.defineProperty(window, 'localStorage', original);
    vi.unstubAllGlobals();
  });

  it('браузер запретил хранилище — витрина работает с пустой корзиной', async () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ name: 'x', seeded_bugs: false }))),
    );
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    screen.getByRole('button').click();
    expect(await screen.findByText('позиций: 1')).toBeInTheDocument();
  });
});
