"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/stores/uiStore";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Mic control that dictates into a text field (speech-to-text). */
export function DictationButton({
  onTranscript,
  disabled,
  className,
  size = "md",
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  size?: "md" | "lg";
}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const pushToast = useUIStore((s) => s.pushToast);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function stop() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  function start() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      pushToast("Voice input isn’t supported in this browser", "danger");
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0]?.transcript ?? "")
          .join(" ")
          .trim();
        if (transcript) onTranscript(transcript);
      };
      recognition.onerror = (event) => {
        setListening(false);
        recognitionRef.current = null;
        if (event.error === "not-allowed") {
          pushToast("Microphone access is blocked for this site", "danger");
        } else if (event.error !== "aborted" && event.error !== "no-speech") {
          pushToast("Couldn’t hear you — try again", "danger");
        }
      };
      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      pushToast("Couldn’t start the microphone", "danger");
      setListening(false);
    }
  }

  const dim = size === "lg" ? "size-12" : "size-11";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (listening ? stop() : start())}
      aria-label={listening ? "Stop listening" : "Dictate with microphone"}
      aria-pressed={listening}
      className={cn(
        dim,
        "rounded-[11px] border border-line flex items-center justify-center shrink-0 cursor-pointer transition-colors",
        listening ? "bg-danger-soft text-danger border-danger/40" : "bg-surface-2 text-ink-2 hover:bg-surface hover:text-ink",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {listening ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <Mic className="size-[18px]" aria-hidden />}
    </button>
  );
}
