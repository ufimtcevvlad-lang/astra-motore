"use client";

import Image from "next/image";
import { useState } from "react";

type Props = { src: string; alt: string; fill?: boolean; className?: string; sizes?: string; quality?: number };

export function ProductImage({ src, alt, fill, className, sizes, quality = 72 }: Props) {

  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={className}
        style={fill ? { position: "absolute", inset: 0, background: "#e2e8f0" } : { aspectRatio: "4/3", background: "#e2e8f0" }}
        aria-hidden
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      quality={quality}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
