"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Volume2, Loader2, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CaptureForJudyButton } from "@/components/assistant/AskJudyModal";
import { useFamily, type FamilySettingsDTO } from "@/hooks/useFamily";
import { useUpdateSettings, useUpdateFamily } from "@/hooks/useSettings";
import {
  useAiSettings,
  useUpdateAiSettings,
  useTestAiKey,
  usePlayVoiceSample,
  type AiSettingsDTO,
} from "@/hooks/useIntegrations";
import { HomeAssistantSettingsCard } from "@/components/settings/HomeAssistantSettingsCard";
import { useUIStore, type DeviceModePreference } from "@/stores/uiStore";
import { APP_THEMES, type AppThemeId } from "@/lib/themes";
import { COMMON_TIMEZONES } from "@/lib/timezones";
import { signOutAction } from "@/lib/actions/auth";
import { ANTHROPIC_MODELS, DEFAULT_ANTHROPIC_MODEL } from "@/lib/anthropic";
import { OPENAI_MODELS, DEFAULT_OPENAI_MODEL, OPENAI_TTS_VOICES } from "@/lib/openai";
import { cn } from "@/lib/cn";

function ThemesCard() {
  const appTheme = useUIStore((s) => s.appTheme);
  const setAppTheme = useUIStore((s) => s.setAppTheme);
  const pushToast = useUIStore((s) => s.pushToast);

  const groups: { key: string; label: string }[] = [
    { key: "everyday", label: "Everyday" },
    { key: "seasonal", label: "Seasonal" },
    { key: "fun", label: "Fun" },
  ];

  return (
    <div className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-4">
      <div>
        <h2 className="font-bold text-sm">Themes</h2>
        <p className="text-xs text-ink-3 mt-1">
          Colors this device — wall tablet and phone can differ. Seasonal themes add light hub decorations.
        </p>
      </div>
      {groups.map((group) => {
        const themes = APP_THEMES.filter((t) => t.group === group.key);
        if (themes.length === 0) return null;
        return (
          <div key={group.key} className="flex flex-col gap-2">
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3">{group.label}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {themes.map((theme) => {
                const selected = appTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setAppTheme(theme.id as AppThemeId);
                      pushToast(`${theme.label} theme on`, "success");
                    }}
                    className={cn(
                      "flex flex-col items-stretch gap-2 rounded-md border p-2.5 text-left transition-colors",
                      selected ? "border-primary bg-primary-soft" : "border-line bg-paper hover:border-ink-3"
                    )}
                    aria-pressed={selected}
                  >
                    <div className="flex h-7 overflow-hidden rounded-sm">
                      {theme.swatches.map((hex) => (
                        <span key={hex} className="flex-1" style={{ background: hex }} />
                      ))}
                    </div>
                    <span className={cn("text-[13px] font-semibold", selected ? "text-primary" : "text-ink")}>
                      {theme.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LocationCard({
  familyId,
  latitude,
  longitude,
}: {
  familyId: string;
  latitude: number | null;
  longitude: number | null;
}) {
  const [lat, setLat] = useState(latitude != null ? String(latitude) : "");
  const [lng, setLng] = useState(longitude != null ? String(longitude) : "");
  const [locating, setLocating] = useState(false);
  const updateSettings = useUpdateSettings(familyId);
  const pushToast = useUIStore((s) => s.pushToast);

  async function saveCoords(nextLat: number, nextLng: number) {
    await updateSettings.mutateAsync({ latitude: nextLat, longitude: nextLng });
    setLat(String(nextLat));
    setLng(String(nextLng));
    pushToast("Location saved for weather", "success");
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      pushToast("Geolocation isn't available on this device", "danger");
      return;
    }
    setLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 12_000 });
      });
      const nextLat = Math.round(position.coords.latitude * 10_000) / 10_000;
      const nextLng = Math.round(position.coords.longitude * 10_000) / 10_000;
      await saveCoords(nextLat, nextLng);
    } catch {
      pushToast("Couldn't read location — check browser permission", "danger");
    } finally {
      setLocating(false);
    }
  }

  async function handleSaveManual() {
    const nextLat = Number(lat);
    const nextLng = Number(lng);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng) || nextLat < -90 || nextLat > 90 || nextLng < -180 || nextLng > 180) {
      pushToast("Enter a valid latitude and longitude", "danger");
      return;
    }
    try {
      await saveCoords(nextLat, nextLng);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't save location", "danger");
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-4">
      <div>
        <h2 className="font-bold text-sm">Weather location</h2>
        <p className="text-xs text-ink-3 mt-1">
          Used on the hub for today&apos;s high / low and rain. Shared for the whole family.
        </p>
      </div>
      <Button variant="outline" onClick={() => void handleUseMyLocation()} loading={locating} className="self-start gap-2">
        <MapPin className="size-4" />
        Use my location
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="weather-lat">Latitude</Label>
          <Input
            id="weather-lat"
            inputMode="decimal"
            placeholder="40.7128"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="weather-lng">Longitude</Label>
          <Input
            id="weather-lng"
            inputMode="decimal"
            placeholder="-74.0060"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={() => void handleSaveManual()} loading={updateSettings.isPending} className="self-start">
        Save location
      </Button>
    </div>
  );
}

function DeviceModeCard() {
  const preference = useUIStore((s) => s.deviceMode);
  const setDeviceMode = useUIStore((s) => s.setDeviceMode);
  const pushToast = useUIStore((s) => s.pushToast);

  return (
    <div className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-3">
      <h2 className="font-bold text-sm">This device</h2>
      <p className="text-xs text-ink-3">
        Wall hub is the mounted tablet glance view. Phone home is for quick grocery adds, scans, and lists.
      </p>
      <Select
        label="Home screen"
        value={preference}
        onChange={(v) => {
          setDeviceMode(v as DeviceModePreference);
          pushToast(
            v === "wall" ? "This device will open the wall hub" : v === "phone" ? "This device will open phone home" : "Auto: phone on small screens, hub on large",
            "info"
          );
        }}
        options={[
          { value: "auto", label: "Auto (by screen size)" },
          { value: "wall", label: "Always wall hub" },
          { value: "phone", label: "Always phone home" },
        ]}
      />
    </div>
  );
}

function FamilyCard({ familyId, name, timezone }: { familyId: string; name: string; timezone: string }) {
  const [familyName, setFamilyName] = useState(name);
  const [tz, setTz] = useState(timezone);
  const updateFamily = useUpdateFamily(familyId);
  const pushToast = useUIStore((s) => s.pushToast);

  async function handleSave() {
    if (!familyName.trim()) {
      pushToast("Family name can't be empty", "danger");
      return;
    }
    try {
      await updateFamily.mutateAsync({ name: familyName.trim(), timezone: tz });
      pushToast("Family updated", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't save changes", "danger");
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-4">
      <h2 className="font-bold text-sm">Family</h2>
      <div>
        <Label htmlFor="family-name">Family name</Label>
        <Input id="family-name" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
      </div>
      <Select
        label="Timezone"
        value={tz}
        onChange={setTz}
        options={COMMON_TIMEZONES.map((t) => ({ value: t.value, label: t.label }))}
      />
      <Button onClick={handleSave} loading={updateFamily.isPending} className="self-start">
        Save
      </Button>
    </div>
  );
}

function AssistantCard() {
  const { data, isLoading } = useAiSettings(true);
  if (isLoading || !data) return null;
  // Keyed so the form's local state re-derives fresh whenever the loaded settings actually change.
  return <AssistantForm key={`${data.provider}-${data.voiceProvider}-${data.voiceName ?? ""}`} data={data} />;
}

const CUSTOM = "__custom__";

/** A model/voice <Select> plus a free-text override — curated lists drift out of date, so "Other" always escapes to typing an exact ID. */
function PickerWithOverride({
  label,
  value,
  curated,
  onChange,
}: {
  label: string;
  value: string;
  curated: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const isCurated = curated.some((m) => m.id === value) || value === "";
  const [mode, setMode] = useState<"curated" | "custom">(isCurated ? "curated" : "custom");

  return (
    <div className="flex flex-col gap-2">
      <Select
        label={label}
        value={mode === "custom" ? CUSTOM : value || curated[0]!.id}
        onChange={(v) => {
          if (v === CUSTOM) {
            setMode("custom");
            onChange("");
          } else {
            setMode("curated");
            onChange(v);
          }
        }}
        options={[...curated.map((m) => ({ value: m.id, label: m.label })), { value: CUSTOM, label: "Other (type exact ID)…" }]}
      />
      {mode === "custom" && (
        <Input placeholder="Exact model ID" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function AssistantForm({ data }: { data: AiSettingsDTO }) {
  const [provider, setProvider] = useState<"anthropic" | "openai">(data.provider);
  const [anthropicModel, setAnthropicModel] = useState(data.anthropicModel ?? DEFAULT_ANTHROPIC_MODEL);
  const [openaiModel, setOpenaiModel] = useState(data.openaiModel ?? DEFAULT_OPENAI_MODEL);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [voiceProvider, setVoiceProvider] = useState<"browser" | "openai">(data.voiceProvider);
  const [voiceName, setVoiceName] = useState(data.voiceName ?? "");
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testResult, setTestResult] = useState<Record<string, "idle" | "ok" | "fail">>({});
  const [playingSample, setPlayingSample] = useState(false);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  const updateSettings = useUpdateAiSettings();
  const testKey = useTestAiKey();
  const playSample = usePlayVoiceSample();
  const pushToast = useUIStore((s) => s.pushToast);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    function loadVoices() {
      const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
      setBrowserVoices(voices);
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  async function handleSaveProviderModel() {
    try {
      await updateSettings.mutateAsync({ provider, anthropicModel, openaiModel });
      pushToast("Assistant settings saved", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't save", "danger");
    }
  }

  async function handleSaveKey(which: "anthropic" | "openai") {
    const key = which === "anthropic" ? anthropicKey : openaiKey;
    try {
      await updateSettings.mutateAsync(which === "anthropic" ? { anthropicApiKey: key } : { openaiApiKey: key });
      pushToast(key.trim() ? `${which === "anthropic" ? "Anthropic" : "OpenAI"} key saved` : "Key cleared", "success");
      if (which === "anthropic") setAnthropicKey("");
      else setOpenaiKey("");
      setTestResult((r) => ({ ...r, [which]: "idle" }));
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't save the key", "danger");
    }
  }

  async function handleTest(which: "anthropic" | "openai") {
    setTestResult((r) => ({ ...r, [which]: "idle" }));
    const result = await testKey.mutateAsync(which);
    setTestResult((r) => ({ ...r, [which]: result.ok ? "ok" : "fail" }));
    if (!result.ok) pushToast(result.error ?? "Test failed", "danger");
  }

  async function handleSaveVoice() {
    try {
      await updateSettings.mutateAsync({ voiceProvider, voiceName });
      pushToast("Voice saved", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't save the voice", "danger");
    }
  }

  function playBrowserSample() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance("Hi, I'm Judy. This is what I sound like.");
    const voice = browserVoices.find((v) => v.name === voiceName);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function playOpenAiSample() {
    if (!voiceName) {
      pushToast("Pick a voice first", "danger");
      return;
    }
    setPlayingSample(true);
    try {
      const url = await playSample.mutateAsync(voiceName);
      const audio = new Audio(url);
      sampleAudioRef.current = audio;
      audio.onended = () => setPlayingSample(false);
      await audio.play();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't play the sample", "danger");
      setPlayingSample(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-sm">AI Assistant (Judy)</h2>
        <p className="text-xs text-ink-3 mt-1">Powers the &quot;Ask Judy&quot; button on the wall hub.</p>
      </div>

      <div className="flex flex-col gap-3">
        <Select
          label="Chatbot provider"
          value={provider}
          onChange={(v) => setProvider(v as "anthropic" | "openai")}
          options={[
            { value: "anthropic", label: "Anthropic (Claude)" },
            { value: "openai", label: "OpenAI (GPT)" },
          ]}
        />

        {provider === "anthropic" ? (
          <PickerWithOverride label="Claude model" value={anthropicModel} curated={ANTHROPIC_MODELS} onChange={setAnthropicModel} />
        ) : (
          <PickerWithOverride label="GPT model" value={openaiModel} curated={OPENAI_MODELS} onChange={setOpenaiModel} />
        )}

        <Button onClick={handleSaveProviderModel} loading={updateSettings.isPending} className="self-start">
          Save
        </Button>
      </div>

      <div className="border-t border-line pt-5 flex flex-col gap-4">
        <div>
          <Label htmlFor="anthropic-key">Anthropic API key</Label>
          <Input
            id="anthropic-key"
            type="password"
            placeholder={data.anthropicConfigured ? "Configured ✓ (replace to change)" : "sk-ant-..."}
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
          />
          <p className="text-xs text-ink-3 mt-1.5">
            Get a key at <span className="font-mono">console.anthropic.com</span>. Encrypted, never shown again once saved.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Button size="sm" onClick={() => handleSaveKey("anthropic")} loading={updateSettings.isPending} className="self-start">
              Save key
            </Button>
            {data.anthropicConfigured && (
              <Button size="sm" variant="outline" onClick={() => handleTest("anthropic")} loading={testKey.isPending} className="self-start">
                Test
              </Button>
            )}
            {testResult.anthropic === "ok" && <span className="text-sm font-semibold text-success">Working ✓</span>}
          </div>
        </div>

        <div>
          <Label htmlFor="openai-key">OpenAI API key</Label>
          <Input
            id="openai-key"
            type="password"
            placeholder={data.openaiConfigured ? "Configured ✓ (replace to change)" : "sk-..."}
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
          />
          <p className="text-xs text-ink-3 mt-1.5">
            Get a key at <span className="font-mono">platform.openai.com</span>. Needed if you use OpenAI as the chatbot, or for OpenAI
            voices below (independent of which provider answers).
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Button size="sm" onClick={() => handleSaveKey("openai")} loading={updateSettings.isPending} className="self-start">
              Save key
            </Button>
            {data.openaiConfigured && (
              <Button size="sm" variant="outline" onClick={() => handleTest("openai")} loading={testKey.isPending} className="self-start">
                Test
              </Button>
            )}
            {testResult.openai === "ok" && <span className="text-sm font-semibold text-success">Working ✓</span>}
          </div>
        </div>
      </div>

      <div className="border-t border-line pt-5 flex flex-col gap-3">
        <div>
          <h3 className="font-bold text-sm">Judy&apos;s voice</h3>
          <p className="text-xs text-ink-3 mt-1">
            Anthropic has no voice of its own — Judy speaks with either your browser&apos;s built-in voice (free) or an OpenAI voice
            (needs the OpenAI key above, regardless of which provider is answering).
          </p>
        </div>

        <Select
          label="Voice source"
          value={voiceProvider}
          onChange={(v) => {
            setVoiceProvider(v as "browser" | "openai");
            setVoiceName("");
          }}
          options={[
            { value: "browser", label: "Browser voice (free)" },
            { value: "openai", label: "OpenAI voice" },
          ]}
        />

        {voiceProvider === "browser" ? (
          <Select
            label="Voice"
            value={voiceName || browserVoices[0]?.name || ""}
            onChange={setVoiceName}
            options={browserVoices.map((v) => ({ value: v.name, label: `${v.name} (${v.lang})` }))}
          />
        ) : (
          <PickerWithOverride
            label="Voice"
            value={voiceName}
            curated={OPENAI_TTS_VOICES.map((v) => ({ id: v, label: v[0]!.toUpperCase() + v.slice(1) }))}
            onChange={setVoiceName}
          />
        )}

        <div className="flex items-center gap-3">
          <Button onClick={handleSaveVoice} loading={updateSettings.isPending} className="self-start">
            Save voice
          </Button>
          <Button
            variant="outline"
            onClick={voiceProvider === "browser" ? playBrowserSample : playOpenAiSample}
            loading={voiceProvider === "openai" && playingSample}
            disabled={voiceProvider === "openai" && !data.openaiConfigured}
            className="gap-2 self-start"
          >
            {voiceProvider === "openai" && playingSample ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4" />}
            Play sample
          </Button>
        </div>
        {voiceProvider === "openai" && !data.openaiConfigured && (
          <p className="text-xs text-ink-3 -mt-1">Add an OpenAI key above first to preview and use OpenAI voices.</p>
        )}
      </div>
    </div>
  );
}

function DocumentsCard({ isAdult }: { isAdult: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-3">
      <h2 className="font-bold text-sm">Documents</h2>
      <p className="text-xs text-ink-3">
        Take or upload a photo of party invitations, school flyers, or schedules. Judy reads the document and can create
        to-dos, groceries, calendar events, and reminders for the family.
      </p>
      <div className="self-start">
        <CaptureForJudyButton isAdult={isAdult} label="Scan document" />
      </div>
    </div>
  );
}

function AccountCard({ pendingInvite }: { pendingInvite: { familyName: string } | null }) {
  const pushToast = useUIStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirmName, setConfirmName] = useState<string | null>(null);

  async function joinInvitedFamily(confirmTransfer = false) {
    setBusy(true);
    try {
      const res = await fetch("/api/family/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmTransfer }),
      });
      const data = await res.json();
      if (data.status === "confirm_transfer") {
        setConfirmName(data.invitedFamilyName);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Couldn't join");
      pushToast(`Joined ${data.familyName}`, "success");
      setConfirmName(null);
      await queryClient.invalidateQueries({ queryKey: ["family"] });
      window.location.href = "/hub";
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't join the invited family", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-4">
      <h2 className="font-bold text-sm">Account</h2>

      {(pendingInvite || confirmName) && (
        <div className="rounded-md border border-line bg-paper p-3.5 flex flex-col gap-2.5">
          <p className="text-sm text-ink-2 leading-snug">
            {confirmName
              ? `Leave your empty solo family and join ${confirmName}?`
              : `You've been invited to ${pendingInvite!.familyName}. If you created a family by mistake, you can switch now.`}
          </p>
          <Button
            size="sm"
            className="self-start"
            loading={busy}
            onClick={() => void joinInvitedFamily(true)}
          >
            {confirmName ? `Join ${confirmName}` : `Join ${pendingInvite!.familyName}`}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs text-ink-3 leading-snug">
          Invited to someone else&apos;s family? They must add your exact Google email under Family → Invite / Add, then
          tap below (or sign out and back in).
        </p>
        {!pendingInvite && !confirmName && (
          <Button variant="outline" size="sm" className="self-start" loading={busy} onClick={() => void joinInvitedFamily(false)}>
            I was invited — check for invite
          </Button>
        )}
      </div>

      <Button variant="outline" onClick={() => void signOutAction()} className="gap-2 self-start !text-danger">
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}

const DEFAULT_SETTINGS: Omit<FamilySettingsDTO, "family_id"> = {
  idle_timeout_seconds: 15,
  slideshow_interval_seconds: 20,
  week_starts_on: 0,
  ambient_start: null,
  ambient_end: null,
  default_hub_view: "busy",
  latitude: null,
  longitude: null,
};

/** Keyed by family id in the parent so it mounts fresh (and re-derives its lazy initial state) whenever the loaded settings actually change, instead of syncing via an effect. */
function SettingsForm({ familyId, settings }: { familyId: string; settings: FamilySettingsDTO | null }) {
  const base = settings ?? { family_id: familyId, ...DEFAULT_SETTINGS };
  const [idleTimeout, setIdleTimeout] = useState(base.idle_timeout_seconds);
  const [slideshowInterval, setSlideshowInterval] = useState(base.slideshow_interval_seconds);
  const [weekStartsOn, setWeekStartsOn] = useState(String(base.week_starts_on));
  const [ambientStart, setAmbientStart] = useState(base.ambient_start?.slice(0, 5) ?? "");
  const [ambientEnd, setAmbientEnd] = useState(base.ambient_end?.slice(0, 5) ?? "");

  const updateSettings = useUpdateSettings(familyId);
  const pushToast = useUIStore((s) => s.pushToast);

  async function handleSave() {
    try {
      await updateSettings.mutateAsync({
        idle_timeout_seconds: idleTimeout,
        slideshow_interval_seconds: slideshowInterval,
        week_starts_on: Number(weekStartsOn),
        ambient_start: ambientStart || null,
        ambient_end: ambientEnd || null,
      });
      pushToast("Settings saved", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't save settings", "danger");
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-5">
      <div>
        <Label htmlFor="idle-timeout">Idle timeout on the wall (seconds)</Label>
        <Input id="idle-timeout" type="number" min={5} max={300} value={idleTimeout} onChange={(e) => setIdleTimeout(Number(e.target.value))} />
        <p className="text-xs text-ink-3 mt-1.5">How long before /hub fades to the ambient photo screen (spec default: 15s).</p>
      </div>

      <div>
        <Label htmlFor="slideshow-interval">Slideshow interval (seconds)</Label>
        <Input
          id="slideshow-interval"
          type="number"
          min={5}
          max={120}
          value={slideshowInterval}
          onChange={(e) => setSlideshowInterval(Number(e.target.value))}
        />
      </div>

      <Select
        label="Week starts on"
        value={weekStartsOn}
        onChange={setWeekStartsOn}
        options={[
          { value: "0", label: "Sunday" },
          { value: "1", label: "Monday" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ambient-start">Ambient mode starts</Label>
          <Input id="ambient-start" type="time" value={ambientStart} onChange={(e) => setAmbientStart(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ambient-end">Ambient mode ends</Label>
          <Input id="ambient-end" type="time" value={ambientEnd} onChange={(e) => setAmbientEnd(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-ink-3 -mt-3">Leave blank to keep the wall in its normal theme overnight.</p>

      <Button onClick={handleSave} loading={updateSettings.isPending} className="self-start">
        Save settings
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useFamily();
  const isAdult = data?.members.find((m) => m.id === data.currentMemberId)?.role === "adult";

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <h1 className="font-serif text-3xl">Settings</h1>
      {isLoading || !data?.family ? (
        <Skeleton rows={4} />
      ) : (
        <>
          <ThemesCard />
          <SettingsForm key={`${data.family.id}-${data.settings?.idle_timeout_seconds ?? "d"}`} familyId={data.family.id} settings={data.settings} />
          <LocationCard
            key={`${data.family.id}-loc-${data.settings?.latitude ?? "x"}-${data.settings?.longitude ?? "y"}`}
            familyId={data.family.id}
            latitude={data.settings?.latitude ?? null}
            longitude={data.settings?.longitude ?? null}
          />
          <DeviceModeCard />
          <DocumentsCard isAdult={!!isAdult} />
          {isAdult && <FamilyCard familyId={data.family.id} name={data.family.name} timezone={data.family.timezone} />}
          {isAdult && <HomeAssistantSettingsCard familyId={data.family.id} />}
          {isAdult && <AssistantCard />}
          <AccountCard pendingInvite={data.pendingInvite ?? null} />
        </>
      )}
    </div>
  );
}
