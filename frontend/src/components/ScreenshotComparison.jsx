import ScreenshotPanel from './ScreenshotPanel.jsx';

const getFixLabel = (issue) => {
  switch (issue?.area) {
    case 'seo':
      return 'SEO Improved';
    case 'ux':
      return 'Better Layout';
    case 'performance':
      return 'Faster Load';
    default:
      return 'Issue Fixed';
  }
};

const ScreenshotComparison = ({ screenshot, issues = [] }) => {
  const topIssues = issues.slice(0, 5);
  const fixedIssues = topIssues.map((issue, index) => ({
    ...issue,
    severity: 'low',
    title: issue?.title ?? `Fixed ${index + 1}`,
    description: getFixLabel(issue),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-card p-4 rounded-3xl border border-rose-500/40 bg-black/40">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-rose-300">
          <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
          Before
        </div>
        <ScreenshotPanel screenshot={screenshot} issues={topIssues} />
      </div>

      <div className="glass-card p-4 rounded-3xl border border-emerald-400/50 bg-emerald-500/5 shadow-[0_20px_80px_rgba(16,185,129,0.35)]">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          After
        </div>
        <ScreenshotPanel screenshot={screenshot} issues={fixedIssues} />
      </div>
    </div>
  );
};

export default ScreenshotComparison;
