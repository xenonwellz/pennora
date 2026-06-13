import { useState } from "react";
import {
    useBudgets,
    useActiveBudget,
    useCreateBudget,
    useSetActiveBudget,
} from "../lib/queries";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowDown01Icon,
    AddCircleIcon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export function BudgetSwitcher({ className }: { className?: string }) {
    const { data: budgets } = useBudgets();
    const { data: activeBudget } = useActiveBudget();
    const setActive = useSetActiveBudget();
    const createBudget = useCreateBudget();

    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");

    const handleCreate = async () => {
        if (!name.trim()) return;
        const budget = await createBudget.mutateAsync(name.trim());
        if (budget) await setActive.mutateAsync(budget.id);
        setName("");
        setShowCreate(false);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    className={cn(
                        "flex w-full items-center gap-2 rounded-lg border border-sidebar-border px-2.5 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        className,
                    )}
                >
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium text-sidebar-foreground">
                            {activeBudget?.name ?? "Select budget"}
                        </span>
                        <span className="truncate text-[11px] text-sidebar-foreground/50">
                            {budgets?.length
                                ? `${budgets.length} budget${budgets.length === 1 ? "" : "s"}`
                                : "No budgets yet"}
                        </span>
                    </div>
                    <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        strokeWidth={2}
                        className="size-3.5 shrink-0 text-sidebar-foreground/50"
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Budgets</DropdownMenuLabel>
                        {budgets?.map((budget) => (
                            <DropdownMenuItem
                                key={budget.id}
                                onClick={() => setActive.mutate(budget.id)}
                                className="justify-between"
                            >
                                <span className="truncate">{budget.name}</span>
                                {budget.id === activeBudget?.id && (
                                    <HugeiconsIcon
                                        icon={Tick02Icon}
                                        strokeWidth={2}
                                        className="size-4 text-sidebar-primary"
                                    />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowCreate(true)}>
                        <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                        Create new budget
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create budget</DialogTitle>
                        <DialogDescription>
                            Give your budget a name to start tracking expenses.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Budget name"
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCreate(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={createBudget.isPending || !name.trim()}
                            >
                                Create
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
