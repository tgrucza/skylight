"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Mic, Loader2, Check, Camera } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAiSettings, useAskAssistant, type AssistantResponse, type AiSettingsDTO } from "@/hooks/useIntegrations";
import { useInvokeHaButton, type HaButtonDTO } from "@/hooks/useHaButtons";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";

/** Minimal shape of the (non-standard, vendor-prefixed) Web Speech API we actually use — not in TS's default DOM lib. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const QUERY_KEYS_TO_REFRESH = [
  "events",
  "hub-chores-today",
  "hub-meals-today",
  "hub-groceries",
  "hub-todos",
  "chores",
  "meal-plan",
  "list-items",
  "lists",
  "recipes",
  "ha-buttons",
];

/** Speaks Judy's reply using whichever voice the family configured in Settings. */
async function speakReply(text: string, aiSettings: AiSettingsDTO | undefined) {
  if (typeof window === "undefined") return;
  if (aiSettings?.voiceProvider === "openai" && aiSettings.voiceName) {
    try {
      const res = await fetch("/api/integrations/voice-sample", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voice: aiSettings.voiceName, text }),
      });
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        void audio.play();
        return;
      }
    } catch {
      // fall through to the browser voice below
    }
  }
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  if (aiSettings?.voiceName) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.name === aiSettings.voiceName);
    if (voice) utterance.voice = voice;
  }
  window.speechSynthesis.speak(utterance);
}

async function runClientHaInvokes(
  actions: AssistantResponse["actions"],
  supabase: ReturnType<typeof useSupabaseClient>,
  invoke: ReturnType<typeof useInvokeHaButton>
) {
  const ids = actions.map((a) => a.clientInvoke).filter((id): id is string => !!id);
  if (ids.length === 0 || !supabase) return;
  for (const id of ids) {
    const { data } = await supabase.from("ha_buttons").select("id, label, icon, entity_id, service, sort_order").eq("id", id).maybeSingle();
    if (data) await invoke.mutateAsync(data as HaButtonDTO);
  }
}

export function AskJudyButton({ isAdult }: { isAdult: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 shadow-[0_1px_3px_rgba(43,39,35,0.08)] cursor-pointer hover:bg-surface-2/60"
      >
        <span className="flex items-center justify-center size-6 rounded-full bg-primary-soft text-primary shrink-0">
          <Sparkles className="size-3.5" />
        </span>
        <span className="font-bold text-[13px]">Ask Judy</span>
      </button>
      {open && <VoiceAssistantModal onClose={() => setOpen(false)} isAdult={isAdult} />}
    </>
  );
}

export function CaptureForJudyButton({
  isAdult,
  label = "Scan",
}: {
  isAdult: boolean;
  /** Compact "Scan" on phone home; use a clearer label on hub/settings. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 shadow-[0_1px_3px_rgba(43,39,35,0.08)] cursor-pointer hover:bg-surface-2/60"
      >
        <Camera className="size-4 text-primary" />
        <span className="font-bold text-[13px]">{label}</span>
      </button>
      {open && <CaptureForJudyModal onClose={() => setOpen(false)} isAdult={isAdult} />}
    </>
  );
}

type Phase = "listening" | "thinking" | "done" | "no-speech";

export function VoiceAssistantModal({
  onClose,
  isAdult,
  contextHint,
}: {
  onClose: () => void;
  isAdult: boolean;
  contextHint?: string;
}) {
  const { data: aiSettings, isLoading: aiSettingsLoading } = useAiSettings(true);
  const router = useRouter();

  if (aiSettingsLoading) return null;

  const configured = aiSettings && (aiSettings.provider === "openai" ? aiSettings.openaiConfigured : aiSettings.anthropicConfigured);
  if (!configured) {
    return (
      <Modal
        open
        onClose={onClose}
        icon={Sparkles}
        title="Judy"
        footer={
          isAdult ? (
            <Button
              onClick={() => {
                onClose();
                router.push("/settings");
              }}
            >
              Go to Settings
            </Button>
          ) : undefined
        }
      >
        <p className="text-sm text-ink-2">
          {isAdult ? "Judy needs an API key before she can help — add one in Settings." : "Ask a grown-up to set up the assistant first."}
        </p>
      </Modal>
    );
  }

  if (!getSpeechRecognitionCtor()) {
    return <TypedFallbackModal onClose={onClose} contextHint={contextHint} aiSettings={aiSettings} />;
  }

  return <ListeningModal onClose={onClose} contextHint={contextHint} aiSettings={aiSettings} />;
}

function CaptureForJudyModal({ onClose, isAdult }: { onClose: () => void; isAdult: boolean }) {
  const { data: aiSettings, isLoading } = useAiSettings(true);
  const router = useRouter();
  const ask = useAskAssistant();
  const invokeHa = useInvokeHaButton();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [image, setImage] = useState<{ mediaType: string; data: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResponse | null>(null);

  if (isLoading) return null;
  const configured = aiSettings && (aiSettings.provider === "openai" ? aiSettings.openaiConfigured : aiSettings.anthropicConfigured);
  if (!configured) {
    return (
      <Modal
        open
        onClose={onClose}
        icon={Camera}
        title="Scan for Judy"
        footer={
          isAdult ? (
            <Button
              onClick={() => {
                onClose();
                router.push("/settings");
              }}
            >
              Go to Settings
            </Button>
          ) : undefined
        }
      >
        <p className="text-sm text-ink-2">
          {isAdult ? "Judy needs an API key before she can read documents." : "Ask a grown-up to set up the assistant first."}
        </p>
      </Modal>
    );
  }

  async function onFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose a photo or screenshot.");
      return;
    }
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    const data = btoa(binary);
    setImage({ mediaType: file.type || "image/jpeg", data });
    setPreview(URL.createObjectURL(file));
    setError(null);
    setResult(null);
  }

  async function handleSubmit() {
    if (!image && !note.trim()) return;
    setError(null);
    try {
      const res = await ask.mutateAsync({
        transcript: note.trim() || undefined,
        image: image ?? undefined,
      });
      await runClientHaInvokes(res.actions, supabase, invokeHa);
      setResult(res);
      for (const key of QUERY_KEYS_TO_REFRESH) void queryClient.invalidateQueries({ queryKey: [key] });
      if (res.reply) void speakReply(res.reply, aiSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={Camera}
      title="Scan for Judy"
      subtitle="School lists, flyers, handwritten notes — she'll sort them onto lists"
      footer={
        result ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} loading={ask.isPending} disabled={!image && !note.trim()}>
              Send to Judy
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2 self-start">
          <Camera className="size-4" />
          {preview ? "Change photo" : "Take or choose photo"}
        </Button>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Document preview" className="max-h-48 rounded-md border border-line object-contain bg-paper" />
        )}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note — e.g. put school supplies on the grocery list"
          rows={2}
          className="w-full rounded-md border border-line bg-paper px-3.5 py-3 text-sm"
        />
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
        {result && (
          <div className="flex flex-col gap-2">
            {result.actions.length > 0 ? (
              result.actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-md bg-success-soft px-3.5 py-2.5">
                  <Check className="size-4 text-success shrink-0" />
                  <span className="text-sm font-semibold text-ink">{a.summary}</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-ink">{result.reply}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ListeningModal({
  onClose,
  contextHint,
  aiSettings,
}: {
  onClose: () => void;
  contextHint?: string;
  aiSettings: AiSettingsDTO;
}) {
  const [phase, setPhase] = useState<Phase>("listening");
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ask = useAskAssistant();
  const invokeHa = useInvokeHaButton();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const startedRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settledRef = useRef(false);

  async function submit(spokenText: string) {
    settledRef.current = true;
    if (!spokenText.trim()) {
      setPhase("no-speech");
      closeTimerRef.current = setTimeout(onClose, 2500);
      return;
    }
    setPhase("thinking");
    const transcript = contextHint ? `[${contextHint}] ${spokenText.trim()}` : spokenText.trim();
    try {
      const res = await ask.mutateAsync(transcript);
      await runClientHaInvokes(res.actions, supabase, invokeHa);
      setResult(res);
      setPhase("done");
      for (const key of QUERY_KEYS_TO_REFRESH) void queryClient.invalidateQueries({ queryKey: [key] });
      if (res.reply) void speakReply(res.reply, aiSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("done");
    }
    closeTimerRef.current = setTimeout(onClose, 4500);
  }

  useEffect(() => {
    if (startedRef.current) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    startedRef.current = true;

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    let finalText = "";
    recognition.onresult = (event) => {
      finalText = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ");
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      settledRef.current = true;
      setError(event.error === "not-allowed" ? "Microphone access is blocked for this site." : "Couldn't hear you — try again.");
      setPhase("done");
      closeTimerRef.current = setTimeout(onClose, 4000);
    };
    recognition.onend = () => {
      if (settledRef.current) return;
      if (finalText.trim()) void submit(finalText);
      else {
        settledRef.current = true;
        setPhase("no-speech");
        closeTimerRef.current = setTimeout(onClose, 2500);
      }
    };
    recognition.start();

    return () => {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.stop();
      clearTimeout(closeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately runs once per mount
  }, []);

  return (
    <Modal open onClose={onClose} icon={Sparkles} title="Judy">
      <div className="flex flex-col items-center gap-4 py-4">
        {phase === "listening" && (
          <>
            <span className="relative flex items-center justify-center size-16 rounded-full bg-primary-soft text-primary">
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <Mic className="size-7 relative" />
            </span>
            <p className="text-sm font-semibold text-ink-2">Listening…</p>
          </>
        )}

        {phase === "thinking" && (
          <>
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm font-semibold text-ink-2">Judy&apos;s on it…</p>
          </>
        )}

        {phase === "no-speech" && <p className="text-sm text-ink-2">Didn&apos;t catch that.</p>}

        {phase === "done" && (
          <div className="w-full flex flex-col gap-2">
            {error ? (
              <p className="text-sm font-semibold text-danger text-center">{error}</p>
            ) : result && result.actions.length > 0 ? (
              result.actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-md bg-success-soft px-3.5 py-2.5">
                  <Check className="size-4 text-success shrink-0" />
                  <span className="text-sm font-semibold text-ink">{a.summary}</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-ink text-center">{result?.reply}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function TypedFallbackModal({
  onClose,
  contextHint,
  aiSettings,
}: {
  onClose: () => void;
  contextHint?: string;
  aiSettings: AiSettingsDTO;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ask = useAskAssistant();
  const invokeHa = useInvokeHaButton();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  async function handleSubmit() {
    if (!text.trim()) return;
    setError(null);
    const transcript = contextHint ? `[${contextHint}] ${text.trim()}` : text.trim();
    try {
      const res = await ask.mutateAsync(transcript);
      await runClientHaInvokes(res.actions, supabase, invokeHa);
      for (const key of QUERY_KEYS_TO_REFRESH) void queryClient.invalidateQueries({ queryKey: [key] });
      if (res.reply) void speakReply(res.reply, aiSettings);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={Sparkles}
      title="Ask Judy"
      subtitle="Voice isn't supported in this browser — type instead"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleSubmit} loading={ask.isPending} disabled={!text.trim()}>
            Send
          </Button>
        </>
      }
    >
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder={contextHint ?? "What's on Saturday? Add milk to groceries…"}
        className="w-full rounded-md border border-line bg-paper px-3.5 py-3 text-sm"
      />
      {error && <p className="text-sm font-semibold text-danger mt-2">{error}</p>}
    </Modal>
  );
}
