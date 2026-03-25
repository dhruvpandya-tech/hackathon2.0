import { useMemo } from "react";

const defaultAnchors = [
  { top: 18, left: 25 },
  { top: 18, left: 70 },
  { top: 45, left: 32 },
  { top: 45, left: 68 },
  { top: 70, left: 25 },
  { top: 70, left: 70 },
];

const clampPercent = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
};

const resolvePosition = (issue, index) => {
  const source =
    issue?.position ??
    issue?.coordinates ??
    defaultAnchors[index % defaultAnchors.length];

  return {
    top: clampPercent(source?.top ?? 0),
    left: clampPercent(source?.left ?? 0),
  };
};

const severityVisuals = {
  high: {
    icon: "🔴",
    border: "border-red-500/60",
    glow: "0 0 22px rgba(248,113,113,0.45)",
    accent: "bg-red-500",
  },
  medium: {
    icon: "🟡",
    border: "border-amber-400/60",
    glow: "0 0 22px rgba(251,191,36,0.4)",
    accent: "bg-yellow-400",
  },
  low: {
    icon: "🔵",
    border: "border-sky-400/60",
    glow: "0 0 22px rgba(14,165,233,0.35)",
    accent: "bg-blue-400",
  },
};

const getVisuals = (severity) =>
  severityVisuals[(severity || "low").toLowerCase()] ?? severityVisuals.low;

const useIsAfterMode = (issues) =>
  useMemo(() => {
    if (!issues.length) return false;
    return issues.every((issue) => {
      const title = (issue?.title ?? "").toLowerCase();
      const description = (issue?.description ?? "").toLowerCase();
      const lowSeverity =
        !issue?.severity || issue.severity.toLowerCase() === "low";
      const fixedCopy =
        title.includes("fixed") ||
        title.includes("improved") ||
        description.includes("improved") ||
        description.includes("fixed");
      return lowSeverity && fixedCopy;
    });
  }, [issues]);

const ScreenshotPanel = ({ screenshot, issues = [] }) => {
  const topIssues = useMemo(() => issues.slice(0, 5), [issues]);
  const isAfterMode = useIsAfterMode(topIssues);
  const primaryIssueSlots = [
    { top: 40, left: 30 },
    { top: 40, left: 65 },
  ];
  const secondaryIssueSlots = [
    { top: 72, left: 22 },
    { top: 75, left: 50 },
    { top: 78, left: 78 },
  ];

  if (!screenshot) {
    return (
      <div className="text-white/60 text-sm">
        Screenshot unavailable
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full h-[950px] md:h-[850px] overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="relative w-full h-full">
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt="Website preview"
            className="w-full h-full object-cover object-top scale-[1.2]"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(#00ffcc22_1px,transparent_1px),linear-gradient(90deg,#00ffcc22_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 z-10 pointer-events-none" />
          {isAfterMode && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute top-2 left-4 right-4">
                <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 shadow-lg flex items-center justify-between text-xs text-white/70">
                  <span>Logo</span>
                  <div className="flex gap-3">
                    <span>Home</span>
                    <span>Services</span>
                    <span>Contact</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center px-4">
                <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 shadow-lg">
                  <h2 className="text-white text-lg font-semibold">
                    Transform Your Digital Presence
                  </h2>
                  <p className="text-white/60 text-sm">
                    Optimized for performance, UX &amp; conversions
                  </p>
                </div>
              </div>
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20">
                <div className="bg-black/70 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-lg animate-pulse" style={{ animationDuration: "3s" }}>
                  <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold shadow-lg">
                    Get Started
                  </button>
                </div>
              </div>
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-3 z-20 opacity-70">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="w-28 h-16 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-xs text-white shadow-lg"
                  >
                    Feature
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 rounded-2xl shadow-[0_0_80px_rgba(16,185,129,0.15)] pointer-events-none" />
            </div>
          )}
          <div className="absolute inset-0 z-30">
            {topIssues.map((issue, index) => {
              const resolvedPosition = resolvePosition(issue, index);
              const isPrimary = index < 2;
              const slot = isPrimary
                ? primaryIssueSlots[index]
                : secondaryIssueSlots[(index - 2) % secondaryIssueSlots.length];
              const adjustedTop = clampPercent(slot?.top ?? resolvedPosition.top);
              const adjustedLeft = clampPercent(slot?.left ?? resolvedPosition.left);
              const label =
                issue?.title ?? issue?.description ?? `Issue ${index + 1}`;
              const description =
                issue?.description && issue.description !== label
                  ? issue.description
                  : "Needs attention.";
              const truncatedDescription = description
                ? `${description.slice(0, 60)}${description.length > 60 ? "…" : ""}`
                : "Needs attention.";
              const visuals = getVisuals(issue?.severity);
              const borderClass = isAfterMode
                ? "border-emerald-400/40"
                : visuals.border;
              const glowStyle = isAfterMode
                ? "0 0 20px rgba(16,185,129,0.4)"
                : visuals.glow;
              const titleText = isAfterMode
                ? issue?.title ?? "Fixed"
                : label;
              const bodyText = isAfterMode
                ? issue?.description ?? "Improved"
                : truncatedDescription;
              const accentClass = isAfterMode
                ? "bg-emerald-400"
                : visuals.accent;
              const scaleClass = isPrimary ? "scale-[1.1]" : "scale-[0.9]";
              const hoverScaleClass = isPrimary
                ? "hover:scale-[1.18]"
                : "hover:scale-[0.98]";
              const opacityClass = isPrimary ? "opacity-100" : "opacity-80";
              const maxWidth = isPrimary ? "280px" : "220px";
              const minWidth = isPrimary ? "160px" : "130px";

              return (
                <div
                  key={`${label}-${index}`}
                  className={`absolute rounded-2xl px-4 py-3 text-sm text-white bg-black/70 backdrop-blur-md border ${borderClass} shadow-[0_10px_40px_rgba(0,0,0,0.6)] transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 ${scaleClass} ${hoverScaleClass} ${opacityClass} hover:z-50`}
                  style={{
                    top: `${adjustedTop}%`,
                    left: `${adjustedLeft}%`,
                    maxWidth,
                    minWidth,
                    boxShadow: glowStyle,
                  }}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentClass}`}
                  />
                  <div className="ml-2">
                    <div className="text-xs uppercase text-white/50 tracking-wide">
                      {issue?.area || "general"}
                    </div>
                    <p className="mt-1 font-semibold leading-snug">
                      {isAfterMode ? "Fixed" : titleText}
                    </p>
                    <p className="mt-1 text-xs text-white/70 leading-snug">
                      {isAfterMode ? "Improved experience" : bodyText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {isAfterMode && (
            <p className="absolute top-2 left-4 text-emerald-400 text-xs z-40">
              AI Improved Version
            </p>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/60 to-transparent z-30 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default ScreenshotPanel;
