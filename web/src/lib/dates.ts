export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object" && value !== null) {
    if ("toDate" in value && typeof value.toDate === "function") {
      const parsed = value.toDate();
      return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }
    if ("seconds" in value && typeof value.seconds === "number") {
      const parsed = new Date(value.seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
}

export function extendExpiration(
  currentExpiration: unknown,
  days: number,
  now = new Date(),
): Date {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("Los días de extensión deben ser un entero positivo.");
  }

  const parsedExpiration = toDate(currentExpiration);
  const base = parsedExpiration && parsedExpiration > now ? parsedExpiration : now;
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}
