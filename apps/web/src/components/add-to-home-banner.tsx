import { useState } from "react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Cancel01Icon,
    Download01Icon,
    Share08Icon,
} from "@hugeicons/core-free-icons";

/**
 * Bottom “Add to Home Screen” banner for mobile web only.
 * Hidden when already installed (standalone) or dismissed recently.
 */
export function AddToHomeBanner() {
    const { visible, isIos, canPrompt, installing, install, dismiss } = useInstallPrompt();
    const [showIosHelp, setShowIosHelp] = useState(false);

    if (!visible) return null;

    const onPrimary = async () => {
        if (canPrompt) {
            await install();
            return;
        }
        if (isIos) {
            setShowIosHelp((v) => !v);
        }
    };

    return (
        <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 md:hidden"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
            <div
                role="dialog"
                aria-label="Add Pennora to your home screen"
                className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-lg backdrop-blur-xl supports-backdrop-filter:bg-background/70"
            >
                <div className="flex items-start gap-3 p-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border">
                        <Logo size={28} className="rounded-lg" />
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-semibold leading-tight">Install Pennora</p>
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                            {isIos
                                ? "Add to your Home Screen for a full-screen app experience."
                                : "Install the app on your phone for quicker access and offline use."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={dismiss}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Dismiss"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
                    </button>
                </div>

                {showIosHelp && isIos && (
                    <div className="space-y-2 border-t border-border/60 bg-muted/30 px-3.5 py-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">On iPhone / iPad:</p>
                        <ol className="list-decimal space-y-1.5 pl-4">
                            <li>
                                Tap{" "}
                                <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                                    Share
                                    <HugeiconsIcon
                                        icon={Share08Icon}
                                        strokeWidth={2}
                                        className="inline size-3.5"
                                    />
                                </span>{" "}
                                in Safari
                            </li>
                            <li>
                                Scroll and choose{" "}
                                <span className="font-medium text-foreground">Add to Home Screen</span>
                            </li>
                            <li>
                                Tap <span className="font-medium text-foreground">Add</span>
                            </li>
                        </ol>
                    </div>
                )}

                <div className="flex gap-2 border-t border-border/60 p-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={dismiss}
                    >
                        Not now
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        disabled={installing}
                        onClick={onPrimary}
                    >
                        <HugeiconsIcon
                            icon={isIos ? Share08Icon : Download01Icon}
                            strokeWidth={2}
                            className="size-4"
                        />
                        {isIos
                            ? showIosHelp
                                ? "Hide steps"
                                : "How to add"
                            : installing
                              ? "Installing…"
                              : "Add to Home"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
