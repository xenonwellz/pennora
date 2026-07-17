import { useState } from "react";
import { signOut, useSession } from "../lib/clients/auth";
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
import { Logout02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

function userInitial(email: string | undefined) {
    if (!email) return "?";
    return email.charAt(0).toUpperCase();
}

type UserMenuProps = {
    /** Compact round avatar (mobile top bar). Full-width row in sidebar. */
    variant?: "avatar" | "row";
    className?: string;
};

export function UserMenu({ variant = "row", className }: UserMenuProps) {
    const { data: session } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);

    const handleSignOut = () => {
        signOut().then(() => window.location.assign("/login"));
    };

    return (
        <>
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                {variant === "avatar" ? (
                    <PopoverTrigger
                        className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            className,
                        )}
                        aria-label="Account menu"
                    >
                        {userInitial(session?.user.email)}
                    </PopoverTrigger>
                ) : (
                    <PopoverTrigger
                        className={cn(
                            "flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                            className,
                        )}
                    >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
                            {userInitial(session?.user.email)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-sidebar-foreground">
                                {session?.user.email}
                            </p>
                            <p className="text-[10px] text-sidebar-foreground/50">Signed in</p>
                        </div>
                    </PopoverTrigger>
                )}
                <PopoverContent
                    align={variant === "avatar" ? "end" : "start"}
                    side={variant === "avatar" ? "bottom" : "top"}
                    sideOffset={8}
                    className="z-100 w-56 rounded-xl border border-border bg-popover p-1 text-popover-foreground"
                >
                    {session?.user.email && (
                        <p className="truncate px-2.5 py-2 text-xs text-muted-foreground">
                            {session.user.email}
                        </p>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-popover-foreground/80 hover:bg-muted hover:text-destructive"
                        onClick={() => {
                            setMenuOpen(false);
                            setSignOutOpen(true);
                        }}
                    >
                        <HugeiconsIcon icon={Logout02Icon} strokeWidth={2} className="size-4" />
                        Sign out
                    </Button>
                </PopoverContent>
            </Popover>

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
        </>
    );
}
