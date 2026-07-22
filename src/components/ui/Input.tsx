import { type InputHTMLAttributes, type LabelHTMLAttributes, forwardRef } from "react";
import { AlertCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn("block text-[13px] font-semibold mb-2 text-ink", props.className)} />;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon: Icon, error, className, ...props },
  ref
) {
  return (
    <div>
      <div className="relative">
        {Icon && <Icon className="size-[19px] text-ink-3 absolute left-[15px] top-1/2 -translate-y-1/2" aria-hidden />}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-md border-[1.5px] bg-paper px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-3",
            "focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)]",
            error ? "border-danger bg-danger-soft" : "border-line",
            Icon ? "pl-11" : undefined,
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-[7px] text-[12.5px] font-semibold text-danger">
          <AlertCircle className="size-3.5" aria-hidden />
          {error}
        </div>
      )}
    </div>
  );
});

/** Large, borderless title input used in the EventEditor modal. */
export const TitleInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TitleInput(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full border-0 border-b-[1.5px] border-line bg-transparent py-2.5 px-0.5 font-serif text-[22px] text-ink outline-none focus:border-primary",
        className
      )}
      {...props}
    />
  );
});
