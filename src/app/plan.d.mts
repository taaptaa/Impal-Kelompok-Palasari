import type { CatalogItem } from './api';

export function changePlan(previous: Record<number, number>, items: CatalogItem[], id: number, quantity: number): Record<number, number>;
