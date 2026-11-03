import type { FacetGroup } from '../lib/api';

interface Props {
  group: FacetGroup;
  /** Выбор из URL: отмечаем сразу, не дожидаясь ответа сервера. */
  selected?: readonly string[];
  onToggle: (value: string) => void;
}

/** Группа фасетного фильтра. Значение с нулём недоступно, но остаётся видимым. */
export function FacetFilter({ group, selected, onToggle }: Props) {
  return (
    <fieldset className="facet" data-testid={`facet-${group.key}`}>
      <legend>{group.title}</legend>
      {group.values.map((v) => {
        const id = `f-${group.key}-${v.value}`;
        const checked = selected ? selected.includes(v.value) : v.selected;
        const disabled = v.count === 0 && !checked;
        return (
          <div className="facet-row" key={v.value}>
            <input
              id={id}
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(v.value)}
            />
            <label htmlFor={id} className={disabled ? 'muted' : undefined}>
              {v.label} <span className="count">({v.count})</span>
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
