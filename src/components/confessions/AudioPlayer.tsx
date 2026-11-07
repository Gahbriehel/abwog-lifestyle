"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { clock, parseSpeed, PLAYBACK_SPEEDS, speedLabel, type PlayableAudioMap } from "@/lib/confessions";
import { cn } from "@/lib/cn";
import { saveString, useStoredString } from "@/lib/useBrowser";
import type { ConfessionVoice } from "@/lib/types";
import { useListenCounter } from "./useListenCounter";

const SPEED_KEY = "confession-audio-speed";
const SKIP_SECONDS = 15;

interface Props {
  confessionId: string;
  title: string;
  subtitle: string;
  audio: PlayableAudioMap;
  /** Called if the file can't be played at all, so the page can offer the phone's voice instead. */
  onFailed: () => void;
}

export function AudioPlayer({ confessionId, title, subtitle, audio, onFailed }: Props) {
  const voices = (["female", "male"] as const).filter((v) => audio[v]);
  const [voice, setVoice] = useState<ConfessionVoice>(voices[0]);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [interrupted, setInterrupted] = useState(false);
  const [duration, setDuration] = useState(audio[voices[0]]?.durationSec ?? 0);
  const speed = parseSpeed(useStoredString(SPEED_KEY));
  const el = useRef<HTMLAudioElement>(null);
  const lastTime = useRef(0);
  const resume = useRef<{ fraction: number; play: boolean } | null>(null);
  const addListened = useListenCounter(confessionId);

  // The saved speed applies to the element now, and again whenever the file changes (the browser resets it).
  useEffect(() => {
    if (el.current) el.current.playbackRate = speed;
  }, [speed, voice]);

  // The audio tag is in the server-rendered page, so a file that fails to load can fail before this code
  // is running and its error event is missed. Look for that failure now, and again when the voice changes.
  useEffect(() => {
    const audioEl = el.current;
    if (audioEl && audioEl.error && audioEl.readyState === 0) onFailed();
  }, [voice, onFailed]);

  const chooseSpeed = (next: (typeof PLAYBACK_SPEEDS)[number]) => saveString(SPEED_KEY, String(next));

  const toggle = useCallback(() => {
    const audioEl = el.current;
    if (!audioEl) return;
    if (audioEl.paused) void audioEl.play().catch(() => setPlaying(false));
    else audioEl.pause();
  }, []);

  const skip = useCallback((seconds: number) => {
    const audioEl = el.current;
    if (!audioEl) return;
    const max = Number.isFinite(audioEl.duration) ? audioEl.duration : Infinity;
    audioEl.currentTime = Math.min(max, Math.max(0, audioEl.currentTime + seconds));
  }, []);

  // Lock-screen and headset controls.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: subtitle });
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler("seekbackward", () => skip(-SKIP_SECONDS));
    navigator.mediaSession.setActionHandler("seekforward", () => skip(SKIP_SECONDS));
    return () => {
      for (const action of ["play", "pause", "seekbackward", "seekforward"] as const) {
        navigator.mediaSession.setActionHandler(action, null);
      }
    };
  }, [title, subtitle, toggle, skip]);

  const chooseVoice = (next: ConfessionVoice) => {
    if (next === voice) return;
    const audioEl = el.current;
    // Carry the position over: the two recordings are nearly the same length.
    resume.current = audioEl
      ? { fraction: audioEl.duration > 0 ? audioEl.currentTime / audioEl.duration : 0, play: !audioEl.paused }
      : null;
    setVoice(next);
    setDuration(audio[next]?.durationSec ?? 0);
  };

  const source = audio[voice];
  if (!source) return null;

  return (
    <div>
      <audio
        ref={el}
        key={voice}
        src={source.src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const audioEl = e.currentTarget;
          audioEl.playbackRate = speed;
          if (Number.isFinite(audioEl.duration)) setDuration(audioEl.duration);
          if (resume.current) {
            audioEl.currentTime = resume.current.fraction * audioEl.duration;
            if (resume.current.play) void audioEl.play().catch(() => setPlaying(false));
            resume.current = null;
          }
        }}
        onPlay={() => {
          setInterrupted(false);
          setPlaying(true);
          lastTime.current = el.current?.currentTime ?? 0;
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrent(t);
          // Only steady forward playback counts as listening, not seeking.
          const delta = t - lastTime.current;
          if (delta > 0 && delta < 1.5 && !e.currentTarget.paused) addListened(delta);
          lastTime.current = t;
        }}
        onError={(e) => {
          // A file that never loaded can't be played: hand over to the phone's voice. A hiccup
          // after it was playing fine is not worth throwing the listener out of the player for.
          if (e.currentTarget.readyState === 0) onFailed();
          else {
            setPlaying(false);
            setInterrupted(true);
          }
        }}
      />

      {voices.length > 1 && (
        <div role="radiogroup" aria-label="Voice" className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1">
          {voices.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={voice === v}
              onClick={() => chooseVoice(v)}
              className={cn(
                "min-h-10 rounded-full px-3 text-sm font-semibold capitalize transition-colors",
                voice === v ? "bg-surface text-primary shadow-sm" : "text-fg-muted hover:text-fg",
              )}
            >
              {v} voice
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => skip(-SKIP_SECONDS)}
          aria-label={`Back ${SKIP_SECONDS} seconds`}
          className="inline-flex size-12 items-center justify-center rounded-full text-fg hover:bg-surface-muted"
        >
          <RotateCcw aria-hidden className="size-6" />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="inline-flex size-16 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm hover:bg-primary-hover"
        >
          {playing ? <Pause aria-hidden className="size-7" /> : <Play aria-hidden className="size-7 translate-x-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => skip(SKIP_SECONDS)}
          aria-label={`Forward ${SKIP_SECONDS} seconds`}
          className="inline-flex size-12 items-center justify-center rounded-full text-fg hover:bg-surface-muted"
        >
          <RotateCw aria-hidden className="size-6" />
        </button>
      </div>

      <div className="mt-4">
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={Math.max(1, Math.round(duration))}
          step={1}
          value={Math.min(Math.round(current), Math.max(1, Math.round(duration)))}
          onChange={(e) => {
            if (el.current) el.current.currentTime = Number(e.target.value);
          }}
          className="h-6 w-full accent-primary"
        />
        <div className="flex justify-between text-sm tabular-nums text-fg-muted">
          <span>{clock(current)}</span>
          <span>{clock(duration)}</span>
        </div>
      </div>

      {interrupted && (
        <p role="status" className="mt-3 text-sm text-fg-muted">
          The audio was interrupted. Press play to carry on.
        </p>
      )}

      <div role="radiogroup" aria-label="Playback speed" className="mt-3 grid grid-cols-4 gap-1 rounded-full bg-surface-muted p-1">
        {PLAYBACK_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            onClick={() => chooseSpeed(s)}
            className={cn(
              "min-h-10 rounded-full text-sm font-semibold transition-colors",
              speed === s ? "bg-surface text-primary shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {speedLabel(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
