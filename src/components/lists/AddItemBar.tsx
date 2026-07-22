"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AddItemBar({ onAdd, placeholder = "Add an item" }: { onAdd: (label: string) => void; placeholder?: string }) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue("");
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
        />
      </div>
      <Button onClick={submit} className="gap-2 shrink-0">
        <Plus className="size-[18px]" strokeWidth={2.5} />
        Add
      </Button>
    </div>
  );
}
