import {
  PracticeExamCard,
  PracticeExamEyebrow,
  PracticeExamMain,
  PracticeExamTopBar,
} from "@/app/components/PracticeExamChrome";
import { SettingsPanel } from "@/app/components/SettingsPanel";

export default function SettingsPage() {
  return (
    <PracticeExamMain>
      <div className="mx-auto max-w-lg px-4 pb-10 pt-5">
        <PracticeExamTopBar left={<PracticeExamEyebrow>Ayarlar</PracticeExamEyebrow>} />

        <p className="mb-5 text-center text-base font-bold text-mimo-fg sm:text-lg">
          Make MIMO feel the way you like.
        </p>

        <PracticeExamCard>
          <h1 className="text-center text-xl font-black text-mimo-title">Ayarlar</h1>
          <p className="mt-1 text-center text-sm font-semibold text-mimo-muted">
            Tema, ses ve kelime görünürlüğü.
          </p>
          <div className="mt-5">
            <SettingsPanel />
          </div>
        </PracticeExamCard>
      </div>
    </PracticeExamMain>
  );
}
