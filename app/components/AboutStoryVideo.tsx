"use client";

export default function AboutStoryVideo() {
  return (
    <video
      className="pointer-events-none h-full w-full select-none object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/mimo-avatar.png"
      controlsList="nodownload nofullscreen noremoteplayback"
      disablePictureInPicture
      disableRemotePlayback
      onContextMenu={(e) => e.preventDefault()}
    >
      <source src="/mimo-story.mp4" type="video/mp4" />
      Tarayıcın video oynatmayı desteklemiyor.
    </video>
  );
}
