"use client";

import { Clock } from "lucide-react";

interface RateLimitBannerProps {
  secondsLeft: number;
  totalSeconds: number;
}

export function RateLimitBanner({
  secondsLeft,
  totalSeconds,
}: RateLimitBannerProps) {
  const safeSecondsLeft = Number.isFinite(secondsLeft)
    ? Math.max(0, Math.floor(secondsLeft))
    : 0;

  const safeTotalSeconds = Number.isFinite(totalSeconds)
    ? Math.max(1, Math.floor(totalSeconds))
    : 1;
  const clampedSecondsLeft = Math.min(safeSecondsLeft, safeTotalSeconds);

  const minutes = Math.floor(clampedSecondsLeft / 60);
  const seconds = clampedSecondsLeft % 60;
  const timeDisplay =
    minutes > 0
      ? `${minutes}m ${seconds.toString().padStart(2, "0")}s`
      : `${seconds}s`;

  const progress = Math.max(
    0,
    Math.min(100, (clampedSecondsLeft / safeTotalSeconds) * 100),
  );

  return (
    <div
      role="status"
      aria-live="off"
      className="relative w-full overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Context */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Clock className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate">
            Rate limit cooldown active
          </span>
        </div>

        {/* Right Side: High-contrast Countdown */}
        <span className="font-mono text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
          {timeDisplay}
        </span>
      </div>

      {/* Ultra-thin, low-profile progress bar aligned to the very bottom */}
      <div
        className="absolute bottom-0 left-0 h-[2px] w-full bg-neutral-100 dark:bg-neutral-900"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotalSeconds}
        aria-valuenow={clampedSecondsLeft}
        aria-label="Rate limit cooldown progress"
      >
        <div
          className="h-full bg-amber-500 transition-all duration-1000 ease-linear dark:bg-amber-400"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
