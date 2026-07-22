"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function UploadDrop({ onFiles, uploading }: { onFiles: (files: File[]) => void; uploading: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-xl border-[1.5px] border-dashed p-8 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors",
        dragOver ? "border-primary text-primary bg-primary-soft/40" : "border-line text-ink-3"
      )}
    >
      {uploading ? <Loader2 className="size-7 animate-spin-slow" /> : <ImagePlus className="size-7" />}
      <div className="font-semibold text-sm">{uploading ? "Uploading…" : "Drop photos here, or tap to choose"}</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
