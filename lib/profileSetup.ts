import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

export function validateProfileSetupInput(input: {
  displayName: string;
  username: string;
  age: number;
}) {
  const displayName = input.displayName.trim().replace(/\s+/g, " ");
  const username = normalizeUsername(input.username);
  const age = input.age;

  if (displayName.length < 2 || displayName.length > 40) {
    throw new Error("İsim 2–40 karakter olmalı.");
  }
  if (!USERNAME_RE.test(username)) {
    throw new Error("Kullanıcı adı 3–20 karakter; harf, rakam ve _ olabilir.");
  }
  if (!Number.isInteger(age) || age < 5 || age > 120) {
    throw new Error("Yaş 5–120 arasında olmalı.");
  }

  return { displayName, username, age };
}

export function isProfileComplete(profile: Profile | null | undefined) {
  return Boolean(profile?.profile_completed_at);
}

export async function completeProfileSetup(
  supabase: SupabaseClient,
  userId: string,
  input: { displayName: string; username: string; age: number }
): Promise<Profile> {
  const { displayName, username, age } = validateProfileSetupInput(input);

  const { data: taken, error: takenError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", userId)
    .maybeSingle();

  if (takenError) throw takenError;
  if (taken) throw new Error("Bu kullanıcı adı alınmış.");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username,
      age,
      profile_completed_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    if (/unique|duplicate/i.test(error.message)) {
      throw new Error("Bu kullanıcı adı alınmış.");
    }
    throw error;
  }

  return data as Profile;
}
