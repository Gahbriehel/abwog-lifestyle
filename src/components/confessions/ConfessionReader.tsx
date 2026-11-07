"use client";

import { ALargeSmall, ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { listensLabel, readingLabel, type PlayableAudioMap } from "@/lib/confessions";
import { buildChunks } from "@/lib/speech";
import { saveString, useStoredString } from "@/lib/useBrowser";
import type { ConfessionNeighbour } from "@/lib/types";
import { AudioPlayer } from "./AudioPlayer";
import { SpeechPlayer } from "./SpeechPlayer";

const SIZE_KEY = "confession-text-size";
// Default matches the 14px body copy; the buttons step up for easier reading.
const SIZES = ["text-sm", "text-base", "text-xl"] as const;

interface Props {
  id: string;
  title: string;
  scriptureRef: string | null;
  position: number | null;
  wordCount: number;
  listenCount: number;
  showListenCounts: boolean;
  paragraphs: string[];
  audio: PlayableAudioMap;
  previous: ConfessionNeighbour | null;
  next: ConfessionNeighbour | null;
  churchName: string;
}

export function ConfessionReader({
  id,
  title,
  scriptureRef,
  position,
  wordCount,
  listenCount,
  showListenCounts,
  paragraphs,
  audio,
  previous,
  next,
  churchName,
}: Props) {
  const storedSize = Number(useStoredString(SIZE_KEY));
  const size = Number.isInteger(storedSize) && storedSize >= 0 && storedSize < SIZES.length ? storedSize : 0;
  const [active, setActive] = useState<number | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const chunks = useMemo(() => buildChunks(paragraphs), [paragraphs]);
  const hasRecording = Boolean(audio.female || audio.male) && !audioFailed;

  const changeSize = (delta: number) => {
    saveString(SIZE_KEY, String(Math.min(SIZES.length - 1, Math.max(0, size + delta))));
  };

  // Keep the sentence being read in view.
  useEffect(() => {
    if (active === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .querySelector(`[data-chunk="${active}"]`)
      ?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  const meta = [
    position ? `Confession ${position}` : null,
    readingLabel(wordCount),
    showListenCounts ? listensLabel(listenCount) : null,
  ].filter(Boolean);

  let chunkIndex = 0;

  return (
    <div className="w-full lg:max-w-2xl">
      <Link href="/confessions" className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 self-start px-2 text-sm font-semibold text-primary">
        <ChevronLeft aria-hidden className="size-5" />
        All confessions
      </Link>

      <p className="text-sm text-fg-muted">{meta.join(" · ")}</p>
      <h1 className="type-title mt-1">{title}</h1>
      {scriptureRef && <p className="mt-1 text-sm font-medium text-gold">{scriptureRef}</p>}

      <section aria-label="Listen" className="mt-5 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-xs sm:p-5">
        <h2 className="type-card mb-3 flex items-center gap-2">
          <Headphones aria-hidden className="size-4 text-gold" />
          Listen
        </h2>
        {hasRecording ? (
          <AudioPlayer confessionId={id} title={title} subtitle={churchName} audio={audio} onFailed={() => setAudioFailed(true)} />
        ) : (
          <>
            {audioFailed && (
              <p role="status" className="mb-3 rounded-[var(--radius-control)] bg-surface-muted px-3 py-2 text-sm text-fg-muted">
                We couldn&apos;t play the recording, so your phone can read it to you instead.
              </p>
            )}
            <SpeechPlayer confessionId={id} chunks={chunks} onActive={setActive} />
          </>
        )}
      </section>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="type-card">Read</h2>
        <div className="flex items-center gap-1" role="group" aria-label="Text size">
          <button
            type="button"
            onClick={() => changeSize(-1)}
            disabled={size === 0}
            aria-label="Smaller text"
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-muted disabled:opacity-40"
          >
            <ALargeSmall aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => changeSize(1)}
            disabled={size === SIZES.length - 1}
            aria-label="Larger text"
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-muted disabled:opacity-40"
          >
            <ALargeSmall aria-hidden className="size-7" />
          </button>
        </div>
      </div>

      <article className={cn("mt-2 space-y-5 leading-relaxed", SIZES[size])}>
        {paragraphs.map((paragraph, p) => {
          const own = chunks.filter((c) => c.paragraph === p);
          return (
            <p key={p}>
              {own.map((chunk) => {
                const i = chunkIndex++;
                return (
                  <Fragment key={i}>
                    <span
                      data-chunk={i}
                      aria-current={active === i ? "true" : undefined}
                      className={cn("rounded px-0.5 transition-colors", active === i && "bg-gold-soft")}
                    >
                      {chunk.text}
                    </span>{" "}
                  </Fragment>
                );
              })}
            </p>
          );
        })}
      </article>

      {(previous || next) && (
        <nav aria-label="More confessions" className="mt-10 grid grid-cols-2 gap-3 border-t border-border pt-5">
          {previous ? (
            <Link href={`/confessions/${previous.slug}`} className="flex min-h-14 flex-col rounded-[var(--radius-control)] border border-border px-3 py-2 hover:bg-surface-muted">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                <ChevronLeft aria-hidden className="size-3.5" />
                Previous
              </span>
              <span className="mt-0.5 line-clamp-2 text-sm font-medium">{previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/confessions/${next.slug}`} className="flex min-h-14 flex-col items-end rounded-[var(--radius-control)] border border-border px-3 py-2 text-right hover:bg-surface-muted">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Next
                <ChevronRight aria-hidden className="size-3.5" />
              </span>
              <span className="mt-0.5 line-clamp-2 text-sm font-medium">{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
