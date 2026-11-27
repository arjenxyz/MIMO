type Props = {
  href?: string;
  className?: string;
  /** Show shield + “Secured by” caption (default true). */
  showCaption?: boolean;
};

/** Web port of the ARJENSAN brand mark (shine + optional “Secured by”). */
export function ArjensanMark({
  href = "https://arjenofficial.com",
  className = "",
  showCaption = true,
}: Props) {
  const inner = (
    <span className="inline-flex items-center gap-1.5">
      {showCaption ? (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="shrink-0 text-[#1cb0f6]"
          >
            <path
              d="M12 3 5 6.2v5.1c0 4.4 2.9 8.4 7 9.7 4.1-1.3 7-5.3 7-9.7V6.2L12 3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="m9.2 12.1 1.9 1.9 3.7-3.8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[11px] font-semibold tracking-wide text-mimo-muted">
            Secured by
          </span>
        </>
      ) : null}
      <span className="arjensan-word relative inline-block overflow-hidden text-[11px] font-black tracking-[0.12em] text-mimo-title">
        ARJENSAN
        <span aria-hidden className="arjensan-shine" />
      </span>
    </span>
  );

  if (!href) {
    return (
      <span className={className} aria-label="Secured by ARJENSAN">
        {inner}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Secured by ARJENSAN"
      className={`inline-flex rounded-xl px-2 py-1.5 transition hover:bg-mimo-surface ${className}`}
    >
      {inner}
    </a>
  );
}
