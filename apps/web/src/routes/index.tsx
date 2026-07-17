import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
    Cell,
    Pie,
    PieChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Bar,
    BarChart,
} from "recharts";
import { useBudgets, useActiveBudget, useSetActiveBudget, usePeriodSummary } from "../lib/queries";
import { DivideFrame, DivideSectionLabel } from "@/components/divide-frame";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import {
    DurationSelector,
    periodLabel,
    periodToApiParams,
    type DashboardPeriod,
} from "@/components/duration-selector";
import { CategoryDrilldownDialog } from "@/components/category-drilldown-dialog";
import { formatNGN, currYear, cn } from "../lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

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
                <div className="flex flex-col items-center text-center mb-8">
                    <h1 className="text-2xl font-heading font-semibold mb-2">Welcome</h1>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Create your first budget to get started.
                    </p>
                </div>

                {budgets && budgets.length > 0 && (
                    <DivideFrame className="divide-y divide-border">
                        <DivideSectionLabel>Existing budgets</DivideSectionLabel>
                        {budgets.map((b) => (
                            <button
                                key={b.id}
                                onClick={() => setActive.mutate(b.id)}
                                className="w-full text-left px-4 py-3.5 hover:bg-muted/40 transition-colors text-sm font-medium"
                            >
                                {b.name}
                            </button>
                        ))}
                    </DivideFrame>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-5">
            <div className="space-y-3">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-heading font-semibold truncate">
                        {activeBudget.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Overview · {periodLabel(period)}
                    </p>
                </div>
                <DurationSelector value={period} onChange={setPeriod} className="w-full" />
            </div>

            <DashboardBody period={period} onCategoryClick={setDrilldown} />

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

function DashboardBody({
    period,
    onCategoryClick,
}: {
    period: DashboardPeriod;
    onCategoryClick: (cat: { categoryId: string | null; categoryName: string }) => void;
}) {
    const { data: summary, isLoading } = usePeriodSummary(periodToApiParams(period));

    if (isLoading) {
        return (
            <DivideFrame className="divide-y divide-border">
                <div className="grid grid-cols-3 divide-x divide-border">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 animate-pulse bg-muted/30" />
                    ))}
                </div>
                <div className="h-28 animate-pulse bg-muted/20" />
            </DivideFrame>
        );
    }

    if (!summary) return null;

    const totalItems = summary.paidCount + summary.unpaidCount;
    const paidPct = totalItems > 0 ? Math.round((summary.paidCount / totalItems) * 100) : 0;
    const incomeSpentPct =
        summary.incomeNgn > 0
            ? Math.round((summary.expensesNgn / summary.incomeNgn) * 100)
            : null;
    const topCategory = summary.categoryChart[0];
    const topCategoryPct =
        topCategory && summary.expensesNgn > 0
            ? Math.round((topCategory.value / summary.expensesNgn) * 100)
            : null;

    const afterPaidSoFar = summary.incomeNgn - summary.paidExpensesNgn;
    const afterAllPaid = summary.incomeNgn - summary.expensesNgn;

    const hasCategoryData = summary.categoryChart.length > 0;
    const hasPaymentData = summary.expensesNgn > 0 || totalItems > 0;
    const hasIncome = summary.incomeNgn > 0;
    const hasActivity = hasIncome || hasPaymentData;

    const categoryChartConfig = Object.fromEntries(
        summary.categoryChart.map((c, i) => [
            c.name,
            { label: c.name, color: CHART_COLORS[i % CHART_COLORS.length] },
        ]),
    );

    const flowBars = [
        { name: "Income", value: summary.incomeNgn, fill: "var(--color-success)" },
        { name: "Paid", value: summary.paidExpensesNgn, fill: "var(--chart-2)" },
        { name: "Unpaid", value: summary.unpaidExpensesNgn, fill: "var(--color-expense)" },
    ];

    const flowChartConfig = {
        value: { label: "Amount", color: "var(--chart-1)" },
    };

    // Empty period: keep zero metrics, light CTA (no long copy / big icon)
    if (!hasActivity && !hasCategoryData) {
        return (
            <DivideFrame className="divide-y divide-border">
                <div className="grid grid-cols-3 divide-x divide-border">
                    <MetricCell
                        label="Income"
                        value={0}
                        detail={`${summary.monthCount} mo`}
                    />
                    <MetricCell label="Expenses" value={0} detail="—" />
                    <MetricCell label="Left" value={0} detail="—" />
                </div>
                <div className="flex flex-col items-center text-center px-6 py-6 sm:py-8">
                    <p className="text-sm text-muted-foreground mb-3">No activity this period</p>
                    <Button size="sm" render={<Link to="/budget" />}>
                        Go to Budget
                        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
                    </Button>
                </div>
            </DivideFrame>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats */}
            <DivideFrame className="divide-y divide-border">
                <div className="grid grid-cols-3 divide-x divide-border">
                    <MetricCell
                        label="Income"
                        value={summary.incomeNgn}
                        detail={
                            summary.incomeTargetNgn > 0
                                ? `of ${formatNGN(summary.incomeTargetNgn)}`
                                : `${summary.monthCount} mo`
                        }
                        tone="success"
                    />
                    <MetricCell
                        label="Expenses"
                        value={summary.expensesNgn}
                        detail={
                            totalItems > 0
                                ? `${summary.paidCount}/${totalItems} paid`
                                : "—"
                        }
                        tone="expense"
                    />
                    <MetricCell
                        label="Left"
                        value={summary.remainingNgn}
                        detail={summary.remainingNgn < 0 ? "Over plan" : "If all paid"}
                        tone={summary.remainingNgn >= 0 ? "success" : "expense"}
                    />
                </div>

                {/* Progress only when there is something to show */}
                {hasActivity && (
                    <div className="divide-y divide-border">
                        {totalItems > 0 && (
                            <div className="px-4 py-3.5 space-y-2">
                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="text-muted-foreground">
                                        <span className="font-medium text-foreground tabular-nums">
                                            {summary.paidCount}
                                        </span>
                                        {" / "}
                                        <span className="font-medium text-foreground tabular-nums">
                                            {totalItems}
                                        </span>
                                        {" expenses paid"}
                                    </span>
                                    <span className="font-medium tabular-nums">{paidPct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-[var(--color-success)] transition-all duration-500"
                                        style={{ width: `${paidPct}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        {(hasIncome || summary.expensesNgn > 0) && (
                            <>
                                <FlatRow
                                    label="Cash left now"
                                    hint="After paid items"
                                    amount={afterPaidSoFar}
                                />
                                <FlatRow
                                    label="If everything paid"
                                    hint="After full plan"
                                    amount={afterAllPaid}
                                />
                            </>
                        )}
                        {(summary.unpaidCount > 0 || topCategory) && (
                            <div className="px-4 py-3 space-y-1 text-sm text-muted-foreground">
                                {summary.unpaidCount > 0 && (
                                    <p>
                                        <span className="font-medium text-foreground tabular-nums">
                                            {formatNGN(summary.unpaidExpensesNgn)}
                                        </span>{" "}
                                        still unpaid
                                        {incomeSpentPct !== null && (
                                            <>
                                                {" · "}
                                                plan is{" "}
                                                <span className="font-medium text-foreground tabular-nums">
                                                    {incomeSpentPct}%
                                                </span>{" "}
                                                of income
                                            </>
                                        )}
                                    </p>
                                )}
                                {topCategory && topCategoryPct !== null && (
                                    <p>
                                        Top{" "}
                                        <button
                                            type="button"
                                            className="font-medium text-foreground underline-offset-2 hover:underline"
                                            onClick={() =>
                                                onCategoryClick({
                                                    categoryId: topCategory.categoryId,
                                                    categoryName: topCategory.name,
                                                })
                                            }
                                        >
                                            {topCategory.name}
                                        </button>{" "}
                                        ({topCategoryPct}%)
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </DivideFrame>

            {/* Paid vs unpaid — only when there are expenses */}
            {hasPaymentData && (
                <DivideFrame className="divide-y divide-border">
                    <DivideSectionLabel>Paid vs unpaid</DivideSectionLabel>
                    <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="px-4 py-3.5">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                Paid
                            </p>
                            <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-success)]">
                                {formatNGN(summary.paidExpensesNgn)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {summary.paidCount} item{summary.paidCount === 1 ? "" : "s"}
                            </p>
                        </div>
                        <div className="px-4 py-3.5">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                Unpaid
                            </p>
                            <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-expense)]">
                                {formatNGN(summary.unpaidExpensesNgn)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {summary.unpaidCount} item{summary.unpaidCount === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>
                    {summary.expensesNgn > 0 && (
                        <div className="px-4 py-3">
                            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="bg-[var(--color-success)] transition-all"
                                    style={{
                                        width: `${(summary.paidExpensesNgn / summary.expensesNgn) * 100}%`,
                                    }}
                                />
                                <div
                                    className="bg-[var(--color-expense)] transition-all"
                                    style={{
                                        width: `${(summary.unpaidExpensesNgn / summary.expensesNgn) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </DivideFrame>
            )}

            {/* Category — only with data */}
            {hasCategoryData && (
                <DivideFrame className="divide-y divide-border">
                    <DivideSectionLabel>By category</DivideSectionLabel>
                    <div className="sm:hidden divide-y divide-border">
                        {summary.categoryChart.map((c, i) => {
                            const pct =
                                summary.expensesNgn > 0
                                    ? Math.round((c.value / summary.expensesNgn) * 100)
                                    : 0;
                            return (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() =>
                                        onCategoryClick({
                                            categoryId: c.categoryId,
                                            categoryName: c.name,
                                        })
                                    }
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                                >
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{
                                            background: CHART_COLORS[i % CHART_COLORS.length],
                                        }}
                                    />
                                    <span className="flex-1 min-w-0 text-sm font-medium truncate">
                                        {c.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {pct}%
                                    </span>
                                    <span className="text-sm font-medium tabular-nums shrink-0">
                                        {formatNGN(c.value)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="hidden sm:block px-4 py-4">
                        <ChartContainer
                            config={categoryChartConfig}
                            className="mx-auto aspect-square max-h-[240px]"
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
                                    innerRadius={52}
                                    outerRadius={88}
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
                    </div>
                </DivideFrame>
            )}

            {/* Money flow — only with activity */}
            {(hasIncome || hasPaymentData) && (
                <DivideFrame className="divide-y divide-border">
                    <DivideSectionLabel>Money flow</DivideSectionLabel>
                    <div className="px-3 py-3 sm:px-4 sm:py-4">
                        <ChartContainer
                            config={flowChartConfig}
                            className="h-[160px] sm:h-[200px] w-full"
                        >
                            <BarChart
                                data={flowBars}
                                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis hide />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(v) => formatNGN(Number(v))}
                                        />
                                    }
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                    {flowBars.map((entry) => (
                                        <Cell key={entry.name} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </div>
                </DivideFrame>
            )}
        </div>
    );
}

function MetricCell({
    label,
    value,
    detail,
    tone,
}: {
    label: string;
    value: number;
    detail?: string;
    tone?: "success" | "expense" | "default";
}) {
    return (
        <div className="px-3 py-3.5 sm:px-4 sm:py-4 min-w-0">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            <p
                className={cn(
                    "mt-1 text-base sm:text-xl font-heading font-semibold tabular-nums leading-tight truncate",
                    tone === "success" && "text-[var(--color-success)]",
                    tone === "expense" && "text-[var(--color-expense)]",
                )}
            >
                {formatNGN(value)}
            </p>
            {detail && (
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    {detail}
                </p>
            )}
        </div>
    );
}

function FlatRow({
    label,
    hint,
    amount,
}: {
    label: string;
    hint: string;
    amount: number;
}) {
    const positive = amount >= 0;
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <p
                className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    positive ? "text-[var(--color-success)]" : "text-[var(--color-expense)]",
                )}
            >
                {formatNGN(amount)}
            </p>
        </div>
    );
}
