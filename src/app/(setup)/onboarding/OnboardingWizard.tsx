"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar as CalendarIcon, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Toggle";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { MEMBER_COLORS } from "@/lib/colors";
import { COMMON_TIMEZONES, closestCommonTimezone, detectedTimezone } from "@/lib/timezones";

type Role = "adult" | "child";

interface DraftMember {
  key: string;
  name: string;
  role: Role;
  colorHex: string;
  pin: string;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
}

const STEPS = ["Family", "Members", "Calendars", "Done"] as const;

function newDraftMember(colorIndex: number): DraftMember {
  return {
    key: crypto.randomUUID(),
    name: "",
    role: "child",
    colorHex: MEMBER_COLORS[colorIndex % MEMBER_COLORS.length].hex,
    pin: "",
  };
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 1 — family + the signing-in adult
  const [familyName, setFamilyName] = useState("");
  const [timezone, setTimezone] = useState(closestCommonTimezone(detectedTimezone()));
  const [myName, setMyName] = useState("");
  const [myColor, setMyColor] = useState<string>(MEMBER_COLORS[0].hex);

  const [familyId, setFamilyId] = useState<string | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  // Step 2 — additional members
  const [drafts, setDrafts] = useState<DraftMember[]>([]);

  // Step 3 — Google calendars
  const [calendars, setCalendars] = useState<GoogleCalendar[] | null>(null);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const calendarsLoading = step === 2 && calendars === null;

  useEffect(() => {
    if (step !== 2 || calendars !== null) return;
    fetch("/api/google/calendars")
      .then((res) => res.json())
      .then((data: { calendars?: GoogleCalendar[]; error?: string }) => {
        if (data.calendars) {
          setCalendars(data.calendars);
          setSelectedCalendars(new Set(data.calendars.filter((c) => c.primary).map((c) => c.id)));
        } else {
          setError(data.error ?? "Couldn't load your Google calendars");
          setCalendars([]);
        }
      })
      .catch(() => {
        setError("Couldn't load your Google calendars");
        setCalendars([]);
      });
  }, [step, calendars]);

  async function submitFamily() {
    setError(null);
    if (!familyName.trim() || !myName.trim()) {
      setError("Enter a family name and your name to continue.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyName, timezone, memberName: myName, colorHex: myColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setFamilyId(data.familyId);
      setMyMemberId(data.memberId);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function submitMembers() {
    setError(null);
    const named = drafts.filter((d) => d.name.trim());
    if (named.length === 0 || !familyId) {
      setStep(2);
      return;
    }
    for (const d of named) {
      if (d.role === "child" && d.pin && !/^\d{4}$/.test(d.pin)) {
        setError(`${d.name}'s PIN must be exactly 4 digits.`);
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId,
          members: named.map((d) => ({ name: d.name.trim(), role: d.role, colorHex: d.colorHex, pin: d.pin || undefined })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function submitCalendars() {
    setError(null);
    if (selectedCalendars.size > 0 && familyId && myMemberId) {
      setBusy(true);
      try {
        const res = await fetch("/api/google/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: myMemberId, familyId, calendarIds: Array.from(selectedCalendars) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't link calendars");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't link calendars");
        setBusy(false);
        return;
      }
    }
    await finish();
  }

  async function finish() {
    if (!familyId) return;
    setBusy(true);
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      router.push("/hub");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[560px]">
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex items-center gap-2">
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                  i < step ? "bg-success text-white" : i === step ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-3"
                }`}
              >
                {i < step ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${i === step ? "text-ink" : "text-ink-3"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-line" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-5">
            <Alert tone="danger" title="Couldn't continue" body={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {step === 0 && (
          <div className="rounded-xl border border-line bg-surface p-7">
            <h1 className="font-serif text-3xl mb-1.5">Name your family</h1>
            <p className="text-ink-2 text-sm mb-6">This becomes the shared space everyone in your household sees.</p>

            <div className="mb-4">
              <Label htmlFor="familyName">Family name</Label>
              <Input id="familyName" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="The Ramirez Family" />
            </div>

            <div className="mb-6">
              <Select
                label="Timezone"
                value={timezone}
                onChange={setTimezone}
                options={COMMON_TIMEZONES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>

            <div className="h-px bg-line my-6" />

            <p className="text-ink-2 text-sm mb-4">Now, you — the first adult in the family.</p>
            <div className="mb-4">
              <Label htmlFor="myName">Your name</Label>
              <Input id="myName" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Dana" />
            </div>
            <div className="mb-6">
              <Label>Your color</Label>
              <div className="flex flex-wrap gap-2.5">
                {MEMBER_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.name}
                    onClick={() => setMyColor(c.hex)}
                    className="size-9 rounded-full cursor-pointer"
                    style={{
                      background: c.hex,
                      boxShadow: myColor === c.hex ? `0 0 0 2px var(--surface), 0 0 0 3.5px ${c.hex}` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>

            <Button size="lg" className="w-full" onClick={submitFamily} loading={busy}>
              Continue
            </Button>
          </div>
        )}

        {step === 1 && familyId && (
          <div className="rounded-xl border border-line bg-surface p-7">
            <h1 className="font-serif text-3xl mb-1.5">Add your family</h1>
            <p className="text-ink-2 text-sm mb-6">
              Add everyone else — kids get a 4-digit PIN instead of a Google account, so they can tap in on the wall.
            </p>

            <div className="flex flex-col gap-4 mb-5">
              {drafts.map((d) => (
                <div key={d.key} className="flex items-start gap-3 rounded-md border border-line p-3.5">
                  <Avatar name={d.name || "?"} color={d.colorHex} size={40} />
                  <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                    <Input
                      value={d.name}
                      onChange={(e) =>
                        setDrafts((prev) => prev.map((p) => (p.key === d.key ? { ...p, name: e.target.value } : p)))
                      }
                      placeholder="Name"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDrafts((prev) => prev.map((p) => (p.key === d.key ? { ...p, role: "adult" } : p)))}
                        className={`px-3 py-1.5 rounded-pill text-xs font-semibold cursor-pointer ${d.role === "adult" ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-2"}`}
                      >
                        Adult
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrafts((prev) => prev.map((p) => (p.key === d.key ? { ...p, role: "child" } : p)))}
                        className={`px-3 py-1.5 rounded-pill text-xs font-semibold cursor-pointer ${d.role === "child" ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-2"}`}
                      >
                        Child
                      </button>
                      <div className="flex gap-1.5 ml-1">
                        {MEMBER_COLORS.slice(0, 8).map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            aria-label={c.name}
                            onClick={() => setDrafts((prev) => prev.map((p) => (p.key === d.key ? { ...p, colorHex: c.hex } : p)))}
                            className="size-5 rounded-full cursor-pointer"
                            style={{
                              background: c.hex,
                              boxShadow: d.colorHex === c.hex ? `0 0 0 1.5px var(--surface), 0 0 0 3px ${c.hex}` : undefined,
                            }}
                          />
                        ))}
                      </div>
                      {d.role === "child" && (
                        <Input
                          value={d.pin}
                          onChange={(e) =>
                            setDrafts((prev) =>
                              prev.map((p) => (p.key === d.key ? { ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 4) } : p))
                            )
                          }
                          placeholder="4-digit PIN"
                          inputMode="numeric"
                          className="!w-[130px] !py-2 !text-sm"
                        />
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrafts((prev) => prev.filter((p) => p.key !== d.key))}
                    aria-label="Remove"
                    className="text-ink-3 hover:text-danger cursor-pointer p-1"
                  >
                    <Trash2 className="size-[18px]" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrafts((prev) => [...prev, newDraftMember(prev.length + 1)])}
              className="mb-6 gap-2"
            >
              <Plus className="size-4" />
              Add a family member
            </Button>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep(2)} disabled={busy}>
                Skip for now
              </Button>
              <Button className="flex-1" onClick={submitMembers} loading={busy}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-xl border border-line bg-surface p-7">
            <h1 className="font-serif text-3xl mb-1.5">Link your calendars</h1>
            <p className="text-ink-2 text-sm mb-6">
              Pick the Google calendars that should sync into Hearth. You can change this later from Family settings.
            </p>

            {calendarsLoading && (
              <div className="flex items-center gap-2 text-ink-2 text-sm py-6 justify-center">
                <Loader2 className="size-4 animate-spin-slow" />
                Loading your calendars…
              </div>
            )}

            {!calendarsLoading && calendars && calendars.length === 0 && (
              <p className="text-sm text-ink-2 mb-6">No calendars found, or we couldn&apos;t reach Google. You can link calendars later.</p>
            )}

            {!calendarsLoading && calendars && calendars.length > 0 && (
              <div className="flex flex-col gap-2.5 mb-6">
                {calendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex items-center gap-3 rounded-md border border-line px-3.5 py-3 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedCalendars.has(cal.id)}
                      onChange={(next) =>
                        setSelectedCalendars((prev) => {
                          const nextSet = new Set(prev);
                          if (next) nextSet.add(cal.id);
                          else nextSet.delete(cal.id);
                          return nextSet;
                        })
                      }
                    />
                    <CalendarIcon className="size-4 text-ink-3" />
                    <span className="text-sm font-medium">{cal.summary}</span>
                    {cal.primary && <span className="ml-auto text-xs text-ink-3 font-mono">PRIMARY</span>}
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={finish} disabled={busy}>
                Skip for now
              </Button>
              <Button className="flex-1" onClick={submitCalendars} loading={busy}>
                Finish setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
