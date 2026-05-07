import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow && <p className="label">{eyebrow}</p>}
        <h1 className="font-display text-3xl text-white md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-white/60">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center">
      <p className="font-semibold text-white">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
          {description}
        </p>
      )}
      {href && action && (
        <Link href={href} className="btn-outline mt-4">
          {action}
        </Link>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "LIVE" ||
    status === "APPROVED" ||
    status === "PAID" ||
    status === "CREDIT"
      ? "border-neon-green/50 bg-neon-green/10 text-neon-green"
      : status === "REJECTED" || status === "CANCELLED" || status === "DEBIT"
        ? "border-red-400/50 bg-red-500/10 text-red-300"
        : status === "PENDING" || status === "UPCOMING" || status === "OPEN"
          ? "border-neon-orange/50 bg-neon-orange/10 text-neon-orange"
          : "border-white/20 bg-white/5 text-white/60";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {status}
    </span>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/70 p-6 text-sm text-white/60">
      {label}
    </div>
  );
}
