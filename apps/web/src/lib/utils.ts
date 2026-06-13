import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function currMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currYear(): number {
    return new Date().getFullYear();
}

export { computeRecurringEndOptions, addMonths, monthLabel as sharedMonthLabel } from "@expense/shared";

export function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("en", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatNGN(amount: number): string {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);
}

export function formatUSD(amount: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function monthLabel(ym: string): string {
    const [y, m] = ym.split("-");
    const d = new Date(Number(y), Number(m) - 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function prevMonth(ym: string): string {
    const [y, m] = ym.split("-").map(Number);
    const date = new Date(y!, m! - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
