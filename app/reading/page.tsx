import Link from "next/link";
import { redirect } from "next/navigation";
import { ContinueButton } from "@/app/components/ContinueButton";
import { getProfile, getStoriesForLevel } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReadingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(supabase, user.id);
  if (!profile) redirect("/login");

  const stories = await getStoriesForLevel(supabase, profile.level);
  const { data: completed } = await supabase
    .from("user_stories")
    .select("story_id")
    .eq("user_id", user.id);
  const done = new Set((completed ?? []).map((row) => row.story_id));

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 pb-28 lg:pb-6">
      <h1 className="text-3xl font-black">Okuma</h1>
      <p className="mt-1 font-bold text-duo-muted">
        Level {profile.level} için hikayeler · her hikaye +20 XP
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {stories.map((story) => (
          <article
            key={story.id}
            className="flex flex-col rounded-3xl border-2 border-duo-border bg-duo-card p-5"
          >
            <p className="text-xs font-black uppercase text-duo-orange">Level {story.level}</p>
            <h2 className="mt-1 text-2xl font-black">{story.title}</h2>
            <p className="mt-2 line-clamp-3 font-semibold text-duo-muted">{story.content}</p>
            <div className="mt-4">
              <ContinueButton href={`/reading/${story.id}`} variant={done.has(story.id) ? "ghost" : "orange"}>
                {done.has(story.id) ? "Tekrar Oku" : "Hikayeyi Oku"}
              </ContinueButton>
            </div>
          </article>
        ))}
      </div>

      {stories.length === 0 && (
        <div className="mt-8 text-center">
          <p className="font-extrabold">Bu seviye için hikaye henüz yok.</p>
          <Link href="/" className="mt-3 inline-block font-bold text-duo-blue">
            Ana sayfaya dön
          </Link>
        </div>
      )}
    </main>
  );
}
