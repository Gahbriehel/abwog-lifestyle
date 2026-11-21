"use client";

import { ExternalLink, X } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * The event's cover, cropped to fit the layout. Tapping it opens the whole image in a lightbox
 * (a native <dialog>, so Esc and focus trapping come free), where it can be long-pressed to save
 * or opened on its own.
 */
export function EventImage({ src, title, className }: { src: string; title: string; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`View full image for ${title}`}
        className={cn("block w-full cursor-zoom-in overflow-hidden rounded-[var(--radius-card)]", className)}
      >
        <Image src={src} alt="" width={1200} height={675} unoptimized className="aspect-video w-full object-cover" />
      </button>

      <dialog
        ref={dialog}
        aria-label={`${title} image`}
        onClick={(e) => {
          // A click on the backdrop (or the empty space around the image) lands on the <dialog> itself.
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 outline-none backdrop:bg-black/90"
      >
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) dialog.current?.close();
          }}
          className="flex h-full flex-col items-center justify-center gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex w-full max-w-5xl justify-end gap-2">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20"
            >
              <ExternalLink aria-hidden className="size-4" />
              Open original
            </a>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close image"
              className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {/* Plain <img> so it keeps its natural size and long-press "Save image" works everywhere. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={title} className="min-h-0 max-w-full flex-1 object-contain" />
        </div>
      </dialog>
    </>
  );
}
