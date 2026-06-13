import { createRootRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useSession } from "../lib/clients/auth";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/sidebar";

const PUBLIC_ROUTES = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);
const AUTH_ONLY_ROUTES = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

function isPublicRoute(pathname: string) {
    if (PUBLIC_ROUTES.has(pathname)) return true;
    return pathname.startsWith("/invite/");
}

function Layout() {
    const { data: session, isPending } = useSession();
    const pathname = useRouterState({ select: (state) => state.location.pathname });

    if (isPending) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary/20 animate-pulse" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        if (!isPublicRoute(pathname)) {
            return <Navigate to="/login" />;
        }
        return <Outlet />;
    }

    if (AUTH_ONLY_ROUTES.has(pathname)) {
        return <Navigate to="/" />;
    }

    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
                        <SidebarTrigger />
                    </header>
                    <div className="flex-1 overflow-auto">
                        <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
                            <Outlet />
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
}

export const Route = createRootRoute({
    component: Layout,
});
