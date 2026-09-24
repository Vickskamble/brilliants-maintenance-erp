import { Cog } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { main: "h-5 w-5", sub: "h-2.5 w-2.5" },
  md: { main: "h-10 w-10", sub: "h-4 w-4" },
  lg: { main: "h-14 w-14", sub: "h-6 w-6" },
};

export function LoadingSpinner({
  className,
  size = "md",
}: LoadingSpinnerProps) {
  const s = sizes[size];
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      aria-label="Loading"
    >
      <Cog
        className={cn(s.main, "animate-spin text-blue-600")}
        strokeWidth={1.4}
      />
      <Cog
        className={cn(
          s.sub,
          "animate-spin-reverse absolute -right-1 -top-1 text-slate-400"
        )}
        strokeWidth={2.5}
      />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}