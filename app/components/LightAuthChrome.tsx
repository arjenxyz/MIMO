"use client";

import { useEffect } from "react";

const LIGHT_BG = "#fff8f1";
const LIGHT_FG = "#1f2937";

/**
 * Forces light browser chrome on auth screens.
 * Root layout uses dark body/themeColor; without this, login shows a black strip on top.
 */
export function LightAuthChrome({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    const prevBodyColor = body.style.color;

    html.style.backgroundColor = LIGHT_BG;
    body.style.backgroundColor = LIGHT_BG;
    body.style.color = LIGHT_FG;

    let meta = document.querySelector('meta[name="theme-color"]');
    const prevTheme = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", LIGHT_BG);

    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      body.style.color = prevBodyColor;
      if (meta) {
        if (prevTheme == null) meta.remove();
        else meta.setAttribute("content", prevTheme);
      }
    };
  }, []);

  return (
    <div className="relative z-0 min-h-[100dvh] bg-[#fff8f1] text-[#1f2937] antialiased">
      {children}
    </div>
  );
}
