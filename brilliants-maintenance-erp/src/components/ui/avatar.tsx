"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Avatar({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function AvatarImage({
  src,
  alt = "",
  className,
  onError,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...props}
    />
  );
}

function AvatarFallback({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600",
        className
      )}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
