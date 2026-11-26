import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthorLegacy = {
  author_id: string;
  title: string;
  body: string;
  period_label: string | null;
  updated_at: string;
};

export async function getAuthorLegacy(
  supabase: SupabaseClient,
  authorId: string
): Promise<AuthorLegacy | null> {
  const { data, error } = await supabase
    .from("author_legacies")
    .select("author_id, title, body, period_label, updated_at")
    .eq("author_id", authorId)
    .maybeSingle();

  if (error) {
    if (/author_legacies|schema cache|does not exist/i.test(error.message || "")) {
      return null;
    }
    throw error;
  }
  return (data as AuthorLegacy | null) ?? null;
}

export async function upsertAuthorLegacy(
  supabase: SupabaseClient,
  authorId: string,
  input: { title: string; body: string; period_label?: string | null }
): Promise<AuthorLegacy> {
  const title = input.title.trim() || "Hazırlık anım";
  const body = input.body.trim();
  const period =
    input.period_label?.trim() && input.period_label.trim().length > 0
      ? input.period_label.trim().slice(0, 40)
      : null;

  if (!body) throw new Error("Anı metni boş olamaz.");
  if (title.length > 80) throw new Error("Başlık çok uzun.");
  if (body.length > 2000) throw new Error("Anı en fazla 2000 karakter olabilir.");

  const { data, error } = await supabase
    .from("author_legacies")
    .upsert(
      {
        author_id: authorId,
        title: title.slice(0, 80),
        body,
        period_label: period,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "author_id" }
    )
    .select("author_id, title, body, period_label, updated_at")
    .single();

  if (error) throw error;
  return data as AuthorLegacy;
}
