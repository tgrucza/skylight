"use client";

export function MemoriesTile({ photoUrl, onTap }: { photoUrl?: string; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex-1 min-h-16 rounded-lg bg-surface-2 relative overflow-hidden cursor-pointer text-left"
      style={
        photoUrl
          ? { backgroundImage: `url(${photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : {
              backgroundImage:
                "repeating-linear-gradient(120deg, var(--surface-2), var(--surface-2) 10px, var(--line) 10px, var(--line) 20px)",
            }
      }
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(43,39,35,0.55))]" />
      <span className="absolute bottom-2.5 left-3.5 text-[11.5px] font-semibold text-white">Memories · tap for slideshow</span>
    </button>
  );
}
