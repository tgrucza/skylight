import { Rail } from "@/components/layout/Rail";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { ThemeDecor } from "@/components/hub/ThemeDecor";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col md:flex-row gap-4 max-w-[1160px] w-full mx-auto p-4 md:p-6">
      <ThemeDecor />
      <Rail />
      <div className="relative z-[1] flex flex-1 flex-col gap-4 min-w-0">
        <TopBar />
        <main className="flex-1 min-w-0">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
