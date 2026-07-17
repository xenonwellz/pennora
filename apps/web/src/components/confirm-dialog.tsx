import {
    Dialog,
    DialogFooter,
    DialogPanelBody,
    DialogPanelContent,
    DialogPanelHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    pending?: boolean;
    onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    destructive = true,
    pending = false,
    onConfirm,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPanelContent>
                <DialogPanelHeader title={title} description={description} />
                <DialogPanelBody>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={pending}
                        >
                            {cancelLabel}
                        </Button>
                        <Button
                            variant={destructive ? "destructive" : "default"}
                            disabled={pending}
                            onClick={async () => {
                                await onConfirm();
                                onOpenChange(false);
                            }}
                        >
                            {confirmLabel}
                        </Button>
                    </DialogFooter>
                </DialogPanelBody>
            </DialogPanelContent>
        </Dialog>
    );
}
