import { Link, useRouterState } from "@tanstack/react-router";
import { BudgetSwitcher } from "./budget-switcher";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DashboardSquareEditIcon,
    MoneyBag02Icon,
    Settings01Icon,
    FileEditIcon,
} from "@hugeicons/core-free-icons";

const navItems = [
    { to: "/" as const, label: "Dashboard", icon: DashboardSquareEditIcon },
    { to: "/budget" as const, label: "Budget", icon: MoneyBag02Icon },
    { to: "/drafts" as const, label: "Drafts", icon: FileEditIcon },
    { to: "/settings" as const, label: "Settings", icon: Settings01Icon },
];

export function AppSidebar() {
    const router = useRouterState();
    const currentPath = router.location.pathname;

    return (
        <Sidebar className="border-r border-sidebar-border">
            <SidebarHeader className="gap-3 border-b border-sidebar-border px-3 py-4 shrink-0">
                <div className="flex items-center gap-3 px-1">
                    <Logo size={36} className="rounded-lg" />
                    <div className="min-w-0">
                        <p className="truncate font-heading text-sm font-semibold text-sidebar-foreground">
                            Pennora
                        </p>
                        <p className="truncate text-[11px] text-sidebar-foreground/50">
                            Expense tracking
                        </p>
                    </div>
                </div>
                <BudgetSwitcher />
            </SidebarHeader>

            <SidebarContent className="min-h-0 flex-1 overflow-auto px-2 py-3">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
                        Menu
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const isActive =
                                    item.to === "/"
                                        ? currentPath === "/"
                                        : currentPath.startsWith(item.to);
                                return (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            isActive={isActive}
                                            render={<Link to={item.to} />}
                                            tooltip={item.label}
                                        >
                                            <HugeiconsIcon
                                                icon={item.icon}
                                                strokeWidth={2}
                                                className="size-4 shrink-0"
                                            />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* Desktop only — mobile uses top-bar avatar for account / sign out */}
            <SidebarSeparator className="hidden md:block" />
            <SidebarFooter className="hidden gap-2 p-3 shrink-0 md:flex">
                <UserMenu variant="row" />
            </SidebarFooter>
        </Sidebar>
    );
}
