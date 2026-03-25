const DataList = ({ title, items = [], emptyLabel = 'No data yet', renderMeta, renderItem }) => (
  <div className="glass-card p-6 h-full">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">{title}</h3>
      {items?.length ? <span className="text-xs uppercase tracking-[0.2em] text-white/50">{items.length}</span> : null}
    </div>
    <div className="mt-6 space-y-4">
      {items && items.length ? (
        items.map((item, idx) =>
          renderItem ? (
            <div key={`${title}-${idx}`}>{renderItem(item, idx)}</div>
          ) : (
            <div key={`${title}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white/90">{item.title ?? item.description}</p>
                {renderMeta ? renderMeta(item) : null}
              </div>
              {item.description && <p className="mt-2 text-sm text-white/70 leading-relaxed">{item.description}</p>}
            </div>
          )
        )
      ) : (
        <div className="text-sm text-white/60">{emptyLabel}</div>
      )}
    </div>
  </div>
);

export default DataList;
