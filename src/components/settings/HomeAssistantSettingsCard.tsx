"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/stores/uiStore";
import {
  useHaButtons,
  useUpsertHaButton,
  useDeleteHaButton,
  useHaConnection,
} from "@/hooks/useHaButtons";
import { HA_ICON_OPTIONS, fetchHaStatesDirect, serviceForEntity, type HaEntityOption } from "@/lib/ha";

export function HomeAssistantSettingsCard({ familyId }: { familyId: string }) {
  const { data, isLoading, refetch } = useHaConnection(familyId);
  if (isLoading || !data) return null;
  return <HomeAssistantForm key={`${data.baseUrl ?? ""}-${data.tokenConfigured}`} familyId={familyId} initial={data} onSaved={() => void refetch()} />;
}

function HomeAssistantForm({
  familyId,
  initial,
  onSaved,
}: {
  familyId: string;
  initial: { baseUrl: string | null; tokenConfigured: boolean; isPrivate: boolean };
  onSaved: () => void;
}) {
  const pushToast = useUIStore((s) => s.pushToast);
  const [url, setUrl] = useState(initial.baseUrl ?? "");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const { data: buttons } = useHaButtons(familyId);
  const upsert = useUpsertHaButton(familyId);
  const remove = useDeleteHaButton(familyId);

  const [entities, setEntities] = useState<HaEntityOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState<string>("lightbulb");
  const [newEntity, setNewEntity] = useState("");

  async function handleSave() {
    setSaving(true);
    try {
      // Only send token when the user typed something (omit to leave the existing token unchanged).
      const payload: { baseUrl: string; token?: string } = { baseUrl: url.trim() };
      if (token.trim()) payload.token = token.trim();

      const res = await fetch("/api/ha/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Couldn't save");
      pushToast("Home Assistant saved", "success");
      setToken("");
      onSaved();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't save", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/ha/settings", { method: "POST" });
      const body = await res.json();
      if (body.error === "private" || body.message?.includes("local network")) {
        // LAN: test from browser
        const tokenRes = await fetch("/api/ha/client-token");
        if (!tokenRes.ok) throw new Error((await tokenRes.json().catch(() => ({})))?.error ?? "Add a long-lived token first");
        const { baseUrl, token: haToken } = (await tokenRes.json()) as { baseUrl: string; token: string };
        const ping = await fetch(`${baseUrl}/api/`, { headers: { authorization: `Bearer ${haToken}` } });
        if (!ping.ok) throw new Error(`Home Assistant returned ${ping.status}`);
        pushToast("Connected to Home Assistant on your network", "success");
        return;
      }
      if (!body.ok) throw new Error(body.error ?? "Connection failed");
      pushToast("Connected to Home Assistant", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      const corsHint =
        msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")
          ? " If this is a LAN address, add this site to HA's http.cors_allowed_origins."
          : "";
      pushToast(msg + corsHint, "danger");
    } finally {
      setTesting(false);
    }
  }

  async function loadEntities() {
    setLoadingEntities(true);
    try {
      const res = await fetch("/api/ha/entities");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't load entities");
      if (body.mode === "direct") {
        const tokenRes = await fetch("/api/ha/client-token");
        if (!tokenRes.ok) throw new Error((await tokenRes.json().catch(() => ({})))?.error ?? "Add a token first");
        const { baseUrl, token: haToken } = (await tokenRes.json()) as { baseUrl: string; token: string };
        const list = await fetchHaStatesDirect(baseUrl, haToken);
        setEntities(list);
      } else {
        setEntities(body.entities ?? []);
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't load entities", "danger");
    } finally {
      setLoadingEntities(false);
    }
  }

  useEffect(() => {
    if (!initial.baseUrl || !initial.tokenConfigured) return;
    // Defer so setState inside loadEntities isn't synchronous in this effect body.
    const t = window.setTimeout(() => {
      void loadEntities();
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when configured
  }, []);

  async function handleAddButton() {
    if (!newLabel.trim() || !newEntity) {
      pushToast("Pick a label and entity", "danger");
      return;
    }
    try {
      await upsert.mutateAsync({
        label: newLabel,
        icon: newIcon,
        entity_id: newEntity,
        service: serviceForEntity(newEntity),
        sort_order: buttons?.length ?? 0,
      });
      setNewLabel("");
      setNewEntity("");
      pushToast("Button added — it'll show on the hub", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't add button", "danger");
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-5">
      <div>
        <h2 className="font-bold text-sm">Home Assistant</h2>
        <p className="text-xs text-ink-3 mt-1">
          Door lights, scenes, and quick toggles on the wall hub. LAN addresses work from home Wi-Fi; use Nabu Casa for away-from-home.
        </p>
      </div>

      <div>
        <Label htmlFor="ha-url">Home Assistant URL</Label>
        <Input
          id="ha-url"
          type="url"
          placeholder="http://homeassistant.local:8123 or https://….ui.nabu.casa"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="ha-token">Long-lived access token</Label>
        <Input
          id="ha-token"
          type="password"
          placeholder={initial.tokenConfigured ? "Configured ✓ — paste a new token to replace" : "Create one in your HA profile"}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleSave()} loading={saving}>
          Save
        </Button>
        <Button variant="outline" onClick={() => void handleTest()} loading={testing} disabled={!initial.baseUrl && !url.trim()}>
          Test connection
        </Button>
        <Button variant="ghost" onClick={() => void loadEntities()} disabled={loadingEntities}>
          {loadingEntities ? <Loader2 className="size-4 animate-spin" /> : "Refresh entities"}
        </Button>
      </div>

      {initial.isPrivate && (
        <p className="text-xs text-ink-3 -mt-2">
          LAN mode: on HA, add this site&apos;s origin to <code className="font-mono">http: cors_allowed_origins</code> so the tablet can call it directly.
        </p>
      )}

      <div className="border-t border-line pt-4 flex flex-col gap-3">
        <h3 className="font-bold text-sm">Hub buttons</h3>
        {(buttons ?? []).length === 0 ? (
          <p className="text-xs text-ink-3">No buttons yet — add lights or scenes for the door tablet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {buttons!.map((b) => (
              <li key={b.id} className="flex items-center gap-2 rounded-md bg-paper border border-line px-3 py-2">
                <span className="flex-1 text-sm font-semibold truncate">
                  {b.label} <span className="text-ink-3 font-normal text-xs">({b.entity_id})</span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${b.label}`}
                  className="text-ink-3 hover:text-danger cursor-pointer"
                  onClick={() =>
                    void remove.mutateAsync(b.id).then(
                      () => pushToast("Button removed", "info"),
                      (err: unknown) => pushToast(err instanceof Error ? err.message : "Couldn't remove", "danger")
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="ha-btn-label">Label</Label>
            <Input id="ha-btn-label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Garage lights" />
          </div>
          <Select
            label="Icon"
            value={newIcon}
            onChange={setNewIcon}
            options={HA_ICON_OPTIONS.map((id) => ({ value: id, label: id }))}
          />
          <Select
            label="Entity"
            value={newEntity}
            onChange={setNewEntity}
            options={
              entities.length > 0
                ? entities.map((e) => ({ value: e.entity_id, label: `${e.friendly_name} (${e.entity_id})` }))
                : [{ value: "", label: loadingEntities ? "Loading…" : "Refresh entities first" }]
            }
          />
        </div>
        <Button variant="outline" className="gap-1.5 self-start" onClick={() => void handleAddButton()} loading={upsert.isPending}>
          <Plus className="size-4" />
          Add button
        </Button>
      </div>
    </div>
  );
}
