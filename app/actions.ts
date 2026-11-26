"use server";

import { revalidatePath } from "next/cache";
import { assignNewWords } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function loadNewWordsAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  await assignNewWords(supabase, user.id, 5);
  revalidatePath("/");
  revalidatePath("/quiz");
  return { ok: true };
}
