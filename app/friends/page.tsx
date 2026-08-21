import { headers } from "next/headers";
import {
  PracticeExamCard,
  PracticeExamEyebrow,
  PracticeExamMain,
  PracticeExamTopBar,
} from "@/app/components/PracticeExamChrome";
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
    <PracticeExamMain>
      <div className="mx-auto max-w-lg px-4 pb-10 pt-5">
        <PracticeExamTopBar left={<PracticeExamEyebrow>Arkadaşlar</PracticeExamEyebrow>} />

        <p className="mb-5 text-center text-base font-bold text-mimo-fg sm:text-lg">
          Learn together — add friends and stay motivated.
        </p>

        <PracticeExamCard>
          <h1 className="text-center text-xl font-black text-mimo-title">Arkadaşlarım</h1>
          <p className="mt-1 text-center text-sm font-semibold text-mimo-muted">
            Ekle, onayla veya reddet — liste hep burada.
          </p>
          <div className="mt-5">
            <FriendsPanel demo={demo} />
          </div>
        </PracticeExamCard>
      </div>
    </PracticeExamMain>
  );
}
