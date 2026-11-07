import type { Metadata } from "next";
import Link from "next/link";
import { ConfessionCard } from "@/components/confessions/ConfessionCard";
import { EmptyCard, ErrorCard } from "@/components/events/EventsEmpty";
import { buttonClasses } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/Field";
import { pageHref } from "@/lib/confessions";
import { getConfessionCategories, getConfessions } from "@/lib/dove";
import { cn } from "@/lib/cn";
import type { ConfessionList } from "@/lib/types";

export const metadata: Metadata = { title: "Confessions" };

type SearchParams = Promise<{ q?: string; category?: string; page?: string }>;

export default async function ConfessionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) || undefined;
  const category = params.category?.trim().slice(0, 50) || undefined;
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  let list: ConfessionList | null = null;
  let categories: string[] = [];
  try {
    [list, categories] = await Promise.all([
      getConfessions({ search: q, category, page }),
      // Filters are a nicety: the list still works without them.
      getConfessionCategories().catch(() => []),
    ]);
  } catch (error) {
    console.error("confessions failed", error instanceof Error ? error.message : error);
  }

  const filtered = Boolean(q || category);
  return (
    <>
      <h1 className="type-title">Confessions</h1>
      <p className="mt-1 text-fg-muted">Declare God&apos;s word over your life. Read them, or listen.</p>

      <form role="search" action="/confessions" className="mt-5 flex items-start gap-2 lg:max-w-xl">
        {category && <input type="hidden" name="category" value={category} />}
        <SearchField label="Search confessions" name="q" defaultValue={q} placeholder="Search confessions" className="flex-1" />
        <button type="submit" className={buttonClasses("primary", false, "min-h-12")}>
          Search
        </button>
      </form>
      {q && (
        <p className="mt-2 text-sm text-fg-muted">
          Showing results for &ldquo;{q}&rdquo;.{" "}
          <Link href={pageHref("/confessions", { category }, 1)} className="font-semibold text-primary underline-offset-4 hover:underline">
            Clear search
          </Link>
        </p>
      )}

      {categories.length > 0 && (
        <nav aria-label="Categories" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {[undefined, ...categories].map((c) => {
            const selected = c === category;
            return (
              <Link
                key={c ?? "all"}
                href={pageHref("/confessions", { q, category: c }, 1)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium",
                  selected ? "border-primary bg-primary text-on-primary" : "border-border-strong bg-surface hover:bg-surface-muted",
                )}
              >
                {c ?? "All"}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
        {list === null ? (
          <ErrorCard title="We couldn't load confessions right now." hint="Please check your connection and try again." />
        ) : list.items.length === 0 ? (
          filtered ? (
            <EmptyCard title="No confessions match your search" hint="Try different words, or clear the search." />
          ) : (
            <EmptyCard title="No confessions yet" hint="Check back soon." />
          )
        ) : (
          list.items.map((item) => <ConfessionCard key={item.id} item={item} />)
        )}
      </div>

      {list && list.meta.totalPages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref("/confessions", { q, category }, page - 1)} className={buttonClasses("secondary")}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-fg-muted">
            Page {list.meta.page} of {list.meta.totalPages}
          </span>
          {page < list.meta.totalPages ? (
            <Link href={pageHref("/confessions", { q, category }, page + 1)} className={buttonClasses("secondary")}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
