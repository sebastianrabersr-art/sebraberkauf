import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

interface CheckoutOptions {
  priceId: string;
  title?: string;
  returnUrl?: string;
}

export function useStripeCheckout() {
  const [opts, setOpts] = useState<CheckoutOptions | null>(null);

  const openCheckout = useCallback((o: CheckoutOptions) => setOpts(o), []);
  const closeCheckout = useCallback(() => setOpts(null), []);

  const checkoutDialog = (
    <Dialog open={!!opts} onOpenChange={(o) => !o && closeCheckout()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{opts?.title ?? "Zahlung"}</DialogTitle>
        </DialogHeader>
        {opts && <StripeEmbeddedCheckout priceId={opts.priceId} returnUrl={opts.returnUrl} />}
      </DialogContent>
    </Dialog>
  );

  return { openCheckout, closeCheckout, checkoutDialog, isOpen: !!opts };
}
