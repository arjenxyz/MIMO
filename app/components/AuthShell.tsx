import Image from "next/image";

export function AuthShell({
  title,
  subtitle,
  tone,
  children,
}: {
  title: string;
  subtitle: string;
  tone: "pending" | "success" | "error";
  children?: React.ReactNode;
}) {
  const ring =
    tone === "success"
      ? "ring-[#58cc02]/30"
      : tone === "error"
        ? "ring-red-300"
        : "ring-[#fd860a]/30";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fff8f1] px-4 py-10">
      <div className="pointer-events-none absolute -left-16 -top-10 h-56 w-56 rounded-full bg-[#d8f5c8]/70" />
      <div className="pointer-events-none absolute -right-10 top-8 h-44 w-44 rounded-full bg-[#ffe8a3]/80" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-52 w-52 rounded-full bg-[#c9f0e3]/70" />

      <section className="relative z-10 w-full max-w-md rounded-[2rem] bg-white/90 px-6 py-10 text-center shadow-xl backdrop-blur">
        <Image
          src="/mimo-avatar.png"
          alt="Mimo"
          width={120}
          height={120}
          className={`mx-auto h-24 w-24 rounded-full object-cover shadow-lg ring-4 ${ring}`}
        />
        <h1 className="mt-5 text-3xl font-black text-[#1f2937]">{title}</h1>
        <p className="mt-2 font-bold text-[#6b7280]">{subtitle}</p>

        {tone === "pending" && (
          <div className="mx-auto mt-8 h-2 w-40 overflow-hidden rounded-full bg-[#f3e7d8]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#fd860a]" />
          </div>
        )}

        {children}
      </section>
    </main>
  );
}
