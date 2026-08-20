export async function reportClientError(input: {
  title: string;
  message: string;
  path?: string;
  source?: string;
  extra?: Record<string, string | undefined>;
}) {
  try {
    await fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    // Swallow — reporting must never break the UI.
  }
}
