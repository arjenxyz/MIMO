export function SpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mb-8 max-w-md px-4">
      <div className="rounded-2xl border-2 border-duo-border bg-duo-bg px-6 py-4 text-center text-xl font-extrabold leading-snug text-white sm:text-2xl">
        {children}
      </div>
      <div className="absolute left-1/2 top-full h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-duo-border bg-duo-bg" />
    </div>
  );
}
