import { BaseService } from "./base.service";

export class CurrencyService extends BaseService {
    async getRate(budgetId: string, yearMonth: string) {
        const existing = await this.rates.findByBudgetAndMonth(budgetId, yearMonth);
        if (existing) return existing;

        const latest = await this.rates.findLatest(budgetId);
        return latest ?? null;
    }

    async getLatest(budgetId: string) {
        return this.rates.findLatest(budgetId);
    }

    async upsertRate(budgetId: string, data: { yearMonth: string; usdBuyRate: number; usdSellRate: number }) {
        return this.rates.upsert(budgetId, data);
    }

    convertUsdToNgn(usdAmount: number, rate: number): number {
        return usdAmount * rate;
    }
}
