const LoadingOverlay = ({ isVisible, message = 'Analyzing website...' }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
        <div className="h-12 w-12 border-4 border-white/20 border-t-accent rounded-full animate-spin" />
        <p className="text-lg font-medium text-white/90">{message}</p>
        <p className="text-sm text-white/60">We’re capturing a screenshot and crafting insights.</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
