"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { Bell, Plus, MapPin, Calendar as CalendarIcon, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Badge, CountBadge, SyncStatus } from "@/components/ui/Badge";
import { Card, AddCard } from "@/components/ui/Card";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Input, Label } from "@/components/ui/Input";
import { Toggle, Checkbox, Radio } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { useUIStore } from "@/stores/uiStore";
import { MEMBER_COLORS } from "@/lib/colors";

const familyMembers = [
  { id: "1", name: "Dana", color: MEMBER_COLORS[0].hex },
  { id: "2", name: "Marcus", color: MEMBER_COLORS[5].hex },
  { id: "3", name: "Maya", color: MEMBER_COLORS[7].hex },
  { id: "4", name: "Leo", color: MEMBER_COLORS[3].hex },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-4">{title}</div>
      <div className="rounded-xl border border-line bg-surface p-7 flex flex-wrap gap-3.5 items-center">{children}</div>
    </div>
  );
}

export default function StyleGuidePage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [modalOpen, setModalOpen] = useState(false);
  const [toggled, setToggled] = useState(true);
  const [checked, setChecked] = useState(true);
  const [radioIdx, setRadioIdx] = useState(0);
  const [selectVal, setSelectVal] = useState("family");
  const [activeMembers, setActiveMembers] = useState<string[]>(["1", "3"]);
  const pushToast = useUIStore((s) => s.pushToast);

  return (
    <main className="max-w-[1160px] mx-auto px-10 py-16">
      <div className="mb-12">
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-primary mb-3">Orbit Design System</div>
        <h1 className="font-serif text-5xl mb-3">Component library</h1>
        <p className="text-ink-2 max-w-[60ch]">Every ui/ primitive, live — for visually diffing against the design doc.</p>
      </div>

      <Section title="Buttons">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="primary" className="pl-4.5">
          <Plus className="size-[18px]" strokeWidth={2.5} /> With icon
        </Button>
        <Button variant="icon" aria-label="Notifications">
          <Bell className="size-[22px]" />
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
        <Button variant="primary" loading>
          Loading
        </Button>
      </Section>

      <Section title="Chips & Badges">
        {familyMembers.map((m) => (
          <Chip
            key={m.id}
            color={m.color}
            label={m.name}
            active={activeMembers.includes(m.id)}
            onClick={() =>
              setActiveMembers((prev) => (prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]))
            }
          />
        ))}
        <Chip variant="removable" label="Soccer" onRemove={() => {}} />
        <Chip variant="filter" label="Filter" active />
        <Badge tone="success">Done</Badge>
        <Badge tone="warning">Due soon</Badge>
        <Badge tone="danger">Overdue</Badge>
        <Badge tone="info">New</Badge>
        <span className="relative inline-flex size-11 items-center justify-center rounded-md bg-surface-2">
          <CalendarIcon className="size-[22px] text-ink-2" />
          <CountBadge count={3} />
        </span>
        <SyncStatus synced />
      </Section>

      <Section title="Avatars">
        {familyMembers.map((m) => (
          <Avatar key={m.id} name={m.name} color={m.color} size={38} />
        ))}
        <AvatarStack members={familyMembers} />
        {familyMembers.slice(0, 2).map((m) => (
          <Avatar key={m.id} name={m.name} color={m.color} size={34} ring="select" />
        ))}
      </Section>

      <Section title="Cards">
        <Card className="w-[260px]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="w-2.5 h-8.5 rounded-[6px]" style={{ background: MEMBER_COLORS[5].hex }} />
            <div>
              <div className="font-bold text-[15px]">Piano lesson</div>
              <div className="text-[12.5px] text-ink-3">Maya · 4:00–5:00 PM</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge tone="info">Recurring</Badge>
            <Badge tone="neutral">Ms. Lee&apos;s</Badge>
          </div>
        </Card>
        <Card elevated className="w-[260px]">
          <div className="font-mono text-[11px] text-ink-3 mb-2">ELEVATED · HOVER ME</div>
          <div className="font-bold text-base mb-1.5">Interactive card</div>
          <p className="text-[13.5px] leading-snug text-ink-2">Lifts on hover, presses on tap.</p>
        </Card>
        <div className="w-[260px]">
          <AddCard label="Add card" />
        </div>
      </Section>

      <Section title="Inputs & controls">
        <div className="w-[240px]">
          <Label>Event title</Label>
          <Input placeholder="Soccer practice" />
        </div>
        <div className="w-[240px]">
          <Label>With leading icon</Label>
          <Input icon={MapPin} placeholder="Add location" />
        </div>
        <div className="w-[240px]">
          <Label>Error state</Label>
          <Input defaultValue="not-an-email" error="Enter a valid email" />
        </div>
        <div className="flex flex-col gap-4">
          <Toggle checked={toggled} onChange={setToggled} label="Toggle" />
          <Checkbox checked={checked} onChange={setChecked} label="Checkbox" />
          <Radio selected={radioIdx === 0} onSelect={() => setRadioIdx(0)} label="Radio" />
        </div>
        <Select
          label="Show calendar for"
          value={selectVal}
          onChange={setSelectVal}
          options={[
            { value: "family", label: "Whole family" },
            { value: "mine", label: "Just mine" },
            { value: "kids", label: "Kids only" },
          ]}
        />
      </Section>

      <Section title="Overlays">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Button variant="secondary" onClick={() => pushToast("Event added to Maya's calendar", "success")}>
          Success toast
        </Button>
        <Button variant="secondary" onClick={() => pushToast("Grocery list shared with the family", "info")}>
          Info toast
        </Button>
      </Section>

      <Section title="Alerts">
        <div className="flex flex-col gap-3 w-full">
          <Alert tone="info" title="Heads up" body="Grandma is visiting this weekend." />
          <Alert tone="success" title="All chores done today" body="Nice work, everyone." />
          <Alert tone="warning" title="Grocery run needed" body="The list has 8 items on it." />
          <Alert tone="danger" title="Double-booked" body="Leo has two events at 4:00 PM." />
        </div>
      </Section>

      <Section title="Loading, empty & error states">
        <div className="w-[300px]">
          <Skeleton />
        </div>
        <div className="w-[300px]">
          <EmptyState icon={UtensilsCrossed} title="No meals planned yet" body="Plan the week's dinners so everyone knows what's cooking." actionLabel="Plan dinners" onAction={() => {}} />
        </div>
        <div className="w-[300px]">
          <ErrorState body="We'll keep everything saved here and retry automatically." onRetry={() => {}} />
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        icon={CalendarIcon}
        title="New event"
        subtitle="Add to the family calendar"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Save</Button>
          </>
        }
      >
        <Label>Event title</Label>
        <Input placeholder="Soccer practice" />
      </Modal>
    </main>
  );
}
