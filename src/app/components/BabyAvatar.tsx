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
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt="Avatar bebeluș"
        width={size}
        height={size}
        unoptimized
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center"
      style={{ width: size, height: size, background: "#D4849A" }}
    >
      {showEmoji ? (
        <span style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>👶</span>
      ) : null}
    </div>
  );
}

