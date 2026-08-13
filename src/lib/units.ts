import type { Units } from './types';

export const LB_PER_KG = 2.2046226218;

export function kgToDisplay(kg: number, units: Units): number {
  return units === 'lb' ? kg * LB_PER_KG : kg;
}

export function displayToKg(value: number, units: Units): number {
  return units === 'lb' ? value / LB_PER_KG : value;
}

export function roundTo(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Numeric part only, e.g. "225" or "102.5". */
export function formatWeightValue(kg: number, units: Units, decimals = 1): string {
  return String(roundTo(kgToDisplay(kg, units), decimals));
}

/** With unit suffix, e.g. "225 lb". */
export function formatWeight(kg: number, units: Units, decimals = 1): string {
  return `${formatWeightValue(kg, units, decimals)} ${units}`;
}

/** Compact tonnage, e.g. "24.3k lb". */
export function formatTonnage(kg: number, units: Units): string {
  const v = kgToDisplay(kg, units);
  if (v >= 10000) return `${roundTo(v / 1000, 1)}k ${units}`;
  return `${Math.round(v)} ${units}`;
}
