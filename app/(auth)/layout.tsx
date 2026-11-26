import type { Viewport } from "next";
import { ClearAuthPageCache } from "@/app/components/ClearAuthPageCache";
import { LightAuthChrome } from "@/app/components/LightAuthChrome";

export const viewport: Viewport = {
  themeColor: "#fff8f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Auth screens use a light canvas. Root layout is dark (app chrome).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <LightAuthChrome>
      <ClearAuthPageCache />
      {children}
    </LightAuthChrome>
  );
}
