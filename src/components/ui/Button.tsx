import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "icon";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-ink shadow-[0_2px_6px_rgba(43,39,35,0.1)] hover:brightness-105 active:scale-[.97]",
  secondary: "bg-secondary-soft text-ink active:scale-[.97]",
  outline: "bg-transparent text-ink border border-line hover:border-ink-3",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  destructive: "bg-danger text-white",
  icon: "bg-surface-2 text-ink hover:bg-line",
};

const sizeClasses: Record<Exclude<ButtonVariant, "icon">, Record<ButtonSize, string>> = {
  primary: {
    sm: "h-10 px-4 text-sm rounded-md",
    md: "h-12 px-5 text-[15px] rounded-md",
    lg: "h-13 px-6 text-[15px] rounded-md",
  },
  secondary: {
    sm: "h-10 px-4 text-sm rounded-md",
    md: "h-12 px-5 text-[15px] rounded-md",
    lg: "h-13 px-6 text-[15px] rounded-md",
  },
  outline: {
    sm: "h-10 px-4 text-sm rounded-md",
    md: "h-12 px-5 text-[15px] rounded-md",
    lg: "h-13 px-6 text-[15px] rounded-md",
  },
  ghost: {
    sm: "h-10 px-3 text-sm rounded-md",
    md: "h-12 px-4 text-[15px] rounded-md",
    lg: "h-13 px-4 text-[15px] rounded-md",
  },
  destructive: {
    sm: "h-10 px-4 text-sm rounded-md",
    md: "h-12 px-5 text-[15px] rounded-md",
    lg: "h-13 px-6 text-[15px] rounded-md",
  },
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: "size-10 rounded-md",
  md: "size-12 rounded-md",
  lg: "size-13 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "lg", loading, disabled, className, children, ...props },
  ref
) {
  const isIcon = variant === "icon";
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-sans font-semibold cursor-pointer transition-[transform,filter] duration-[var(--duration-micro)] ease-[var(--ease-hearth)]",
        "disabled:cursor-not-allowed disabled:opacity-70 disabled:bg-surface-2 disabled:text-ink-3",
        variantClasses[variant],
        isIcon ? iconSizeClasses[size] : sizeClasses[variant][size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-[1.1em] animate-spin-slow" aria-hidden /> : children}
    </button>
  );
});
