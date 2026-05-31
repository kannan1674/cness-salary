export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDays(count: number): string {
  return `${count} Day${count === 1 ? "" : "s"}`;
}
