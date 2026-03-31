"use client";

import Image from "next/image";

type BabyAvatarProps = {
  avatarUrl?: string | null;
  size?: number;
  showEmoji?: boolean;
};

export default function BabyAvatar({
  avatarUrl,
  size = 40,
  showEmoji = true,
}: BabyAvatarProps) {
  const wrapperStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    display: "block",
  } as const;

  if (avatarUrl) {
    return (
      <div style={wrapperStyle}>
        <Image
          src={avatarUrl}
          alt="Avatar bebeluș"
          width={size}
          height={size}
          unoptimized
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{ ...wrapperStyle, background: "#D4849A" }}
    >
      {showEmoji ? (
        <span style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>👶</span>
      ) : null}
    </div>
  );
}

