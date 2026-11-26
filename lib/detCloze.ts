export type ClozeGap = {
  id: string;
  answer: string;
  shown: number;
  missing: string;
};

export type ClozePart =
  | { kind: "text"; value: string }
  | { kind: "gap"; gap: ClozeGap };

const GAP_RE = /\[\[([^:\]]+):(\d+)\]\]/g;

/** Parse DET-style markers: [[send:2]] → show "se" + 3 letter boxes. */
export function parseClozePassage(questionText: string, fallbackAnswer?: string): ClozePart[] {
  const text = questionText.trim();
  if (!text.includes("[[")) {
    // Legacy: "The ___ of …" + correct_answer
    if (text.includes("___") && fallbackAnswer) {
      const answer = fallbackAnswer.trim().toLowerCase();
      const shown = Math.min(2, Math.max(0, answer.length - 1));
      const parts: ClozePart[] = [];
      const chunks = text.split("___");
      chunks.forEach((chunk, i) => {
        if (chunk) parts.push({ kind: "text", value: chunk });
        if (i < chunks.length - 1) {
          parts.push({
            kind: "gap",
            gap: {
              id: `legacy-${i}`,
              answer,
              shown,
              missing: answer.slice(shown),
            },
          });
        }
      });
      return parts;
    }
    return [{ kind: "text", value: text }];
  }

  const parts: ClozePart[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(GAP_RE);
  let gapIndex = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ kind: "text", value: text.slice(last, match.index) });
    }
    const answer = match[1].trim().toLowerCase();
    const shown = Math.min(Number(match[2]) || 0, Math.max(0, answer.length - 1));
    parts.push({
      kind: "gap",
      gap: {
        id: `gap-${gapIndex++}`,
        answer,
        shown,
        missing: answer.slice(shown),
      },
    });
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push({ kind: "text", value: text.slice(last) });
  }

  return parts;
}

export function extractGaps(parts: ClozePart[]) {
  return parts.filter((p): p is Extract<ClozePart, { kind: "gap" }> => p.kind === "gap").map((p) => p.gap);
}

export function formatTimer(totalSeconds: number) {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
