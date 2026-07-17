import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSession, authClient } from "../lib/clients/auth";
import {
    useCategories,
    useCreateCategory,
    useDeleteCategory,
    useTags,
    useCreateTag,
    useDeleteTag,
    useActiveBudget,
    useBudgetMembers,
    useInviteToBudget,
    useRemoveBudgetMember,
    useAuthConfig,
} from "../lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PanelCard, PanelCardContent, PanelCardHeader } from "@/components/panel-card";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AddCircleIcon,
    Folder01Icon,
    Tag01Icon,
    Delete01Icon,
    UserAccountIcon,
    SecurityCheckIcon,
    UserGroupIcon,
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/settings")({
    component: SettingsPage,
});

type Tab = "categories" | "tags" | "members" | "profile" | "security";

function SettingsPage() {
    const { data: activeBudget } = useActiveBudget();
    const [tab, setTab] = useState<Tab>("categories");
    const tabListRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Map<Tab, HTMLButtonElement>>(new Map());

    const tabs: { key: Tab; label: string; icon: typeof Folder01Icon; ownerOnly?: boolean }[] = [
        { key: "categories", label: "Categories", icon: Folder01Icon },
        { key: "tags", label: "Tags", icon: Tag01Icon },
        { key: "members", label: "Members", icon: UserGroupIcon, ownerOnly: true },
        { key: "profile", label: "Profile", icon: UserAccountIcon },
        { key: "security", label: "Security", icon: SecurityCheckIcon },
    ];

    const visibleTabs = tabs.filter((t) => !t.ownerOnly || activeBudget?.isOwner);

    // Keep the active tab roughly centered in the horizontal scroller
    useEffect(() => {
        const list = tabListRef.current;
        const activeEl = tabRefs.current.get(tab);
        if (!list || !activeEl) return;

        const listRect = list.getBoundingClientRect();
        const tabRect = activeEl.getBoundingClientRect();
        const tabCenter = tabRect.left - listRect.left + list.scrollLeft + tabRect.width / 2;
        const target = tabCenter - list.clientWidth / 2;
        const max = list.scrollWidth - list.clientWidth;
        const next = Math.max(0, Math.min(target, max));

        list.scrollTo({ left: next, behavior: "smooth" });
    }, [tab, visibleTabs.length]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-heading font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your account and budget metadata</p>
            </div>

            <div
                ref={tabListRef}
                className="flex gap-1 border-b border-border overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {visibleTabs.map((t) => (
                    <button
                        key={t.key}
                        ref={(el) => {
                            if (el) tabRefs.current.set(t.key, el);
                            else tabRefs.current.delete(t.key);
                        }}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                            tab === t.key
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                    >
                        <HugeiconsIcon icon={t.icon} strokeWidth={2} className="size-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "categories" && <CategoriesSection />}
            {tab === "tags" && <TagsSection />}
            {tab === "members" && activeBudget?.isOwner && <MembersSection />}
            {tab === "profile" && <ProfileSection />}
            {tab === "security" && <SecuritySection />}
        </div>
    );
}

function CategoriesSection() {
    const { data: categories, isLoading } = useCategories();
    const [name, setName] = useState("");
    const createCategory = useCreateCategory();
    const deleteCategory = useDeleteCategory();

    const add = async () => {
        if (!name.trim()) return;
        await createCategory.mutateAsync(name.trim());
        setName("");
    };

    return (
        <PanelCard>
            <PanelCardHeader title="Categories" />
            <PanelCardContent>
                <div className="flex flex-col gap-2 sm:flex-row mb-4">
                    <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Category name"
                        onKeyDown={(e) => e.key === "Enter" && add()}
                        className="flex-1"
                    />
                    <Button onClick={add} disabled={createCategory.isPending} className="shrink-0 w-full sm:w-auto">
                        <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                        Add
                    </Button>
                </div>

                {isLoading && <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />}

                <div className="space-y-1">
                    {categories?.map((c: { id: string; name: string }) => (
                        <div
                            key={c.id}
                            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="size-8 rounded-xl bg-chart-1/10 flex items-center justify-center">
                                    <HugeiconsIcon
                                        icon={Folder01Icon}
                                        strokeWidth={2}
                                        className="size-4 text-chart-1"
                                    />
                                </div>
                                <span className="text-sm">{c.name}</span>
                            </div>
                            <button
                                onClick={() => deleteCategory.mutate(c.id)}
                                className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                            >
                                <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                            </button>
                        </div>
                    ))}

                    {categories && categories.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No categories yet.</p>
                    )}
                </div>
            </PanelCardContent>
        </PanelCard>
    );
}

function TagsSection() {
    const { data: tags, isLoading } = useTags();
    const [name, setName] = useState("");
    const createTag = useCreateTag();
    const deleteTag = useDeleteTag();

    const add = async () => {
        if (!name.trim()) return;
        await createTag.mutateAsync(name.trim());
        setName("");
    };

    return (
        <PanelCard>
            <PanelCardHeader title="Tags" />
            <PanelCardContent>
                <div className="flex flex-col gap-2 sm:flex-row mb-4">
                    <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tag name"
                        onKeyDown={(e) => e.key === "Enter" && add()}
                        className="flex-1"
                    />
                    <Button onClick={add} disabled={createTag.isPending} className="shrink-0 w-full sm:w-auto">
                        <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                        Add
                    </Button>
                </div>

                {isLoading && <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />}

                <div className="space-y-1">
                    {tags?.map((t: { id: string; name: string }) => (
                        <div
                            key={t.id}
                            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="size-8 rounded-xl bg-chart-2/10 flex items-center justify-center">
                                    <HugeiconsIcon icon={Tag01Icon} strokeWidth={2} className="size-4 text-chart-2" />
                                </div>
                                <span className="text-sm">{t.name}</span>
                            </div>
                            <button
                                onClick={() => deleteTag.mutate(t.id)}
                                className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                            >
                                <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                            </button>
                        </div>
                    ))}

                    {tags && tags.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No tags yet.</p>
                    )}
                </div>
            </PanelCardContent>
        </PanelCard>
    );
}

function MembersSection() {
    const { data: config } = useAuthConfig();
    const { data: members, isLoading } = useBudgetMembers();
    const inviteToBudget = useInviteToBudget();
    const removeMember = useRemoveBudgetMember();
    const [email, setEmail] = useState("");
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [error, setError] = useState("");

    const submit = async () => {
        if (!email.trim()) return;
        setError("");
        setInviteUrl(null);
        try {
            const result = await inviteToBudget.mutateAsync(email.trim());
            if (!result.emailSent) {
                setInviteUrl(result.inviteUrl);
            }
            setEmail("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send invitation");
        }
    };

    const copyLink = async () => {
        if (!inviteUrl) return;
        await navigator.clipboard.writeText(inviteUrl);
    };

    return (
        <PanelCard>
            <PanelCardHeader title="Team members" />
            <PanelCardContent>
                <div className="flex flex-col gap-2 sm:flex-row mb-4">
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="collaborator@example.com"
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        className="flex-1"
                    />
                    <Button onClick={submit} disabled={inviteToBudget.isPending || !email.trim()} className="shrink-0 w-full sm:w-auto">
                        <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                        Invite
                    </Button>
                </div>

                {error && <p className="text-sm text-destructive mb-4">{error}</p>}

                {inviteUrl && (
                    <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                        <p className="text-sm text-muted-foreground">
                            {config?.emailEnabled
                                ? "Invitation created. Email could not be sent — share this link instead:"
                                : "Email is not configured. Copy and share this invite link:"}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Input readOnly value={inviteUrl} className="text-xs flex-1 min-w-0" />
                            <Button variant="outline" onClick={copyLink} className="shrink-0 w-full sm:w-auto">
                                Copy
                            </Button>
                        </div>
                    </div>
                )}

                {isLoading && <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />}

                <div className="space-y-1">
                    {members?.map((member: { id: string; email: string; status: string }) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 group"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{member.email}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    {member.status}
                                    {member.status === "pending" ? " · expires soon" : ""}
                                </p>
                            </div>
                            <button
                                onClick={() => removeMember.mutate(member.id)}
                                className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
                            >
                                <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                            </button>
                        </div>
                    ))}

                    {members && members.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No collaborators yet. Invite someone by email.
                        </p>
                    )}
                </div>
            </PanelCardContent>
        </PanelCard>
    );
}

function ProfileSection() {
    const { data: session } = useSession();
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        setName(session?.user.name ?? "");
    }, [session?.user.name]);

    const submit = async () => {
        setError(null);
        setSuccess(false);
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Name is required.");
            return;
        }
        setPending(true);
        try {
            const result = await authClient.updateUser({ name: trimmed });
            if (result.error) {
                setError(result.error.message ?? "Failed to update profile.");
                return;
            }
            setSuccess(true);
        } catch {
            setError("Failed to update profile.");
        } finally {
            setPending(false);
        }
    };

    const hasChanges = name.trim() !== (session?.user.name ?? "");

    return (
        <PanelCard>
            <PanelCardHeader title="Profile" />
            <PanelCardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        placeholder="Your name"
                        className="w-full"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                        type="email"
                        value={session?.user.email ?? ""}
                        readOnly
                        disabled
                        autoComplete="email"
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        Email cannot be changed here. Use password reset or contact support if you need a new address.
                    </p>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-success">Profile updated.</p>}
                <Button onClick={submit} disabled={pending || !name.trim() || !hasChanges}>
                    Save changes
                </Button>
            </PanelCardContent>
        </PanelCard>
    );
}

function SecuritySection() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [pending, setPending] = useState(false);

    const submit = async () => {
        setError(null);
        setSuccess(false);
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        setPending(true);
        try {
            const result = await authClient.changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true,
            });
            if (result.error) {
                setError(result.error.message ?? "Failed to change password.");
                return;
            }
            setSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch {
            setError("Failed to change password.");
        } finally {
            setPending(false);
        }
    };

    return (
        <PanelCard>
            <PanelCardHeader title="Change password" />
            <PanelCardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Current password</Label>
                    <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full"
                    />
                </div>
                <div className="space-y-2">
                    <Label>New password</Label>
                    <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Confirm new password</Label>
                    <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full"
                    />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-success">Password updated.</p>}
                <Button onClick={submit} disabled={pending || !currentPassword || !newPassword}>
                    Update password
                </Button>
            </PanelCardContent>
        </PanelCard>
    );
}
