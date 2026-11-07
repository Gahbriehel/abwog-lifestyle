"use client";

import { Bell, X } from "lucide-react";
import { useRef, useState } from "react";
import { NotificationsCard } from "@/components/notifications/NotificationsCard";

/**
 * Bell in the header for signed-out visitors. It opens the notifications switch in a dialog, so the
 * home page stays clear. The card only mounts while the dialog is open.
 */
export function GuestNotifications() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
        aria-label="Notifications"
        className="inline-flex size-10 items-center justify-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-fg"
      >
        <Bell aria-hidden className="size-5" />
      </button>
      <dialog
        ref={dialog}
        aria-label="Notifications"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[var(--radius-card)] bg-bg p-0 text-fg backdrop:bg-black/50"
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close"
            className="absolute right-2 top-2 z-10 inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-muted"
          >
            <X aria-hidden className="size-5" />
          </button>
          {open && <NotificationsCard />}
        </div>
      </dialog>
    </>
  );
}
