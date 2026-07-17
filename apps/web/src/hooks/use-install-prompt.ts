import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "pennora-a2hs-dismissed";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/** Chromium install event (not available on iOS Safari). */
export type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay(): boolean {
    if (typeof window === "undefined") return true;
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    // iOS Safari home-screen launch
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return true;
    return false;
}

function isIosSafari(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const iOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const webkit = /WebKit/i.test(ua);
    const notOther = !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
    return iOS && webkit && notOther;
}

function isMobileUa(): boolean {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function wasDismissedRecently(): boolean {
    try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return false;
        const ts = Number(raw);
        if (!Number.isFinite(ts)) return false;
        return Date.now() - ts < DISMISS_MS;
    } catch {
        return false;
    }
}

/**
 * Mobile-web only “Add to Home Screen” / install affordance.
 * - Android/Chrome: uses beforeinstallprompt
 * - iOS Safari: shows Share → Add to Home Screen steps
 */
export function useInstallPrompt() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);
    const [ios, setIos] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (isStandaloneDisplay()) return;
        if (!isMobileUa()) return;
        if (wasDismissedRecently()) return;

        const iosSafari = isIosSafari();
        setIos(iosSafari);

        const onBip = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
        };
        window.addEventListener("beforeinstallprompt", onBip);

        // Small delay so first paint isn’t blocked
        const t = window.setTimeout(() => {
            if (iosSafari) setVisible(true);
        }, 1200);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBip);
            window.clearTimeout(t);
        };
    }, []);

    // When deferred prompt is captured (Chrome/Android), reveal banner
    useEffect(() => {
        if (deferred && !isStandaloneDisplay() && !wasDismissedRecently()) {
            setVisible(true);
        }
    }, [deferred]);

    const dismiss = useCallback(() => {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            /* ignore */
        }
        setVisible(false);
    }, []);

    const install = useCallback(async () => {
        if (!deferred) return false;
        setInstalling(true);
        try {
            await deferred.prompt();
            const choice = await deferred.userChoice;
            setDeferred(null);
            if (choice.outcome === "accepted") {
                setVisible(false);
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setInstalling(false);
        }
    }, [deferred]);

    return {
        visible,
        isIos: ios,
        canPrompt: !!deferred,
        installing,
        install,
        dismiss,
    };
}
