import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon, MoneySend01Icon } from "@hugeicons/core-free-icons";
import { formatCurrency } from "@/lib/utils";
import { expenseUnpaidAmount } from "@expense/shared";

type ExpensePaidControlProps = {
    id: string;
    name: string;
    amount: number;
    currency: string;
    amountPaid: number;
    isDraft: boolean;
    readOnly: boolean;
    pending?: boolean;
    onTogglePaid: () => void;
    onAdjustPaid: (delta: number) => void;
};

function CheckboxLoading() {
    return (
        <div
            className="flex size-5 shrink-0 items-center justify-center rounded-[3px] border-2 border-border bg-background"
            aria-busy="true"
            aria-label="Updating"
            title="Updating…"
        >
            <HugeiconsIcon
                icon={Loading03Icon}
                strokeWidth={2}
                className="size-3 animate-spin text-muted-foreground"
            />
        </div>
    );
}

export function ExpensePaidControl({
    amount,
    currency,
    amountPaid,
    isDraft,
    readOnly,
    pending,
    onTogglePaid,
    onAdjustPaid,
}: ExpensePaidControlProps) {
    const [open, setOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");

    const isFullyPaid = amountPaid >= amount;
    const isPartial = amountPaid > 0 && !isFullyPaid;
    const remaining = expenseUnpaidAmount({ amount, currency, amountPaid });

    const parsedAmount = Number(paymentAmount.replace(/,/g, ""));
    const canAdjust = Number.isFinite(parsedAmount) && parsedAmount > 0;

    const handleAdjust = (sign: 1 | -1) => {
        if (!canAdjust) return;
        onAdjustPaid(sign * parsedAmount);
        setPaymentAmount("");
        setOpen(false);
    };

    if (pending) {
        return <CheckboxLoading />;
    }

    if (isDraft) {
        return (
            <div
                className="size-5 shrink-0 rounded-[3px] border-2 border-dashed border-border bg-background"
                title="Draft — activate to track"
            />
        );
    }

    if (readOnly) {
        return (
            <div
                className={`size-3 rounded-full ${isFullyPaid ? "bg-success" : isPartial ? "bg-warning" : "bg-muted-foreground/30"}`}
                title={
                    isFullyPaid
                        ? "Paid"
                        : isPartial
                            ? `${formatCurrency(amountPaid, currency)} paid`
                            : "Unpaid"
                }
            />
        );
    }

    return (
        <div className="flex items-center gap-1">
            <Checkbox
                checked={isFullyPaid}
                onCheckedChange={onTogglePaid}
                className="size-5"
            />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    render={
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-7 shrink-0 text-muted-foreground"
                            aria-label="Record payment"
                            title={
                                isPartial
                                    ? `${formatCurrency(amountPaid, currency)} paid of ${formatCurrency(amount, currency)}`
                                    : "Add or subtract payment"
                            }
                        >
                            <HugeiconsIcon icon={MoneySend01Icon} strokeWidth={2} className="size-4" />
                        </Button>
                    }
                />
                <PopoverContent align="start" className="w-72">
                    <PopoverHeader>
                        <PopoverTitle>Payment</PopoverTitle>
                        <PopoverDescription>
                            Paid {formatCurrency(amountPaid, currency)} of {formatCurrency(amount, currency)}
                            {remaining > 0 && (
                                <>
                                    {" "}
                                    · {formatCurrency(remaining, currency)} remaining
                                </>
                            )}
                        </PopoverDescription>
                    </PopoverHeader>
                    <div className="space-y-3">
                        <Input
                            type="number"
                            min={0}
                            step="any"
                            inputMode="decimal"
                            placeholder="Amount"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            aria-label="Payment amount"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={!canAdjust || amountPaid <= 0}
                                onClick={() => handleAdjust(-1)}
                            >
                                Subtract
                            </Button>
                            <Button
                                type="button"
                                disabled={!canAdjust || remaining <= 0}
                                onClick={() => handleAdjust(1)}
                            >
                                Add
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
