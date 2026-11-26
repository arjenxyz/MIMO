"use client";

import { useEffect, useRef } from "react";

export default function AboutStoryVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const blockMenu = (event: Event) => event.preventDefault();
    el.addEventListener("contextmenu", blockMenu);
    return () => el.removeEventListener("contextmenu", blockMenu);
  }, []);

  return (
    <video
      ref={videoRef}
      className="pointer-events-none h-full w-full select-none object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/mimo-avatar.png"
      controlsList="nodownload nofullscreen noremoteplayback"
      disablePictureInPicture
    >
      <source src="/mimo-story.mp4" type="video/mp4" />
      Tarayıcın video oynatmayı desteklemiyor.
    </video>
  );
}
