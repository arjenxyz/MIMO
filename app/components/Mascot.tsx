import Image from "next/image";

type MascotMood = "wave" | "excited" | "happy" | "avatar";

const SRC: Record<MascotMood, string> = {
  wave: "/mimo.png",
  excited: "/mimo.png",
  happy: "/mimo.png",
  avatar: "/mimo-avatar.png",
};

export function Mascot({
  mood = "wave",
  className = "",
  size = 220,
}: {
  mood?: MascotMood;
  className?: string;
  size?: number;
}) {
  const isAvatar = mood === "avatar";

  return (
    <div className={`mimo-bounce relative ${className}`}>
      <Image
        src={SRC[mood]}
        alt="Mimo maskotu"
        width={size}
        height={size}
        priority
        className={
          isAvatar
            ? "h-auto w-full rounded-full object-cover drop-shadow-xl"
            : "h-auto w-full object-contain"
        }
      />
    </div>
  );
}
