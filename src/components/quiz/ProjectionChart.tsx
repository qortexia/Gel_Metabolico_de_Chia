type ProjectionChartProps = {
  pesoActual: number;
  objetivo: number;
};

export function ProjectionChart({ pesoActual, objetivo }: ProjectionChartProps) {
  const width = 280;
  const height = 120;
  const maxVal = Math.max(pesoActual, objetivo) + 5;
  const minVal = Math.min(pesoActual, objetivo) - 5;
  const scaleY = (v: number) => height - ((v - minVal) / (maxVal - minVal)) * height;

  const seguirIgual = `M0,${scaleY(pesoActual)} L${width},${scaleY(pesoActual + 3)}`;
  const conPlan = `M0,${scaleY(pesoActual)} L${width},${scaleY(objetivo)}`;

  return (
    <svg width={width} height={height} role="img" aria-label="Proyección de peso con y sin el plan">
      <path d={seguirIgual} stroke="#EF4444" strokeWidth={2} fill="none" />
      <path d={conPlan} stroke="#16A34A" strokeWidth={3} fill="none" />
    </svg>
  );
}
