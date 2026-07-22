"use client";

import { Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { UploadDrop } from "@/components/photos/UploadDrop";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { useFamily } from "@/hooks/useFamily";
import { usePhotos, useUploadPhoto, useToggleSlideshow, useDeletePhoto } from "@/hooks/usePhotos";
import { useUIStore } from "@/stores/uiStore";

export default function PhotosPage() {
  const { data: familyData, isLoading: familyLoading } = useFamily();
  const family = familyData?.family;
  const memberId = familyData?.currentMemberId;

  const { data: photos, isLoading } = usePhotos(family?.id);
  const uploadPhoto = useUploadPhoto(family?.id, memberId);
  const toggleSlideshow = useToggleSlideshow(family?.id);
  const deletePhoto = useDeletePhoto(family?.id);
  const pushToast = useUIStore((s) => s.pushToast);

  async function handleFiles(files: File[]) {
    for (const file of files) {
      try {
        await uploadPhoto.mutateAsync(file);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Upload failed", "danger");
      }
    }
    if (files.length > 0) pushToast(`Added ${files.length} photo${files.length > 1 ? "s" : ""}`, "success");
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-3xl">Photos</h1>
      <UploadDrop onFiles={handleFiles} uploading={uploadPhoto.isPending} />

      {familyLoading || isLoading ? (
        <Skeleton rows={3} />
      ) : !photos || photos.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No photos yet" body="Upload family photos to feed the idle-mode slideshow on the wall." />
      ) : (
        <PhotoGrid
          photos={photos}
          onToggleSlideshow={(id, next) => toggleSlideshow.mutate({ id, inSlideshow: next })}
          onDelete={(photo) => deletePhoto.mutate(photo)}
        />
      )}
    </div>
  );
}
