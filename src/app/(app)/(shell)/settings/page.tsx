"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useFamily, type FamilySettingsDTO } from "@/hooks/useFamily";
import { useUpdateSettings, useUpdateFamily } from "@/hooks/useSettings";
import { useUIStore } from "@/stores/uiStore";
import { COMMON_TIMEZONES } from "@/lib/timezones";
import { signOutAction } from "@/lib/actions/auth";

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

function AccountCard() {
  return (
    <div className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-4">
      <h2 className="font-bold text-sm">Account</h2>
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
          <SettingsForm key={`${data.family.id}-${data.settings?.idle_timeout_seconds ?? "d"}`} familyId={data.family.id} settings={data.settings} />
          {isAdult && <FamilyCard familyId={data.family.id} name={data.family.name} timezone={data.family.timezone} />}
          <AccountCard />
        </>
      )}
    </div>
  );
}
