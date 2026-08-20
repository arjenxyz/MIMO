/**
 * Auth screens use a light canvas. Root layout is dark (app chrome),
 * so this wrapper fully covers body background/text inheritance.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fff8f1] text-[#1f2937] antialiased">{children}</div>
  );
}
