import { useRef, useState } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ArrowLeft, ArrowSquareOut, ArrowsClockwise, Bell, Check, DotsThree, X } from "@phosphor-icons/react";
import type { ProzessStatus } from "@/lib/types";

const STATUSES: ProzessStatus[] = ["Kontaktiert", "Besichtigung", "Finanzierung", "Angebot & Verhandlung", "Gekauft", "Abgelehnt"];

// 36px Zeilen, auf Touch-Geräten 44px.
const itemCls =
  "group/item flex w-full items-center gap-2.5 h-9 [@media(pointer:coarse)]:h-11 px-3 rounded-[6px] text-[13px] text-[#1C1917] outline-none cursor-pointer select-none transition-colors data-[highlighted]:bg-[#F5F3EE]";
const iconCls = "size-4 shrink-0 text-[#78716C]";

/**
 * "…"-Menü auf einer Pipeline-Karte. Radix übernimmt Fokus, Escape und Klick außerhalb.
 * `data-stop` hält Klicks davon ab, die Karte (Detail öffnen) auszulösen – auch aus dem Portal heraus.
 */
export function PipelineCardMenu({
  title,
  status,
  onOpen,
  onStatus,
  onReminder,
  onRemove,
}: {
  title: string;
  status: ProzessStatus;
  onOpen: () => void;
  onStatus: (s: ProzessStatus) => void;
  onReminder: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "status">("main");
  // Erinnerung erst öffnen, wenn das Menü zu ist – sonst schließt die Fokus-Rückgabe an "…" das Popover gleich wieder.
  const reminderPending = useRef(false);

  return (
    <Menu.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setView("main");
      }}
    >
      <Menu.Trigger asChild>
        <button
          type="button"
          data-stop
          aria-label={`Aktionen für ${title}`}
          className="inline-grid place-items-center rounded-[6px] px-1.5 py-1 [@media(pointer:coarse)]:size-11 [@media(pointer:coarse)]:-m-2.5 text-[#A8A29E] transition-colors hover:bg-[#F5F3EE] hover:text-[#1C1917] data-[state=open]:bg-[#F5F3EE] data-[state=open]:text-[#1C1917] focus-visible:outline-2 focus-visible:outline-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsThree size={16} weight="bold" aria-hidden />
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          data-stop
          align="end"
          side="bottom"
          sideOffset={4}
          collisionPadding={12}
          onClick={(e) => e.stopPropagation()}
          onCloseAutoFocus={(e) => {
            if (!reminderPending.current) return;
            reminderPending.current = false;
            e.preventDefault();
            onReminder();
          }}
          className="z-50 min-w-[180px] rounded-[10px] border border-[#EAE6DF] bg-white p-1 font-sans shadow-[0_4px_16px_rgba(0,0,0,0.08)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 origin-(--radix-dropdown-menu-content-transform-origin)"
        >
          {view === "main" ? (
            <>
              <Menu.Item className={itemCls} onSelect={onOpen}>
                <ArrowSquareOut className={iconCls} aria-hidden /> Immobilie öffnen
              </Menu.Item>
              <Menu.Item
                className={itemCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setView("status");
                }}
              >
                <ArrowsClockwise className={iconCls} aria-hidden /> Status ändern
              </Menu.Item>
              <Menu.Item className={itemCls} onSelect={() => { reminderPending.current = true; }}>
                <Bell className={iconCls} aria-hidden /> Erinnerung setzen
              </Menu.Item>
              <Menu.Separator className="my-1 h-px bg-[#EAE6DF]" />
              <Menu.Item className={`${itemCls} data-[highlighted]:text-[#DC2626]`} onSelect={onRemove}>
                <X className={`${iconCls} group-data-[highlighted]/item:text-[#DC2626]`} aria-hidden /> Aus Pipeline entfernen
              </Menu.Item>
            </>
          ) : (
            <>
              <Menu.Item
                className={`${itemCls} text-[#78716C]`}
                onSelect={(e) => {
                  e.preventDefault();
                  setView("main");
                }}
              >
                <ArrowLeft className={iconCls} aria-hidden /> Status ändern
              </Menu.Item>
              <Menu.Separator className="my-1 h-px bg-[#EAE6DF]" />
              {STATUSES.map((s) => (
                <Menu.Item key={s} className={itemCls} onSelect={() => onStatus(s)}>
                  <span className="size-4 shrink-0 grid place-items-center" aria-hidden>
                    {s === status && <Check size={14} weight="bold" className="text-primary" />}
                  </span>
                  {s}
                </Menu.Item>
              ))}
            </>
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
