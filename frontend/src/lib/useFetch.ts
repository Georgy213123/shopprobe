import { useEffect, useState } from 'react';

export type FetchState<T> =
  | { status: 'loading'; previous?: T }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: Error };

/** Загрузка с отменой при смене ключа: устаревший ответ не перетирает свежий. */
export function useFetch<T>(load: (signal: AbortSignal) => Promise<T>, key: string): FetchState<T> {
  const [state, setState] = useState<{ key: string; value: FetchState<T> }>({
    key,
    value: { status: 'loading' },
  });

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal).then(
      (data) => setState({ key, value: { status: 'ok', data } }),
      (error: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({
          key,
          value: {
            status: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
          },
        });
      },
    );
    return () => ctrl.abort();
    // load намеренно не в зависимостях: перезапрос управляется ключом.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (state.key === key) return state.value;
  // Пока грузится новый ответ, отдаём прежние данные: фильтры не мигают и не теряют фокус.
  return state.value.status === 'ok'
    ? { status: 'loading', previous: state.value.data }
    : { status: 'loading' };
}
