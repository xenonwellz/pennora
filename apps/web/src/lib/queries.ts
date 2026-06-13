import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "./client";
import { fetchPublicConfig } from "./config";

export function useAuthConfig() {
    return useQuery({
        queryKey: ["config"],
        queryFn: fetchPublicConfig,
        staleTime: 60_000,
    });
}

export function useBudgets() {
    return useQuery({
        queryKey: ["budgets"],
        queryFn: () => orpc.budgets.listBudgets(),
    });
}

export function useActiveBudget() {
    return useQuery({
        queryKey: ["budgets", "active"],
        queryFn: () => orpc.budgets.getActiveBudget(),
    });
}

export function useCreateBudget() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => orpc.budgets.createBudget({ name }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
    });
}

export function useSetActiveBudget() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (budgetId: string) => orpc.budgets.setActiveBudget({ budgetId }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["budgets"] });
            qc.invalidateQueries({ queryKey: ["budget"] });
        },
    });
}

export function useBudgetItems(yearMonth: string, enabled = true) {
    return useQuery({
        queryKey: ["budget", "items", yearMonth],
        queryFn: () => orpc.budget.getBudgetItems({ yearMonth }),
        enabled,
    });
}

export function useIncomeTarget(yearMonth: string, enabled = true) {
    return useQuery({
        queryKey: ["budget", "income", yearMonth],
        queryFn: () => orpc.income.getIncomeTarget({ yearMonth }),
        enabled,
    });
}

export function useCategories() {
    return useQuery({
        queryKey: ["categories"],
        queryFn: () => orpc.categories.listCategories(),
    });
}

export function useTags() {
    return useQuery({
        queryKey: ["tags"],
        queryFn: () => orpc.tags.listTags(),
    });
}

export function useRateForMonth(yearMonth: string, enabled = true) {
    return useQuery({
        queryKey: ["rates", yearMonth],
        queryFn: () => orpc.rates.getRateForMonth({ yearMonth }),
        enabled,
    });
}

export function useLatestRate() {
    return useQuery({
        queryKey: ["rates", "latest"],
        queryFn: () => orpc.rates.getLatestRate(),
    });
}

export function useGenerateBudgetItems() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (yearMonth: string) => orpc.budget.generateBudgetItems({ yearMonth }),
        onSuccess: (_data, yearMonth) => {
            qc.invalidateQueries({ queryKey: ["budget", "items", yearMonth] });
        },
    });
}

export function useTogglePaid() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => orpc.budget.togglePaid({ id }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["budget"] });
        },
    });
}

export function useAddBudgetItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            yearMonth: string;
            name: string;
            amount: number;
            currency: "NGN" | "USD";
            categoryId?: string;
            isRecurring?: boolean;
            frequencyMonths?: number;
            endsAtYearMonth?: string | null;
        }) => orpc.budget.addOneOffItem(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["budget"] });
            qc.invalidateQueries({ queryKey: ["analytics"] });
        },
    });
}

export function useUpdateBudgetItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            id: string;
            name?: string;
            amount?: number;
            currency?: "NGN" | "USD";
            categoryId?: string | null;
            isRecurring?: boolean;
            frequencyMonths?: number;
            endsAtYearMonth?: string | null;
            updateBase?: boolean;
        }) => orpc.budget.updateBudgetItem(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["budget"] });
            qc.invalidateQueries({ queryKey: ["analytics"] });
        },
    });
}

export function useDeleteBudgetItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => orpc.budget.deleteBudgetItem({ id }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["budget"] });
            qc.invalidateQueries({ queryKey: ["analytics"] });
        },
    });
}

export function useCreateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => orpc.categories.createCategory({ name }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    });
}

export function useUpdateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { id: string; name: string }) => orpc.categories.updateCategory(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    });
}

export function useDeleteCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => orpc.categories.deleteCategory({ id }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    });
}

export function useCreateTag() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => orpc.tags.createTag({ name }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
    });
}

export function useUpdateTag() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { id: string; name: string }) => orpc.tags.updateTag(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
    });
}

export function useDeleteTag() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => orpc.tags.deleteTag({ id }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
    });
}

export function useUpsertRate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            yearMonth: string;
            usdBuyRate: number;
            usdSellRate: number;
        }) => orpc.rates.upsertRate(data),
        onSuccess: (_data, { yearMonth }) => {
            qc.invalidateQueries({ queryKey: ["rates", yearMonth] });
            qc.invalidateQueries({ queryKey: ["rates", "latest"] });
        },
    });
}

export function useSetIncomeTarget() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            yearMonth: string;
            amount: number;
            currency: "NGN" | "USD";
            label: string;
            isRecurring?: boolean;
            frequencyMonths?: number;
            endsAtYearMonth?: string | null;
        }) => orpc.income.setIncomeTarget(data),
        onSuccess: (_data, { yearMonth }) => {
            qc.invalidateQueries({ queryKey: ["budget", "income", yearMonth] });
        },
    });
}

export function useUpdateIncomeTarget() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            id: string;
            amount?: number;
            currency?: "NGN" | "USD";
            label?: string;
            isRecurring?: boolean;
            frequencyMonths?: number;
            endsAtYearMonth?: string | null;
            updateBase?: boolean;
        }) => orpc.income.updateIncomeTarget(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["budget", "income"] }),
    });
}

export function useAddIncomeEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            incomeTargetId: string;
            yearMonth: string;
            amount: number;
            currency: "NGN" | "USD";
        }) => orpc.income.addIncomeEntry(data),
        onSuccess: (_data, { yearMonth }) => {
            qc.invalidateQueries({ queryKey: ["budget", "income", yearMonth] });
        },
    });
}

export function useDeleteIncomeEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => orpc.income.deleteIncomeEntry({ id }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["budget", "income"] }),
    });
}

export function useGenerateRecurringIncome() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (yearMonth: string) => orpc.income.generateRecurringIncome({ yearMonth }),
        onSuccess: (_data, yearMonth) => {
            qc.invalidateQueries({ queryKey: ["budget", "income", yearMonth] });
        },
    });
}

export function useMonthStatus(yearMonth: string) {
    return useQuery({
        queryKey: ["months", yearMonth],
        queryFn: () => orpc.months.getMonthStatus({ yearMonth }),
    });
}

export function useStartPlan() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { yearMonth: string; carryOverItemIds?: string[] }) =>
            orpc.months.startPlan(data),
        onSuccess: (_data, { yearMonth }) => {
            qc.invalidateQueries({ queryKey: ["months", yearMonth] });
            qc.invalidateQueries({ queryKey: ["budget", "items", yearMonth] });
            qc.invalidateQueries({ queryKey: ["budget", "income", yearMonth] });
            qc.invalidateQueries({ queryKey: ["rates", yearMonth] });
            qc.invalidateQueries({ queryKey: ["analytics"] });
        },
    });
}

export function useCompleteMonth() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (yearMonth: string) => orpc.months.completeMonth({ yearMonth }),
        onSuccess: (_data, yearMonth) => {
            qc.invalidateQueries({ queryKey: ["months", yearMonth] });
            qc.invalidateQueries({ queryKey: ["analytics"] });
        },
    });
}

export function useDashboardSummary(yearMonth: string) {
    return useQuery({
        queryKey: ["analytics", "dashboard", yearMonth],
        queryFn: () => orpc.analytics.getDashboardSummary({ yearMonth }),
    });
}

export function usePeriodSummary(params: {
    year?: number;
    startYearMonth?: string;
    endYearMonth?: string;
    allTime?: boolean;
}) {
    return useQuery({
        queryKey: ["analytics", "period", params],
        queryFn: () => orpc.analytics.getPeriodSummary(params),
    });
}

export function usePeriodCategoryBreakdown(
    params: {
        year?: number;
        startYearMonth?: string;
        endYearMonth?: string;
        allTime?: boolean;
        categoryId?: string | null;
    },
    enabled = true,
) {
    return useQuery({
        queryKey: ["analytics", "period", "category", params],
        queryFn: () => orpc.analytics.getPeriodCategoryBreakdown(params),
        enabled,
    });
}

export function useMonthAnalysis(yearMonth: string, enabled = true) {
    return useQuery({
        queryKey: ["analytics", "analysis", yearMonth],
        queryFn: () => orpc.analytics.getMonthAnalysis({ yearMonth }),
        enabled,
    });
}

export function useBudgetMembers() {
    return useQuery({
        queryKey: ["invitations", "members"],
        queryFn: () => orpc.invitations.listBudgetMembers(),
    });
}

export function useInviteToBudget() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (email: string) => orpc.invitations.inviteToBudget({ email }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", "members"] }),
    });
}

export function useRemoveBudgetMember() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (memberId: string) => orpc.invitations.removeBudgetMember({ memberId }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", "members"] }),
    });
}

export function useInvitation(token: string, enabled = true) {
    return useQuery({
        queryKey: ["invitations", "preview", token],
        queryFn: () => orpc.invitations.getInvitation({ token }),
        enabled: enabled && Boolean(token),
        retry: false,
    });
}

export function useAcceptInvitation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (token: string) => orpc.invitations.acceptInvitation({ token }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["budgets"] });
            qc.invalidateQueries({ queryKey: ["invitations"] });
        },
    });
}
