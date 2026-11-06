export function EmptyCard({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border px-5 py-10 text-center md:col-span-full">
      <p className="font-medium text-fg-muted">{title}</p>
      {hint && <p className="mt-1 text-sm text-fg-muted">{hint}</p>}
    </div>
  );
}

export function ErrorCard({ title, hint }: { title: string; hint?: string }) {
  return (
    <div role="alert" className="rounded-[var(--radius-card)] border border-danger/40 bg-surface px-5 py-10 text-center md:col-span-full">
      <p className="font-medium text-danger">{title}</p>
      {hint && <p className="mt-1 text-sm text-fg-muted">{hint}</p>}
    </div>
  );
}
