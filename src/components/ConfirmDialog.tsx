import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

/*
 * Bestätigungsdialog im kaufma-Design – ersetzt window.confirm().
 * Usage: const { confirm } = useConfirmDialog()
 *        if (!(await confirm({ title, message, confirmLabel, danger }))) return;
 * Escape, Klick auf den Hintergrund und "Abbrechen" ergeben false.
 */

export type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Rot statt Grün – für Löschen und andere nicht umkehrbare Aktionen. */
  danger?: boolean;
};

type Ctx = { confirm: (opts: ConfirmOptions) => Promise<boolean> };

const ConfirmContext = createContext<Ctx | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    // Ein noch offener Dialog gilt als abgebrochen.
    resolver.current?.(false);
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <DialogPrimitive.Root open={!!opts} onOpenChange={(open) => !open && close(false)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className="fixed inset-0 z-[60] data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
            style={{ background: "rgba(0,0,0,0.3)" }}
          />
          <DialogPrimitive.Content
            // Fokus startet auf "Abbrechen": ein versehentliches Enter löscht nichts.
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
            }}
            className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-32px)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 bg-white focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] motion-reduce:animate-none"
            style={{ border: "1px solid #EAE6DF", borderRadius: 14, padding: 24, boxShadow: "0 24px 48px -24px rgba(28,25,23,0.35)" }}
          >
            {opts && (
              <>
                <DialogPrimitive.Title className="font-display text-[18px] font-extrabold leading-tight tracking-[-0.02em] text-[#1C1917]">
                  {opts.title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2 font-sans text-[14px] leading-[1.6] text-[#78716C]">
                  {opts.message}
                </DialogPrimitive.Description>
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    data-cancel
                    onClick={() => close(false)}
                    className="flex-1 rounded-[8px] border border-[#EAE6DF] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1C1917] transition-colors hover:border-[#1C1917] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1917]"
                  >
                    {opts.cancelLabel ?? "Abbrechen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => close(true)}
                    className={`flex-1 rounded-[8px] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      opts.danger
                        ? "bg-[#DC2626] hover:bg-[#B91C1C] focus-visible:outline-[#DC2626]"
                        : "bg-[#2D6A4F] hover:bg-[#235740] focus-visible:outline-[#2D6A4F]"
                    }`}
                  >
                    {opts.confirmLabel ?? "Bestätigen"}
                  </button>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog(): Ctx {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirmDialog braucht einen ConfirmDialogProvider (in __root.tsx).");
  return ctx;
}
