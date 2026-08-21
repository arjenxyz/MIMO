import { headers } from "next/headers";
import { ListenTypeGame } from "@/app/components/ListenTypeGame";
import { getLearnedWords } from "@/lib/db";
import { DEMO_DUE_WORDS, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ListenTypePage() {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  let seedWords: Array<{
    english: string;
    example_sentence?: string | null;
    audio_url?: string | null;
  }> = [];

  if (demo) {
    seedWords = DEMO_DUE_WORDS.filter((row) => row.words).map((row) => ({
      english: row.words!.english,
      example_sentence: row.words!.example_sentence,
      audio_url: row.words!.audio_url,
    }));
  } else {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      redirect("/login");
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const learned = await getLearnedWords(supabase, user.id, 5);
    seedWords = learned
      .filter((row) => row.words)
      .map((row) => ({
        english: row.words!.english,
        example_sentence: row.words!.example_sentence,
        audio_url: row.words!.audio_url,
      }));
  }

  return <ListenTypeGame seedWords={seedWords} />;
}
