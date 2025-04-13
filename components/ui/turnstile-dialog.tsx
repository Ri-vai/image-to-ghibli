import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
interface TurnstileDialogProps {
  open: boolean;
  onClose: () => void;
  onVerify: (token: string) => void;
}

export function TurnstileDialog({
  open,
  onClose,
  onVerify,
}: TurnstileDialogProps) {
  const t = useTranslations();
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("turnstile.verifyYouAreHuman")}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!}
            onSuccess={onVerify}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
