import Link from "next/link";

type ContinueButtonProps = {
  children?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: "green" | "blue" | "orange" | "purple" | "ghost";
  type?: "button" | "submit";
};

const variants = {
  green: "bg-duo-green text-duo-greenText shadow-duo-green hover:brightness-110",
  blue: "bg-duo-blue text-white shadow-duo-blue hover:brightness-110",
  orange: "bg-duo-orange text-white shadow-duo-orange hover:brightness-110",
  purple: "bg-duo-purple text-[#3b0764] shadow-duo-purple hover:brightness-110",
  ghost:
    "bg-transparent text-duo-muted border-2 border-duo-border shadow-duo-gray hover:bg-duo-surface",
};

export function ContinueButton({
  children = "DEVAM ET",
  onClick,
  href,
  disabled,
  variant = "green",
  type = "button",
}: ContinueButtonProps) {
  const className = `duo-btn ${variants[variant]} ${disabled ? "cursor-not-allowed opacity-40 shadow-none" : ""}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={`${className} block text-center`}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}
