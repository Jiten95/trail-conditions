export function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.max(0, Math.min(100, confidence));
  return (
    <div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="meter-label">
        <span>Confidence</span>
        <span className="value">{pct}%</span>
      </div>
    </div>
  );
}
