"use client";

import { Trash2, Image as ImageIcon } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import type { PhotoDTO } from "@/hooks/usePhotos";

export function PhotoGrid({
  photos,
  onToggleSlideshow,
  onDelete,
}: {
  photos: PhotoDTO[];
  onToggleSlideshow: (id: string, next: boolean) => void;
  onDelete: (photo: PhotoDTO) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {photos.map((photo) => (
        <div key={photo.id} className="group relative rounded-lg overflow-hidden border border-line aspect-square bg-surface-2">
          {photo.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URLs are short-lived and per-family; not worth Next/Image's remote-pattern config churn for this
            <img src={photo.signedUrl} alt={photo.caption ?? ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-3">
              <ImageIcon className="size-6" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(20,17,13,0.75))] p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
            <div className="scale-75 origin-left [&_span]:text-white">
              <Toggle checked={photo.in_slideshow} onChange={(next) => onToggleSlideshow(photo.id, next)} label="Slideshow" />
            </div>
            <button type="button" onClick={() => onDelete(photo)} aria-label="Delete photo" className="text-white cursor-pointer">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
