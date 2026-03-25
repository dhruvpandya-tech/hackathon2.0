import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const getGaugeColor = (score) => {
  if (score >= 80) return '#34d399';
  if (score >= 50) return '#fbbf24';
  return '#f87171';
};

const ScoreCard = ({ label, score }) => {
  const safeScore = typeof score === 'number' ? score : 0;
  const gaugeColor = getGaugeColor(safeScore);

  return (
    <div className="glass-card p-6 shadow-card flex flex-col gap-4">
      <div className="text-sm uppercase tracking-[0.2em] text-white/60">{label}</div>
      <div className="flex justify-center">
        <div className="w-44 h-24 overflow-visible">
          <CircularProgressbar
            value={safeScore}
            maxValue={100}
            text={`${score ?? '--'}`}
            circleRatio={0.5}
            styles={buildStyles({
              rotation: 0.75,
              strokeLinecap: 'round',
              trailColor: 'rgba(255,255,255,0.08)',
              textColor: '#ffffff',
              pathColor: gaugeColor,
            })}
          />
        </div>
      </div>
      <div className="text-center text-xs uppercase tracking-[0.3em] text-white/50">/100</div>
    </div>
  );
};

export default ScoreCard;
