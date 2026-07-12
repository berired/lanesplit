/** Formats a whole-dollar amount compactly, e.g. 2500000 -> "$2.5M". */
export function formatCompactUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/** Formats a whole-dollar amount with full digits, e.g. 2500000 -> "$2,500,000". */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
