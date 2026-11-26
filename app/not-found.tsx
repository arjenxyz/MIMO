import type { Metadata } from "next";
import {
  StatusPrimaryLink,
  StatusScreen,
  StatusSecondaryLink,
} from "@/app/components/StatusScreen";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
};

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      eyebrow="Kaybolmuş gibisin"
      title="Bu sayfa yok"
      description="Link eski olabilir veya adres yanlış yazılmış olabilir. Ana sayfadan yoluna devam et."
      primary={<StatusPrimaryLink href="/">Ana sayfaya dön</StatusPrimaryLink>}
      secondary={<StatusSecondaryLink href="/quiz">Kelime pratiğine git</StatusSecondaryLink>}
    />
  );
}
