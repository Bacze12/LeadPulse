import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}