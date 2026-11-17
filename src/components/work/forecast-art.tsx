/** A drawn price chart (history, then a dashed forecast with its band) for the case page that has no screenshot. Illustrative, not data. */
export function ForecastArt() {
  const history = [62, 60, 64, 63, 67, 66, 70, 68, 72, 71, 74, 78, 76, 80, 79, 83];
  const forecast = [83, 84, 86, 85, 88];
  const x = (i: number) => 30 + i * 22;
  const y = (v: number) => 230 - (v - 50) * 4.2;
  const line = (pts: number[], start: number) => pts.map((v, i) => `${i ? "L" : "M"}${x(start + i)} ${y(v)}`).join(" ");
  const band = `M${x(15)} ${y(83)} ${forecast.map((v, i) => `L${x(15 + i)} ${y(v + 2 + i * 1.6)}`).join(" ")} ${forecast
    .map((v, i) => `L${x(19 - i)} ${y(forecast[4 - i] - 2 - (4 - i) * 1.6)}`)
    .join(" ")} Z`;
  return (
    <figure className="rounded-[22px] border border-ink/10 bg-white p-6 shadow-[0_30px_70px_-35px_rgba(0,0,0,0.35)]">
      <div className="flex items-baseline justify-between font-mono text-[11px] text-ink/50">
        <span>FOB Bitumen Singapore</span>
        <span>illustration</span>
      </div>
      <svg viewBox="0 0 480 260" className="mt-3 h-auto w-full" role="img" aria-label="Illustration: a price history line, then a dashed forecast with a widening band">
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={30} x2={470} y1={50 + i * 60} y2={50 + i * 60} stroke="currentColor" className="text-ink/10" />
        ))}
        <path d={band} fill="#e8b84b" fillOpacity={0.22} />
        <path d={line(history, 0)} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
        <path d={line(forecast, 15)} fill="none" stroke="#b8860b" strokeWidth={2.5} strokeDasharray="6 5" strokeLinejoin="round" />
        <line x1={x(15)} x2={x(15)} y1={30} y2={240} stroke="var(--ink)" strokeOpacity={0.25} strokeDasharray="3 4" />
        <text x={x(15) - 6} y={26} textAnchor="end" className="fill-ink/50 font-mono text-[11px]">
          history
        </text>
        <text x={x(15) + 6} y={26} className="fill-[#b8860b] font-mono text-[11px]">
          forecast
        </text>
      </svg>
    </figure>
  );
}
