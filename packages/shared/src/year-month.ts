export function addMonths(yearMonth: string, months: number): string {
    const [y, m] = yearMonth.split("-").map(Number);
    const date = new Date(y!, m! - 1, 1);
    date.setMonth(date.getMonth() + months);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function compareYearMonth(a: string, b: string): number {
    return a.localeCompare(b);
}

export function monthsBetween(ym1: string, ym2: string): number {
    const [y1, m1] = ym1.split("-").map(Number);
    const [y2, m2] = ym2.split("-").map(Number);
    return (y2! - y1!) * 12 + (m2! - m1!);
}

export function yearMonthRange(start: string, end: string): string[] {
    const months: string[] = [];
    let current = start;
    while (compareYearMonth(current, end) <= 0) {
        months.push(current);
        current = addMonths(current, 1);
    }
    return months;
}

export function yearToRange(year: number): { startYearMonth: string; endYearMonth: string } {
    return {
        startYearMonth: `${year}-01`,
        endYearMonth: `${year}-12`,
    };
}

/** Valid end months for recurring: start + n * frequency (inclusive of start). */
export function computeRecurringEndOptions(
    startMonth: string,
    frequencyMonths: number,
    maxYears = 10,
): string[] {
    const options: string[] = [];
    const maxMonth = addMonths(startMonth, maxYears * 12);
    let current = startMonth;
    while (compareYearMonth(current, maxMonth) <= 0) {
        options.push(current);
        current = addMonths(current, frequencyMonths);
    }
    return options;
}

export function monthLabel(ym: string): string {
    const [y, m] = ym.split("-");
    const d = new Date(Number(y), Number(m) - 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function currMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currYear(): number {
    return new Date().getFullYear();
}
