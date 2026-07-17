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
    if (currency === "NGN") return formatNGN(amount);
    if (currency === "USD") return formatUSD(amount);
    return new Intl.NumberFormat("en", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/** Compact from 1M up: 1650000 → "1.650M", 2.5e9 → "2.500B" */
function compactMagnitude(abs: number): string {
    if (abs >= 1_000_000_000_000) {
        return `${(abs / 1_000_000_000_000).toFixed(3)}T`;
    }
    if (abs >= 1_000_000_000) {
        return `${(abs / 1_000_000_000).toFixed(3)}B`;
    }
    if (abs >= 1_000_000) {
        return `${(abs / 1_000_000).toFixed(3)}M`;
    }
    return new Intl.NumberFormat("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(abs);
}

export function formatNGN(amount: number): string {
    const sign = amount < 0 ? "-" : "";
    return `${sign}₦${compactMagnitude(Math.abs(amount))}`;
}

/** Full NGN with grouping: 1500000 → "₦1,500,000" (no M/B compact). */
export function formatNGNFull(amount: number): string {
    const sign = amount < 0 ? "-" : "";
    const body = new Intl.NumberFormat("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.abs(amount));
    return `${sign}₦${body}`;
}

/** Full amount with grouping for budget summaries (always expands NGN/USD). */
export function formatAmountFull(amount: number, currency = "NGN"): string {
    const sign = amount < 0 ? "-" : "";
    const abs = Math.abs(amount);
    if (currency === "USD") {
        return `${sign}$${new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(abs)}`;
    }
    return formatNGNFull(amount);
}

export function formatUSD(amount: number): string {
    const sign = amount < 0 ? "-" : "";
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) {
        return `${sign}$${compactMagnitude(abs)}`;
    }
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
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
