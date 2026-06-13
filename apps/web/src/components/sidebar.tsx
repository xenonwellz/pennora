import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { signOut, useSession } from "../lib/clients/auth";
import { BudgetSwitcher } from "./budget-switcher";
import { Logo } from "./logo";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogFooter,
    DialogPanelBody,
    DialogPanelContent,
    DialogPanelHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DashboardSquareEditIcon,
    MoneyBag02Icon,
    Settings01Icon,
    Logout02Icon,
} from "@hugeicons/core-free-icons";

const navItems = [
    { to: "/" as const, label: "Dashboard", icon: DashboardSquareEditIcon },
    { to: "/budget" as const, label: "Budget", icon: MoneyBag02Icon },
    { to: "/settings" as const, label: "Settings", icon: Settings01Icon },
];

function userInitial(email: string | undefined) {
    if (!email) return "?";
    return email.charAt(0).toUpperCase();
}

export function AppSidebar() {
    const { data: session } = useSession();
    const router = useRouterState();
    const currentPath = router.location.pathname;
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);

    const handleSignOut = () => {
        signOut().then(() => window.location.assign("/login"));
    };

    return (
        <Sidebar className="border-r border-sidebar-border">
            <SidebarHeader className="gap-3 border-b border-sidebar-border px-3 py-4">
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

            <SidebarContent className="px-2 py-3">
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

            <SidebarSeparator />

            <SidebarFooter className="gap-2 p-3">
                <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                    <PopoverTrigger
                        className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
                            {userInitial(session?.user.email)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-sidebar-foreground">
                                {session?.user.email}
                            </p>
                            <p className="text-[10px] text-sidebar-foreground/50">Signed in</p>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        side="top"
                        sideOffset={8}
                        className="z-[100] w-56 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 text-popover-foreground/80 hover:bg-muted hover:text-destructive"
                            onClick={() => {
                                setUserMenuOpen(false);
                                setSignOutOpen(true);
                            }}
                        >
                            <HugeiconsIcon
                                icon={Logout02Icon}
                                strokeWidth={2}
                                className="size-4"
                            />
                            Sign out
                        </Button>
                    </PopoverContent>
                </Popover>
            </SidebarFooter>

            <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
                <DialogPanelContent showCloseButton={false} className="max-w-sm">
                    <DialogPanelHeader title="Sign out?" />
                    <DialogPanelBody>
                        <DialogFooter className="px-0 py-0">
                            <Button variant="outline" onClick={() => setSignOutOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleSignOut}>
                                Sign out
                            </Button>
                        </DialogFooter>
                    </DialogPanelBody>
                </DialogPanelContent>
            </Dialog>
        </Sidebar>
    );
}
