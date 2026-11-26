type DiscordAlert = {
  title: string;
  message: string;
  path?: string;
  source?: string;
  extra?: Record<string, string | undefined>;
};

export async function sendDiscordAlert(alert: DiscordAlert): Promise<boolean> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return false;

  const fields = [
    alert.path
      ? { name: "Path", value: `\`${alert.path}\``, inline: true }
      : null,
    alert.source
      ? { name: "Source", value: alert.source, inline: true }
      : null,
    ...Object.entries(alert.extra || {})
      .filter(([, value]) => Boolean(value))
      .map(([name, value]) => ({
        name,
        value: String(value).slice(0, 1000),
        inline: true,
      })),
  ].filter(Boolean);

  const body = {
    username: "MIMO Alerts",
    embeds: [
      {
        title: alert.title.slice(0, 250),
        description: alert.message.slice(0, 3500),
        color: 0xfd860a,
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: "MIMO developer alert" },
      },
    ],
  };

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok || response.status === 204;
  } catch {
    return false;
  }
}
