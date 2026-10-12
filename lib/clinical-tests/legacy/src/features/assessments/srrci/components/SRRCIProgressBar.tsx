"use client";
interface SRRCIProgressBarProps {
  current: number;
  total: number;
}

export default function SRRCIProgressBar({
  current,
  total,
}: SRRCIProgressBarProps) {
  const percent =
    total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((current / total) * 100),
          ),
        )
      : 0;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Assessment Progress
          </div>

          <div className="mt-1 text-lg font-semibold text-white">
            {current} of {total} Questions Completed
          </div>
        </div>

        <div className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-cyan-300">
          {percent}%
        </div>
      </div>

      <div className="h-4 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-300"
          style={{
            width: `${percent}%`,
          }}
        />
      </div>

      <div className="mt-3 text-sm text-slate-400">
        Sexual Regulation & Relational Compatibility Inventory — Research Edition
      </div>
    </div>
  );
}