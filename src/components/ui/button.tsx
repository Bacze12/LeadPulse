import { cn } from "@/lib/cn";
import Link from "next/link";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600",
  secondary:
    "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  ghost: "text-gray-600 hover:bg-gray-100",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

type LinkButtonProps = {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
};

export function LinkButton({
  href,
  variant = "primary",
  className,
  children,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
        variants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}