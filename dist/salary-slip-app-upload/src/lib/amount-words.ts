import { toWords } from "number-to-words";

export function amountToIndianWords(amount: number): string {
  const rounded = Math.round(amount);
  const words = toWords(rounded)
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${words} Rupees Only`;
}
