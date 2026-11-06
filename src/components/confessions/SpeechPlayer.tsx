"use client";

import { AlertCircle, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { parseSpeed, PLAYBACK_SPEEDS, speedLabel } from "@/lib/confessions";
import { pickVoice, type SpeechChunk } from "@/lib/speech";
import { saveString, useSpeechSupported, useStoredString } from "@/lib/useBrowser";
import { useListenCounter } from "./useListenCounter";

const RATE_KEY = "confession-speech-rate";
/** If the phone never starts speaking, give up and say so. */
const START_TIMEOUT_MS = 4000;

type Status = "idle" | "playing" | "paused";

interface Props {
  confessionId: string;
  chunks: SpeechChunk[];
  /** The sentence being read, so the page can highlight it. */
  onActive: (index: number | null) => void;
}

/** Reads the text aloud with the phone's own voice, one sentence at a time. */
export function SpeechPlayer({ confessionId, chunks, onActive }: Props) {
  const supported = useSpeechSupported();
  const [status, setStatus] = useState<Status>("idle");
  const [index, setIndex] = useState(0);
  const rate = parseSpeed(useStoredString(RATE_KEY));
  const [error, setError] = useState<string | null>(null);

  const indexRef = useRef(0);
  const rateRef = useRef(1);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  /** Bumped on every start or stop, so late events from a cancelled sentence are ignored. */
  const run = useRef(0);
  /** Safari drops an utterance's events if nothing holds a reference to it. */
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addListened = useListenCounter(confessionId);

  const setPosition = useCallback((i: number) => {
    indexRef.current = i;
    setIndex(i);
  }, []);

  const stopSpeaking = useCallback(() => {
    run.current += 1;
    if (startTimer.current) clearTimeout(startTimer.current);
    const synth = window.speechSynthesis;
    // Safari can swallow the next speak() after a cancel() with nothing queued.
    if (synth.speaking || synth.pending) synth.cancel();
  }, []);

  const speakFrom = useCallback(
    (from: number) => {
      stopSpeaking();
      const myRun = run.current;
      setError(null);
      setStatus("playing");

      const speakChunk = (i: number) => {
        if (i >= chunks.length) {
          setPosition(0);
          setStatus("idle");
          onActive(null);
          return;
        }
        setPosition(i);
        const utterance = new SpeechSynthesisUtterance(chunks[i].text);
        current.current = utterance;
        utterance.rate = rateRef.current;
        utterance.lang = voiceRef.current?.lang ?? "en-GB";
        if (voiceRef.current) utterance.voice = voiceRef.current;
        utterance.onstart = () => {
          if (run.current !== myRun) return;
          if (startTimer.current) clearTimeout(startTimer.current);
          onActive(i);
        };
        utterance.onend = () => {
          if (run.current === myRun) speakChunk(i + 1);
        };
        utterance.onerror = (event) => {
          if (run.current !== myRun) return;
          // "canceled" and "interrupted" are what stopping on purpose looks like.
          if (event.error === "canceled" || event.error === "interrupted") return;
          stopSpeaking();
          setStatus("idle");
          onActive(null);
          setError("Reading aloud isn't working on this device right now.");
        };
        if (i === from) {
          startTimer.current = setTimeout(() => {
            if (run.current !== myRun) return;
            stopSpeaking();
            setStatus("idle");
            onActive(null);
            setError("Your device didn't start reading. Check that your phone's text-to-speech is turned on.");
          }, START_TIMEOUT_MS);
        }
        const synth = window.speechSynthesis;
        // iOS can leave the engine paused; wake it inside the tap.
        if (synth.paused) synth.resume();
        synth.speak(utterance);
      };
      speakChunk(from);
    },
    [chunks, onActive, setPosition, stopSpeaking],
  );

  // The saved reading speed, for the sentence-by-sentence loop to read.
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  // The best installed English voice, and stopping when the page goes away.
  useEffect(() => {
    if (!supported) return;
    // Safari 16.4+: ask for "playback" audio, which can ignore the silent switch. Harmless elsewhere.
    try {
      (navigator as Navigator & { audioSession?: { type: string } }).audioSession!.type = "playback";
    } catch {}
    // Safari only finishes setting up the voice engine once asked.
    const load = () => {
      voiceRef.current = pickVoice(window.speechSynthesis.getVoices());
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    const stop = () => {
      run.current += 1;
      window.speechSynthesis.cancel();
    };
    window.addEventListener("pagehide", stop);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
      window.removeEventListener("pagehide", stop);
      stop();
      if (startTimer.current) clearTimeout(startTimer.current);
      onActive(null);
    };
  }, [supported, onActive]);

  // Time spent speaking counts as listening.
  useEffect(() => {
    if (status !== "playing") return;
    const timer = setInterval(() => addListened(1), 1000);
    return () => clearInterval(timer);
  }, [status, addListened]);

  if (supported === null) return <div aria-hidden className="h-28" />;
  if (supported === false) {
    return (
      <p className="rounded-[var(--radius-control)] bg-surface-muted px-4 py-3 text-center text-[15px] text-fg-muted">
        Reading aloud isn&apos;t available in this browser. You can read the confession below.
      </p>
    );
  }

  const move = (delta: number) => {
    const next = Math.min(chunks.length - 1, Math.max(0, indexRef.current + delta));
    setPosition(next);
    if (status === "playing") speakFrom(next);
    else onActive(status === "paused" ? next : null);
  };

  const toggle = () => {
    if (status === "playing") {
      stopSpeaking();
      setStatus("paused");
    } else {
      speakFrom(status === "paused" ? indexRef.current : 0);
    }
  };

  const chooseRate = (next: (typeof PLAYBACK_SPEEDS)[number]) => {
    rateRef.current = next;
    saveString(RATE_KEY, String(next));
    // Apply straight away by restarting the current sentence.
    if (status === "playing") speakFrom(indexRef.current);
  };

  const progress = chunks.length > 0 ? ((index + (status === "idle" ? 0 : 1)) / chunks.length) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Previous sentence"
          className="inline-flex size-12 items-center justify-center rounded-full text-fg hover:bg-surface-muted"
        >
          <SkipBack aria-hidden className="size-6" />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={status === "playing" ? "Pause reading" : status === "paused" ? "Resume reading" : "Read aloud"}
          className="inline-flex size-16 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm hover:bg-primary-hover"
        >
          {status === "playing" ? <Pause aria-hidden className="size-7" /> : <Play aria-hidden className="size-7 translate-x-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Next sentence"
          className="inline-flex size-12 items-center justify-center rounded-full text-fg hover:bg-surface-muted"
        >
          <SkipForward aria-hidden className="size-6" />
        </button>
      </div>

      <div className="mt-4">
        <div
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={chunks.length}
          aria-valuenow={status === "idle" ? 0 : index + 1}
          className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
        >
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-sm tabular-nums text-fg-muted">
          {status === "idle" ? `${chunks.length} sentences` : `Sentence ${index + 1} of ${chunks.length}`}
        </p>
      </div>

      <div role="radiogroup" aria-label="Reading speed" className="mt-3 grid grid-cols-4 gap-1 rounded-full bg-surface-muted p-1">
        {PLAYBACK_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={rate === s}
            onClick={() => chooseRate(s)}
            className={cn(
              "min-h-10 rounded-full text-sm font-semibold transition-colors",
              rate === s ? "bg-surface text-primary shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {speedLabel(s)}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-fg-muted">
        Read by your phone&apos;s own voice. It may stop if the screen locks, so keep the screen on while listening. On iPhone, speech is silent while the side switch is set to mute.
      </p>
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-danger">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
