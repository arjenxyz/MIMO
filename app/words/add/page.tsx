import Link from "next/link";
import { headers } from "next/headers";
import { AddWordForm } from "@/app/components/AddWordForm";
import { isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AddWordPage() {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? null;
  const demo = isDemoMode(host);

  if (!demo) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      redirect("/login");
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-lg px-4 pb-28 pt-6 lg:pb-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1cb0f6]">
            Kelimeler
          </p>
          <h1 className="mt-1 text-2xl font-black text-white">Kelime ekle</h1>
        </div>
        <Link
          href="/"
          className="rounded-xl border-2 border-duo-border bg-duo-card px-3 py-2 text-xs font-black uppercase tracking-wide text-duo-muted transition hover:text-white"
        >
          Ana sayfa
        </Link>
      </div>

      <AddWordForm demo={demo} />
    </main>
  );
}
