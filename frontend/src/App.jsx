import { useEffect, useMemo, useState } from 'react';
import ScoreCard from './components/ScoreCard.jsx';
import DataList from './components/DataList.jsx';
import ScreenshotPanel from './components/ScreenshotPanel.jsx';
import EmailBar from './components/EmailBar.jsx';
import Chatbot from './components/Chatbot.jsx';
import { analyzeUrl } from './lib/api.js';
import { generatePDFReport } from './utils/generateReport.js';


const storageKey = 'convertx:last-analysis';

const REVENUE_DEFAULTS = {
  visitors: 10000,
  conversionRate: 2,
  avgOrderValue: 500,
};

const DEFAULT_REVENUE_INPUTS = {
  visitors: String(REVENUE_DEFAULTS.visitors),
  conversionRate: String(REVENUE_DEFAULTS.conversionRate),
  avgOrderValue: String(REVENUE_DEFAULTS.avgOrderValue),
};

const PRIORITY_IMPACT_COPY = {
  seo: "Fixing this could unlock organic traffic and better rankings.",
  ux: "Fixing this could significantly improve conversions.",
  performance: "Fixing this could reduce bounce and build trust.",
  content: "Fixing this could deepen engagement and time on page.",
};

const clampValue = (value, min = 0, max = Number.POSITIVE_INFINITY) =>
  Math.min(Math.max(value, min), max);

const toNumberOrFallback = (value, fallback, { min = 0, max = Number.POSITIVE_INFINITY } = {}) => {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clampValue(parsed, min, max);
};

const calculateRevenueImpact = ({
  uxScore,
  seoScore,
  visitors,
  conversionRate,
  avgOrderValue,
}) => {
  if (typeof uxScore !== 'number' || typeof seoScore !== 'number') {
    return {
      monthlyLoss: null,
      trafficLoss: null,
      conversionLoss: null,
    };
  }

  const trafficLossPct = clampValue((100 - seoScore) * 0.5, 0, 100);
  const conversionLossPct = clampValue((100 - uxScore) * 0.3, 0, 100);

  const adjustedTraffic = visitors * (trafficLossPct / 100);
  const adjustedConversionRate = (conversionRate / 100) * (conversionLossPct / 100);

  const estimatedLoss = adjustedTraffic * adjustedConversionRate * avgOrderValue;

  return {
    monthlyLoss: Math.round(estimatedLoss),
    trafficLoss: Number(trafficLossPct.toFixed(1)),
    conversionLoss: Number(conversionLossPct.toFixed(1)),
  };
};

const isValidUrl = (value) => {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol?.startsWith('http'));
  } catch (error) {
    return false;
  }
};

const App = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revenueInputs, setRevenueInputs] = useState(() => ({
    ...DEFAULT_REVENUE_INPUTS,
  }));
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'revenue', label: 'Revenue Impact', icon: '📈' },
    { id: 'priority', label: 'Priority Fixes', icon: '⚡' },
    { id: 'issues', label: 'Issues', icon: '🧾' },
    { id: 'suggestions', label: 'Suggestions', icon: '💡' },
    { id: 'simulation', label: 'Simulation', icon: '🖥️' },
  ];
  const [activeSection, setActiveSection] = useState(navItems[0].id);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        setAnalysis(JSON.parse(cached));
      } catch (err) {
        console.warn('Unable to parse cached analysis', err);
      }
    }
  }, []);

  useEffect(() => {
    if (analysis) {
      const safeData = { ...analysis };
      delete safeData.screenshot;

      localStorage.setItem("convertx:last-analysis", JSON.stringify(safeData));
    }
  }, [analysis]);

  const normalizedRevenueInputs = useMemo(
    () => ({
      visitors: toNumberOrFallback(revenueInputs.visitors, REVENUE_DEFAULTS.visitors),
      conversionRate: toNumberOrFallback(
        revenueInputs.conversionRate,
        REVENUE_DEFAULTS.conversionRate,
        { min: 0, max: 100 },
      ),
      avgOrderValue: toNumberOrFallback(
        revenueInputs.avgOrderValue,
        REVENUE_DEFAULTS.avgOrderValue,
      ),
    }),
    [revenueInputs]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!isValidUrl(targetUrl)) {
      setError('Enter a valid https:// URL to analyze.');
      return;
    }

    setLoading(true);
    try {
      const overrides = {
        visitors: normalizedRevenueInputs.visitors,
        conversion_rate: normalizedRevenueInputs.conversionRate,
        avg_order_value: normalizedRevenueInputs.avgOrderValue,
      };
      const { data } = await analyzeUrl(targetUrl, overrides);
      setAnalysis(data);
    } catch (requestError) {
      console.error("FULL ERROR:", requestError);
      console.log("RESPONSE:", requestError?.response);
      console.log("DETAIL:", requestError?.response?.data);
      setError(requestError?.response?.data?.detail ?? 'Unable to complete analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevenueInputChange = (field) => (event) => {
    setRevenueInputs((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const hasResult = Boolean(analysis);
  const screenshot = analysis?.screenshot_b64;
  const issueList = analysis?.issues ?? [];
  const topIssue = issueList[0];
  const topImpactText = topIssue
    ? PRIORITY_IMPACT_COPY[topIssue.area] ?? "Fixing this could significantly improve conversions."
    : "Run an analysis to see your top-priority recommendation.";
  const suggestionItems = analysis?.suggestions?.map((item) => ({
    title: item.title,
    description: item.rationale ?? item.description,
  })) ?? [];

  const derivedRevenueImpact = useMemo(
    () =>
      calculateRevenueImpact({
        uxScore: analysis?.ux_score,
        seoScore: analysis?.seo_score,
        visitors: normalizedRevenueInputs.visitors,
        conversionRate: normalizedRevenueInputs.conversionRate,
        avgOrderValue: normalizedRevenueInputs.avgOrderValue,
      }),
    [analysis, normalizedRevenueInputs]
  );
  const topIssuesForReport = issueList.slice(0, 3);
  const topSuggestionsForReport = suggestionItems.slice(0, 3);
  const analyzedUrl = (analysis?.url ?? targetUrl) || 'Not provided';

  const renderIssueItem = useMemo(
    () => (issue, idx) => {
      const isTop = idx === 0;
      const priorityLabel = issue?.priority_label ?? "Priority Pending";
      const priorityScore =
        typeof issue?.priority_score === "number"
          ? issue.priority_score.toFixed(1)
          : null;

      const showBody =
        issue?.description &&
        issue.description !== (issue?.title ?? issue?.description ?? "");

      return (
        <div
          className={`rounded-2xl border p-4 transition ${isTop
            ? "border-rose-400/60 bg-rose-500/10 shadow-[0_10px_40px_rgba(225,29,72,0.25)]"
            : "border-white/10 bg-white/5"
            }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white flex items-center gap-2">
              {isTop && (
                <span role="img" aria-label="Top priority" className="text-lg">
                  🔥
                </span>
              )}
              {issue?.title ?? issue?.description}
            </p>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-50/90 px-3 py-1 rounded-full border border-rose-200/40 bg-rose-500/20">
              {priorityLabel}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
            <span className="rounded-full border border-white/20 px-2 py-0.5">{issue?.area}</span>
            <span className="rounded-full border border-white/20 px-2 py-0.5">{issue?.severity}</span>
            {priorityScore && (
              <span className="rounded-full border border-white/20 px-2 py-0.5">
                Score {priorityScore}
              </span>
            )}
          </div>
          {showBody && (
            <p className="mt-3 text-sm text-white/70 leading-relaxed">{issue.description}</p>
          )}
        </div>
      );
    },
    []
  );

  const renderRevenueInputsCard = () => (
    <div className="glass-card p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
          Revenue model inputs
        </p>
        <p className="mt-2 text-sm text-white/70">
          Tune assumptions to mirror your funnel before sharing the story.
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label htmlFor="revenue-visitors" className="flex flex-col gap-2 text-sm font-medium text-white/70">
          <span className="text-xs uppercase tracking-wide text-white/50">Monthly Visitors</span>
          <input
            id="revenue-visitors"
            type="number"
            min="0"
            step="100"
            inputMode="numeric"
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white placeholder-white/40 focus:border-rose-300 focus:ring-2 focus:ring-rose-300/40"
            value={revenueInputs.visitors}
            onChange={handleRevenueInputChange('visitors')}
          />
        </label>
        <label htmlFor="revenue-conversion" className="flex flex-col gap-2 text-sm font-medium text-white/70">
          <span className="text-xs uppercase tracking-wide text-white/50">Conversion Rate (%)</span>
          <input
            id="revenue-conversion"
            type="number"
            min="0"
            max="100"
            step="0.1"
            inputMode="decimal"
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white placeholder-white/40 focus:border-rose-300 focus:ring-2 focus:ring-rose-300/40"
            value={revenueInputs.conversionRate}
            onChange={handleRevenueInputChange('conversionRate')}
          />
        </label>
        <label htmlFor="revenue-aov" className="flex flex-col gap-2 text-sm font-medium text-white/70">
          <span className="text-xs uppercase tracking-wide text-white/50">Avg Order Value (₹)</span>
          <input
            id="revenue-aov"
            type="number"
            min="0"
            step="50"
            inputMode="decimal"
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white placeholder-white/40 focus:border-rose-300 focus:ring-2 focus:ring-rose-300/40"
            value={revenueInputs.avgOrderValue}
            onChange={handleRevenueInputChange('avgOrderValue')}
          />
        </label>
      </div>
    </div>
  );

  const renderRevenueSummaryCard = () => (
    <div className="relative overflow-hidden rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-900/50 via-rose-700/30 to-transparent p-6 text-left shadow-[0_25px_120px_rgba(225,29,72,0.25)]">
      <div className="absolute inset-0 opacity-30 blur-3xl bg-gradient-to-br from-rose-500 via-red-500/40 to-transparent pointer-events-none" />
      <div className="relative z-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Revenue Impact</p>
        <h3 className="mt-2 text-3xl font-semibold">Potential Monthly Loss</h3>
        <p className="mt-4 text-5xl font-black tracking-tight text-rose-100">
          {typeof derivedRevenueImpact.monthlyLoss === 'number'
            ? `₹${derivedRevenueImpact.monthlyLoss.toLocaleString('en-IN')}`
            : '—'}
        </p>
        <p className="mt-3 text-sm text-white/80 max-w-md">
          Potential revenue lost due to current UX and SEO inefficiencies.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
            <p className="text-xs uppercase tracking-wide text-white/60">Traffic Loss</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {typeof derivedRevenueImpact.trafficLoss === 'number'
                ? `${derivedRevenueImpact.trafficLoss}%`
                : '—'}
            </p>
            <p className="text-xs text-white/60 mt-1">
              SEO drag on organic sessions.
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
            <p className="text-xs uppercase tracking-wide text-white/60">Conversion Loss</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {typeof derivedRevenueImpact.conversionLoss === 'number'
                ? `${derivedRevenueImpact.conversionLoss}%`
                : '—'}
            </p>
            <p className="text-xs text-white/60 mt-1">
              UX friction hurting sign-ups.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScoreCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

      <ScoreCard label="UX Score" score={analysis?.ux_score ?? null} />
      <ScoreCard label="SEO Score" score={analysis?.seo_score ?? null} />

      <ScoreCard label="Mobile Score" score={analysis?.mobile_score ?? null} />
      <ScoreCard label="Performance Score" score={analysis?.performance_score ?? null} />
      <ScoreCard label="Lead Score" score={analysis?.lead_score ?? null} />

      {/* MAIN HERO */}
      <ScoreCard
        label="Growth Score 🚀"
        score={analysis?.growth_score ?? null}
        breakdown={analysis}
      />

    </div>
  );

  const renderTopPriorityCard = () => (
    <div className="glass-card p-6">
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">Top Priority Fix</p>
      {topIssue ? (
        <>
          <p className="mt-3 text-xl font-semibold flex items-center gap-2">
            <span role="img" aria-label="Top issue">🔥</span>
            {topIssue.title ?? topIssue.description}
          </p>
          <p className="mt-2 text-sm text-white/70 leading-relaxed">
            {topImpactText}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/60">
          Run an analysis to surface the fix with the biggest business impact.
        </p>
      )}
    </div>
  );

  const renderBusinessImpactCard = () => (
    <div className="glass-card p-6 h-full">
      <h3 className="text-lg font-semibold">Business Impact</h3>
      <p className="mt-2 text-white/70 leading-relaxed">
        {analysis?.business_impact?.summary ?? 'Insights will summarize the biggest wins here.'}
      </p>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <p className="text-sm text-white/60 mb-2">
              Analyze your website, quantify revenue loss, and simulate improvements — all in one place.
            </p>
            <div className="grid gap-6 2xl:grid-cols-2">
              <div className="space-y-4">
                {renderRevenueInputsCard()}
                {renderRevenueSummaryCard()}
              </div>
              <div className="space-y-4">
                {renderScoreCards()}
              </div>
            </div>
          </div>
        );
      case 'revenue':
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            {renderRevenueInputsCard()}
            {renderRevenueSummaryCard()}
          </div>
        );
      case 'priority':
        return (
          <div className="space-y-4">
            {renderTopPriorityCard()}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
                  Priority Stack
                </p>
                <span className="text-xs text-white/60">{issueList.length ? `${issueList.length} issues` : 'No data'}</span>
              </div>
              <div className="mt-4 space-y-4">
                {issueList.length
                  ? issueList.slice(0, 3).map((issue, idx) => (
                    <div key={`priority-${idx}`}>{renderIssueItem(issue, idx)}</div>
                  ))
                  : (
                    <p className="text-sm text-white/60">
                      Run an analysis to calculate priorities.
                    </p>
                  )}
              </div>
            </div>
          </div>
        );
      case 'issues':
        return (
          <div className="space-y-4">
            {renderTopPriorityCard()}
            <DataList
              title="Issues"
              items={issueList}
              emptyLabel={hasResult ? 'No issues detected 🎉' : 'Issues will appear after the first run.'}
              renderItem={renderIssueItem}
            />
          </div>
        );
      case 'suggestions':
        return (
          <DataList
            title="Suggestions"
            items={suggestionItems}
            emptyLabel={hasResult ? 'No suggestions yet.' : 'Suggestions will appear here.'}
          />
        );
      case 'simulation':
        return (
          <div className="space-y-8">
            <div className="w-full">
              {renderBusinessImpactCard()}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/50 mb-2">
                  Before
                </p>
                <ScreenshotPanel
                  screenshot={screenshot}
                  issues={analysis?.issues ?? []}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-400 mb-2">
                  After
                </p>
                <ScreenshotPanel
                  screenshot={screenshot}
                  issues={(analysis?.issues ?? []).map((issue) => ({
                    ...issue,
                    title: issue?.title ?? 'Fixed',
                    description: issue?.description ?? 'Improved outcome',
                    severity: 'low',
                  }))}
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const activeNav = navItems.find((item) => item.id === activeSection);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-midnight via-[#050b1f] to-[#03050f] text-white flex">

        {/* Sidebar */}
        <aside
          className={`flex flex-col border-r border-white/10 bg-black/30 backdrop-blur-lg transition-all duration-500 ${sidebarCollapsed ? 'w-20' : 'w-64'
            }`}
        >
          <div className="flex items-center justify-between px-4 py-6">
            {!sidebarCollapsed && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/50">ConvertX</p>
                <p className="text-lg font-semibold">Control</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="rounded-full border border-white/20 bg-white/10 p-2 text-sm text-white/70 hover:text-white"
            >
              {sidebarCollapsed ? '›' : '‹'}
            </button>
          </div>

          <nav className="flex-1 px-2 space-y-1 pb-6">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'
                    } gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span>{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <header className="flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur px-4 py-4 md:px-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/50">Section</p>
              <h2 className="text-lg font-semibold">{activeNav?.label}</h2>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-8 md:px-8 pb-32 space-y-8 max-w-6xl mx-auto w-full">

              {/* Hero */}
              <section className="glass-card px-6 md:px-8 py-8 text-center">
                <p className="text-sm uppercase tracking-[0.4em] text-white/60">ConvertX AI</p>
                <h1 className="mt-4 text-4xl font-semibold">Instant UX & SEO Intelligence</h1>

                <form
                  className="mt-8 flex flex-col gap-4 md:flex-row"
                  onSubmit={handleSubmit}
                >
                  <input
                    type="text"
                    placeholder="https://yourwebsite.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="rounded-2xl bg-gradient-to-r from-accent to-sky-400 px-8 py-4 font-semibold text-slate-900"
                  >
                    Analyze
                  </button>
                  <button
                    type="button"
                    onClick={() => generatePDFReport(analysis)}
                    disabled={!analysis}
                    className={`rounded-2xl border px-8 py-4 font-semibold transition ${analysis
                      ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                      : 'border-white/5 bg-white/5 text-white/50 cursor-not-allowed'
                      }`}
                  >
                    Download Report
                  </button>
                </form>

                {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
              </section>

              {renderSectionContent()}

            </div>
          </div>

        </div>

      </div>

      <div
        id="report-content"
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          background: '#ffffff',
          color: '#000000',
          width: '800px',
          padding: '32px',
          lineHeight: 1.5,
          fontFamily: '"Inter", Arial, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>ConvertX Website Audit Report</h1>
        <p><strong>URL:</strong> {analyzedUrl}</p>
        <p><strong>UX Score:</strong> {analysis?.ux_score ?? '—'}</p>
        <p><strong>SEO Score:</strong> {analysis?.seo_score ?? '—'}</p>
        <p><strong>Estimated Monthly Loss:</strong> ₹{analysis?.estimated_monthly_loss?.toLocaleString('en-IN') ?? '—'}</p>
        <h2 style={{ marginTop: '24px', fontSize: '20px' }}>Top Issues</h2>
        <ol>
          {topIssuesForReport.length
            ? topIssuesForReport.map((issue, idx) => (
              <li key={`issue-${idx}`}>
                <strong>{issue?.title ?? issue?.description ?? `Issue ${idx + 1}`}</strong>
                <div>{issue?.description ?? 'No description available.'}</div>
              </li>
            ))
            : <li>No issues available.</li>}
        </ol>
        <h2 style={{ marginTop: '24px', fontSize: '20px' }}>Top Suggestions</h2>
        <ol>
          {topSuggestionsForReport.length
            ? topSuggestionsForReport.map((suggestion, idx) => (
              <li key={`suggestion-${idx}`}>
                <strong>{suggestion?.title ?? `Suggestion ${idx + 1}`}</strong>
                <div>{suggestion?.description ?? 'No details provided.'}</div>
              </li>
            ))
            : <li>No suggestions available.</li>}
        </ol>
        <h2 style={{ marginTop: '24px', fontSize: '20px' }}>Business Impact</h2>
        <p>{analysis?.business_impact?.summary ?? 'Business impact summary not available.'}</p>
      </div>
      <EmailBar analysis={analysis} />
      <Chatbot analysis={analysis} />
    </>
  );
};

export default App;
