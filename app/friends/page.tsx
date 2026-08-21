import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { FriendsPanel } from "@/app/components/FriendsPanel";
import { isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
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
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-mimo-bg text-mimo-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(253,134,10,0.16),_transparent_52%),radial-gradient(ellipse_at_bottom,_rgba(124,58,237,0.08),_transparent_48%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 pt-10">
        <div className="text-center">
          <Image
            src="/mimo-avatar.png"
            alt="MIMO"
            width={88}
            height={88}
            className="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-[#fd860a]/30"
            priority
          />
          <h1 className="mt-4 text-3xl font-black tracking-tight text-mimo-title">Arkadaşlar</h1>
          <p className="mt-1.5 text-sm font-semibold text-mimo-muted">
            Ekle, onayla, birlikte ilerle.
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-mimo-border bg-mimo-card px-4 py-4 shadow-[0_8px_0_rgba(15,23,42,0.06)] dark:shadow-[0_8px_0_rgba(0,0,0,0.35)]">
          <FriendsPanel demo={demo} />
        </section>

        <div className="mt-auto pt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl bg-[#fd860a] px-8 py-3.5 text-sm font-black uppercase tracking-wide text-[#2a1600] shadow-[0_4px_0_#c2410c] transition active:translate-y-0.5 active:shadow-[0_2px_0_#c2410c]"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}
