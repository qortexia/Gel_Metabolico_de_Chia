type ProjectionChartProps = {
  pesoActual: number;
  objetivo: number;
  fechaObjetivo?: string;
};

export function ProjectionChart({ pesoActual, objetivo, fechaObjetivo }: ProjectionChartProps) {
  const width = 300;
  const height = 180;
  const padding = { top: 10, right: 12, bottom: 22, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const x0 = padding.left;
  const x1 = padding.left + chartWidth;

  const maxVal = Math.max(pesoActual, objetivo) + 5;
  const minVal = Math.min(pesoActual, objetivo) - 5;
  const scaleY = (v: number) => padding.top + chartHeight - ((v - minVal) / (maxVal - minVal)) * chartHeight;

  const y0 = scaleY(pesoActual);
  const ySinPlan = scaleY(pesoActual - (pesoActual - objetivo) * 0.15);
  const yConPlan = scaleY(objetivo);

  const seguirIgual = `M${x0},${y0} L${x1},${ySinPlan}`;
  // Ease-out curve (control points hug the start/end height) instead of a
  // straight line, so the drop reads as accelerating like the reference.
  const conPlan = `M${x0},${y0} C${x0 + chartWidth * 0.35},${y0} ${x0 + chartWidth * 0.65},${yConPlan} ${x1},${yConPlan}`;

  const yTicks = [maxVal, (maxVal + minVal) / 2, minVal];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Proyección de peso con y sin el plan">
      <defs>
        <linearGradient id="conPlanGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
      </defs>

      {yTicks.map((v) => (
        <g key={v}>
          <line x1={x0} y1={scaleY(v)} x2={x1} y2={scaleY(v)} stroke="#E5E5E5" strokeWidth={1} />
          <text x={0} y={scaleY(v) + 3} fontSize={9} fill="#737373">
            {Math.round(v)}kg
          </text>
        </g>
      ))}

      <path d={seguirIgual} stroke="#A3A3A3" strokeWidth={2} fill="none" strokeDasharray="4 3" />
      <path d={conPlan} stroke="url(#conPlanGradient)" strokeWidth={3} fill="none" strokeLinecap="round" />

      <circle cx={x0} cy={y0} r={4} fill="#525252" />
      <circle cx={x1} cy={ySinPlan} r={4} fill="#A3A3A3" />
      <circle cx={x1} cy={yConPlan} r={4} fill="#16A34A" />

      <g transform={`translate(${x0 + chartWidth * 0.08}, ${Math.min(ySinPlan, y0) - 18})`}>
        <rect width={72} height={16} rx={8} fill="#E5E5E5" />
        <text x={36} y={11} fontSize={8.5} fill="#525252" textAnchor="middle">
          Sin el plan
        </text>
      </g>
      <g transform={`translate(${x0 + chartWidth * 0.42}, ${yConPlan - 18})`}>
        <rect width={132} height={16} rx={8} fill="#16A34A" />
        <text x={66} y={11} fontSize={8.5} fill="white" textAnchor="middle" fontWeight={600}>
          Con Gel Metabólico
        </text>
      </g>

      <text x={x0} y={height - 6} fontSize={10} fill="#737373">
        Hoy
      </text>
      <text x={x1} y={height - 6} fontSize={10} fill="#737373" textAnchor="end">
        {fechaObjetivo ?? 'Meta'}
      </text>
    </svg>
  );
}
