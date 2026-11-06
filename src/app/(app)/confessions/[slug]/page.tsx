import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfessionReader } from "@/components/confessions/ConfessionReader";
import { ErrorCard } from "@/components/events/EventsEmpty";
import { church, features } from "@/lib/church";
import { playableAudio } from "@/lib/confessions";
import { doveOrigin, getConfession } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { toParagraphs } from "@/lib/speech";
import type { ConfessionDetail } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<ConfessionDetail | "error"> {
  try {
    return await getConfession(slug);
  } catch (error) {
    if (error instanceof DoveError && (error.status === 404 || error.status === 400)) notFound();
    console.error("confession failed", error instanceof Error ? error.message : error);
    return "error";
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  try {
    return { title: (await getConfession(slug)).title };
  } catch {
    return { title: "Confession" };
  }
}

export default async function ConfessionPage({ params }: Params) {
  const { slug } = await params;
  const confession = await load(slug);
  if (confession === "error") {
    return <ErrorCard title="We couldn't load this confession." hint="Please check your connection and try again." />;
  }

  return (
    <ConfessionReader
      id={confession.id}
      title={confession.title}
      scriptureRef={confession.scriptureRef}
      position={confession.position}
      wordCount={confession.wordCount}
      listenCount={confession.listenCount}
      showListenCounts={features.showListenCounts}
      paragraphs={toParagraphs(confession.body)}
      audio={playableAudio(doveOrigin(), confession.audio)}
      previous={confession.previous}
      next={confession.next}
      churchName={church.shortName}
    />
  );
}
