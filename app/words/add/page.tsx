import { headers } from "next/headers";
import { AddWordForm } from "@/app/components/AddWordForm";
import { MyWordsList } from "@/app/components/MyWordsList";
import {
  PracticeExamCard,
  PracticeExamEyebrow,
  PracticeExamMain,
  PracticeExamTopBar,
} from "@/app/components/PracticeExamChrome";
import { getUserWords } from "@/lib/db";
import { DEMO_DUE_WORDS, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import type { DueWordItem } from "@/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AddWordPage() {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  let words: DueWordItem[] = DEMO_DUE_WORDS;

  if (!demo) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      redirect("/login");
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    words = await getUserWords(supabase, user.id);
  }

  return (
    <PracticeExamMain>
      <div className="mx-auto max-w-lg px-4 pb-10 pt-5">
        <PracticeExamTopBar left={<PracticeExamEyebrow>Kelimeler</PracticeExamEyebrow>} />

        <p className="mb-5 text-center text-base font-bold text-mimo-fg sm:text-lg">
          Add your own word to practice later.
        </p>

        <PracticeExamCard>
          <h1 className="text-center text-xl font-black text-mimo-title">Kelime ekle</h1>
          <div className="mt-5">
            <AddWordForm demo={demo} />
          </div>
        </PracticeExamCard>

        <div className="mt-5">
          <MyWordsList words={words} demo={demo} />
        </div>
      </div>
    </PracticeExamMain>
  );
}
