const rub = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  // Intl ставит неразрывные пробелы; тестам и скринридерам так проще.
  return rub.format(value).replace(/[\u00a0\u202f]/g, ' ');
}

export function formatWeight(grams: number): string {
  return grams >= 1000 ? `${grams / 1000} кг` : `${grams} г`;
}
