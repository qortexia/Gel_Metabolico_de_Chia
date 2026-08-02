type ImcGaugeProps = { value: number };

const IMC_MIN = 15;
const IMC_MAX = 40;

export function ImcGauge({ value }: ImcGaugeProps) {
  const pct = Math.min(100, Math.max(0, ((value - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100));
  return (
    <div className="w-full">
      <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-brand via-warning to-danger">
        <div
          className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded bg-foreground"
          style={{ left: `${pct}%` }}
          role="img"
          aria-label={`IMC ${value}`}
        />
      </div>
    </div>
  );
}
