export function civilKey(date: Date): string;
export function civilDate(value: string): Date | undefined;
export function jakartaToday(now?: Date): Date;
export function withCivilDay(date: Date | undefined, previous: string, fallbackTime: string): string;
export function overlapsJakartaDay(entry: { startsAt: string; endsAt: string }, day: Date): boolean;
