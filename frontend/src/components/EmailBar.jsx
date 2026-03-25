import { useMemo, useState } from 'react';
import { sendReport } from '../lib/api.js';

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
    <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/70 backdrop-blur-md px-4 py-2 shadow-lg">
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto mx-auto flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/70 px-4 py-4 text-white shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:gap-4 sm:px-6"
      >
        <div className="flex-1 w-full">
          <label htmlFor="report-email" className="text-xs uppercase tracking-[0.3em] text-white/60">
            Send Report via Email
          </label>
          <input
            id="report-email"
            type="email"
            placeholder="you@company.com"
            className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setMessage('');
              setStatus('idle');
            }}
            required
          />
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <button
            type="submit"
            disabled={disabled}
            className={`w-full whitespace-nowrap rounded-2xl px-6 py-3 text-sm font-semibold uppercase tracking-wide transition ${disabled
                ? 'bg-white/10 text-white/60 cursor-not-allowed'
                : 'bg-gradient-to-r from-accent to-sky-400 text-slate-900 hover:opacity-90'
              }`}
          >
            {buttonLabel}
          </button>
          <p className="text-xs text-white/70 min-h-[1.25rem]">{message}</p>
        </div>
      </form>
    </div>
  );
};

export default EmailBar;
