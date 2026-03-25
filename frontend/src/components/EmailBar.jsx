import { useMemo, useState } from 'react';
import { sendReport } from '../lib/api.js';
import { generatePDFReport } from '../utils/generateReport.js';

const EmailBar = ({ analysis }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const topIssues = useMemo(
    () =>
      (analysis?.issues ?? [])
        .slice(0, 3)
        .map((issue) => issue?.title ?? issue?.description ?? 'Issue'),
    [analysis]
  );

  const canSend =
    Boolean(analysis) &&
    Boolean(email) &&
    analysis?.ux_score !== undefined &&
    analysis?.seo_score !== undefined &&
    analysis?.estimated_monthly_loss !== undefined;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSend || status === 'sending') return;

    setStatus('sending');
    setMessage('');

    try {
      await sendReport({
        email,
        ux_score: analysis?.ux_score ?? 0,
        seo_score: analysis?.seo_score ?? 0,
        estimated_loss: analysis?.estimated_monthly_loss ?? 0,
        top_issues: topIssues,
      });
      setStatus('success');
      setMessage('✅ Report sent successfully');
    } catch (error) {
      console.error('Report email failed', error);
      setStatus('error');
      setMessage('❌ Failed to send');
    }
  };

  const disabled = !canSend || status === 'sending';
  const buttonLabel = status === 'sending' ? 'Sending...' : 'Send Report';

  return (
    <div className="w-full border-t border-white/10 bg-black/40 backdrop-blur-md py-6 mt-12">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 text-white sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex-1">
          <p className="text-sm font-semibold tracking-wide text-white/80 mb-2">
            Get full report via email
          </p>
          <div className="flex items-center gap-3">
            <input
              id="report-email"
              type="email"
              placeholder="you@company.com"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder-white/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage('');
                setStatus('idle');
              }}
              required
            />
            <button
              type="submit"
              disabled={disabled}
              className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${disabled
                ? 'bg-white/10 text-white/60 cursor-not-allowed'
                : 'bg-gradient-to-r from-accent to-sky-400 text-slate-900 hover:opacity-90'
                }`}
            >
              {buttonLabel}
            </button>
            <button
              type="button"
              onClick={() => generatePDFReport(analysis)}
              disabled={!analysis}
              className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${analysis
                ? 'border border-white/20 text-white hover:bg-white/10'
                : 'border border-white/5 text-white/50 cursor-not-allowed'
                }`}
            >
              Download Report
            </button>
          </div>
        </div>
        <p className="text-xs text-white/70 min-w-[140px] text-center sm:text-left">{message}</p>
      </form>
    </div>
  );
};

export default EmailBar;
