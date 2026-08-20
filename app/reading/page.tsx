import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ContinueButton } from "@/app/components/ContinueButton";
import { DEMO_PROFILE, DEMO_STORIES, isDemoMode } from "@/lib/demo";
import { getProfile, getStoriesForLevel } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { Story } from "@/types";

export const dynamic = "force-dynamic";

export default async function ReadingPage() {
  const host = (await headers()).get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  let level = DEMO_PROFILE.level;
  let stories: Story[] = DEMO_STORIES;
  let done = new Set<number>();

  if (!demo) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const profile = await getProfile(supabase, user.id);
    if (!profile) redirect("/login");

    level = profile.level;
    stories = await getStoriesForLevel(supabase, profile.level);
    const { data: completed } = await supabase
      .from("user_stories")
      .select("story_id")
      .eq("user_id", user.id);
    done = new Set((completed ?? []).map((row) => row.story_id));
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 pb-28 lg:pb-6">
      {demo && (
        <p className="mb-3 text-center text-xs font-extrabold text-[#ffc800]">
          Demo modu — örnek hikayeler
        </p>
      )}
      <h1 className="text-3xl font-black">Okuma</h1>
      <p className="mt-1 font-bold text-duo-muted">
        Level {level} için hikayeler · her hikaye +20 XP
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {stories.map((story) => (
          <article
            key={story.id}
            className="flex flex-col rounded-3xl border-2 border-duo-border bg-duo-card p-5"
          >
            <p className="text-xs font-black uppercase text-duo-orange">Level {story.level}</p>
            <h2 className="mt-1 text-2xl font-black">{story.title}</h2>
            <p className="mt-2 line-clamp-3 flex-1 text-sm font-semibold text-duo-muted">
              {story.content}
            </p>
            <div className="mt-4">
              {done.has(story.id) ? (
                <p className="text-center text-sm font-extrabold text-duo-green">Tamamlandı ✓</p>
              ) : (
                <Link href={`/reading/${story.id}`}>
                  <ContinueButton>Oku</ContinueButton>
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
