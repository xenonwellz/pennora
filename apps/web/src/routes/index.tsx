import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
    Cell,
    Pie,
    PieChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Line,
    LineChart,
} from "recharts";
import { useBudgets, useActiveBudget, useSetActiveBudget, usePeriodSummary } from "../lib/queries";
import { PanelCard, PanelCardContent, PanelCardHeader } from "@/components/panel-card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { EmptyChart, EmptyPieChart } from "@/components/empty-chart";
import {
    DurationSelector,
    periodLabel,
    periodToApiParams,
    type DashboardPeriod,
} from "@/components/duration-selector";
import { CategoryDrilldownDialog } from "@/components/category-drilldown-dialog";
import { formatNGN, currYear } from "../lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    MoneyBag02Icon,
    Wallet03Icon,
    InvoiceIcon,
    TrendingUpDownIcon,
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/")({
    component: DashboardPage,
});

const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

function DashboardPage() {
    const { data: budgets, isLoading: budgetsLoading } = useBudgets();
    const { data: activeBudget, isLoading: activeLoading } = useActiveBudget();
    const setActive = useSetActiveBudget();
    const [period, setPeriod] = useState<DashboardPeriod>({ type: "year", year: currYear() });
    const [drilldown, setDrilldown] = useState<{
        categoryId: string | null;
        categoryName: string;
    } | null>(null);

    if (budgetsLoading || activeLoading) {
        return (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                Loading...
            </div>
        );
    }

    if (!activeBudget) {
        return (
            <div className="mx-auto max-w-lg pt-12">
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <HugeiconsIcon icon={MoneyBag02Icon} strokeWidth={2} className="size-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-heading font-semibold mb-2">Welcome</h1>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Create your first budget to get started tracking expenses.
                    </p>
                </div>

                {budgets && budgets.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            Existing budgets
                        </p>
                        <div className="space-y-1">
                            {budgets.map((b) => (
                                <button
                                    key={b.id}
                                    onClick={() => setActive.mutate(b.id)}
                                    className="w-full text-left px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
                                >
                                    {b.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-heading font-semibold truncate">{activeBudget.name}</h1>
                    <p className="text-sm text-muted-foreground">Overview · {periodLabel(period)}</p>
                </div>
                <DurationSelector value={period} onChange={setPeriod} />
            </div>

            <PeriodStatCards period={period} />
            <PeriodInsights period={period} onCategoryClick={setDrilldown} />

            {drilldown && (
                <CategoryDrilldownDialog
                    open
                    onOpenChange={(open) => !open && setDrilldown(null)}
                    categoryId={drilldown.categoryId}
                    categoryName={drilldown.categoryName}
                    period={period}
                />
            )}
        </div>
    );
}

function PeriodStatCards({ period }: { period: DashboardPeriod }) {
    const { data: summary, isLoading } = usePeriodSummary(periodToApiParams(period));

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-card border border-border animate-pulse" />
                ))}
            </div>
        );
    }

    if (!summary) return null;

    const progress =
        summary.paidCount + summary.unpaidCount > 0
            ? (summary.paidCount / (summary.paidCount + summary.unpaidCount)) * 100
            : 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
                icon={Wallet03Icon}
                label="Income"
                value={summary.incomeNgn}
                detail={
                    summary.incomeTargetNgn > 0
                        ? `Target: ${formatNGN(summary.incomeTargetNgn)}`
                        : `${summary.monthCount} month${summary.monthCount === 1 ? "" : "s"}`
                }
                color="text-[var(--color-success)]"
                bg="bg-[var(--color-success)]/10"
                texture="card"
            />
            <StatCard
                icon={InvoiceIcon}
                label="Expenses"
                value={summary.expensesNgn}
                detail={`${summary.paidCount} of ${summary.paidCount + summary.unpaidCount} paid`}
                color="text-[var(--color-expense)]"
                bg="bg-[var(--color-expense)]/10"
                texture="card-2"
            >
                {summary.paidCount + summary.unpaidCount > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-[var(--color-success)] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </StatCard>
            <StatCard
                icon={TrendingUpDownIcon}
                label="Remaining"
                value={summary.remainingNgn}
                detail={summary.remainingNgn < 0 ? "Over budget" : "Available"}
                color={
                    summary.remainingNgn >= 0
                        ? "text-[var(--color-success)]"
                        : "text-[var(--color-expense)]"
                }
                bg={
                    summary.remainingNgn >= 0
                        ? "bg-[var(--color-success)]/10"
                        : "bg-[var(--color-expense)]/10"
                }
                texture="card"
            />
        </div>
    );
}

function PeriodInsights({
    period,
    onCategoryClick,
}: {
    period: DashboardPeriod;
    onCategoryClick: (cat: { categoryId: string | null; categoryName: string }) => void;
}) {
    const { data: summary, isLoading } = usePeriodSummary(periodToApiParams(period));

    if (isLoading || !summary) return null;

    const incomeSpentPct =
        summary.incomeNgn > 0
            ? Math.round((summary.expensesNgn / summary.incomeNgn) * 100)
            : null;
    const topCategory = summary.categoryChart[0];
    const topCategoryPct =
        topCategory && summary.expensesNgn > 0
            ? Math.round((topCategory.value / summary.expensesNgn) * 100)
            : null;

    const categoryChartConfig = Object.fromEntries(
        summary.categoryChart.map((c, i) => [
            c.name,
            { label: c.name, color: CHART_COLORS[i % CHART_COLORS.length] },
        ]),
    );

    const compareChartData = [
        { name: "Income", value: summary.incomeNgn, fill: "var(--color-success)" },
        { name: "Expenses", value: summary.expensesNgn, fill: "var(--color-expense)" },
    ];

    const compareChartConfig = {
        Income: { label: "Income", color: "var(--color-success)" },
        Expenses: { label: "Expenses", color: "var(--color-expense)" },
    };

    const trendChartConfig = {
        income: { label: "Income", color: "var(--color-success)" },
        expenses: { label: "Expenses", color: "var(--color-expense)" },
        remaining: { label: "Remaining", color: "oklch(0.55 0.15 250)" },
    };

    const trendData = summary.monthlyTrend.map((m) => ({
        month: m.yearMonth.slice(5),
        income: m.income,
        expenses: m.expenses,
        remaining: m.income - m.expenses,
    }));

    const hasCategoryData = summary.categoryChart.length > 0;
    const hasFlowData = summary.incomeNgn > 0 || summary.expensesNgn > 0;
    const hasTrendData = trendData.some((d) => d.income > 0 || d.expenses > 0);

    return (
        <div className="space-y-6">
            <PanelCard>
                <PanelCardHeader title="Insights" />
                <PanelCardContent className="space-y-2">
                    <ul className="space-y-1.5 text-sm">
                        {incomeSpentPct !== null && (
                            <li>
                                <span className="font-medium tabular-nums">{incomeSpentPct}%</span> of income
                                spent on planned expenses
                            </li>
                        )}
                        {summary.unpaidCount > 0 && (
                            <li>
                                <span className="font-medium tabular-nums">{summary.unpaidCount}</span> unpaid
                                item{summary.unpaidCount === 1 ? "" : "s"} (
                                {formatNGN(summary.unpaidExpensesNgn)})
                            </li>
                        )}
                        {topCategory && topCategoryPct !== null && (
                            <li>
                                Top category:{" "}
                                <button
                                    type="button"
                                    className="font-medium underline-offset-2 hover:underline"
                                    onClick={() =>
                                        onCategoryClick({
                                            categoryId: topCategory.categoryId,
                                            categoryName: topCategory.name,
                                        })
                                    }
                                >
                                    {topCategory.name}
                                </button>{" "}
                                ({topCategoryPct}% of expenses)
                            </li>
                        )}
                        {summary.incomeNgn === 0 && summary.expensesNgn === 0 && (
                            <li className="text-muted-foreground">No activity in this period yet.</li>
                        )}
                        {summary.remainingNgn < 0 && (
                            <li className="text-[var(--color-expense)]">
                                Over budget by {formatNGN(Math.abs(summary.remainingNgn))}
                            </li>
                        )}
                    </ul>
                </PanelCardContent>
            </PanelCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PanelCard texture="card-2">
                    <PanelCardHeader
                        title="Expenses by category"
                        description="How your expenses break down by category"
                    />
                    <PanelCardContent>
                        {hasCategoryData ? (
                            <div className="relative">
                                <ChartContainer
                                    config={categoryChartConfig}
                                    className="mx-auto aspect-square max-h-[280px]"
                                >
                                    <PieChart>
                                        <ChartTooltip
                                            content={
                                                <ChartTooltipContent
                                                    hideLabel
                                                    formatter={(v) => formatNGN(Number(v))}
                                                />
                                            }
                                        />
                                        <Pie
                                            data={summary.categoryChart}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            outerRadius={100}
                                            strokeWidth={2}
                                            onClick={(data) => {
                                                const entry = data?.payload as {
                                                    categoryId?: string | null;
                                                    name: string;
                                                };
                                                if (entry?.name) {
                                                    onCategoryClick({
                                                        categoryId: entry.categoryId ?? null,
                                                        categoryName: entry.name,
                                                    });
                                                }
                                            }}
                                            className="cursor-pointer"
                                        >
                                            {summary.categoryChart.map((entry, index) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="font-mono text-2xl font-bold text-foreground">
                                        {summary.categoryChart.length}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        categor{summary.categoryChart.length === 1 ? "y" : "ies"}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <EmptyPieChart
                                config={categoryChartConfig}
                                className="mx-auto max-h-[280px]"
                            />
                        )}
                    </PanelCardContent>
                </PanelCard>

                <PanelCard texture="card">
                    <PanelCardHeader
                        title="Income vs expenses"
                        description="Compare total income against expenses for the selected period"
                    />
                    <PanelCardContent>
                        {hasFlowData ? (
                            <div className="relative">
                                <ChartContainer
                                    config={compareChartConfig}
                                    className="mx-auto aspect-square max-h-[280px]"
                                >
                                    <PieChart>
                                        <ChartTooltip
                                            content={
                                                <ChartTooltipContent
                                                    hideLabel
                                                    formatter={(v) => formatNGN(Number(v))}
                                                />
                                            }
                                        />
                                        <Pie
                                            data={compareChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            outerRadius={100}
                                            strokeWidth={2}
                                        >
                                            {compareChartData.map((entry) => (
                                                <Cell key={entry.name} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xs text-muted-foreground">Net</span>
                                    <span
                                        className={`text-sm font-semibold tabular-nums ${
                                            summary.remainingNgn >= 0
                                                ? "text-[var(--color-success)]"
                                                : "text-[var(--color-expense)]"
                                        }`}
                                    >
                                        {formatNGN(summary.remainingNgn)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <EmptyPieChart
                                config={compareChartConfig}
                                className="mx-auto max-h-[280px]"
                            />
                        )}
                    </PanelCardContent>
                </PanelCard>

                <PanelCard texture="card" className="col-span-2">
                    <PanelCardHeader
                        title="Monthly trend"
                        description="Monthly spending and income over time"
                    />
                    <PanelCardContent>
                        {hasTrendData ? (
                            <ChartContainer config={trendChartConfig} className="max-h-[280px] w-full">
                                <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tick={false} tickLine={false} axisLine={false} />
                                    <YAxis tick={false} tickLine={false} axisLine={false} width={0} />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent formatter={(v) => formatNGN(Number(v))} />
                                        }
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="income"
                                        stroke="var(--color-success)"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="expenses"
                                        stroke="var(--color-expense)"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="remaining"
                                        stroke="oklch(0.55 0.15 250)"
                                        strokeWidth={2}
                                        dot={false}
                                        strokeDasharray="5 3"
                                    />
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <EmptyChart config={trendChartConfig} className="max-h-[280px]" />
                        )}
                    </PanelCardContent>
                </PanelCard>
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    detail,
    color,
    bg,
    texture,
    children,
}: {
    icon: typeof Wallet03Icon;
    label: string;
    value: number;
    detail?: string;
    color: string;
    bg: string;
    texture?: "card" | "card-2";
    children?: React.ReactNode;
}) {
    return (
        <PanelCard texture={texture}>
            <PanelCardHeader title={label} />
            <PanelCardContent>
                <div className="flex items-center gap-3 mb-2">
                    <div className={`size-10 rounded-lg ${bg} flex items-center justify-center`}>
                        <HugeiconsIcon icon={Icon} strokeWidth={2} className={`size-5 ${color}`} />
                    </div>
                </div>
                <p className="text-2xl font-heading font-semibold tabular-nums">{formatNGN(value)}</p>
                {detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}
                {children}
            </PanelCardContent>
        </PanelCard>
    );
}