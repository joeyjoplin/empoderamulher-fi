import { impactMetrics } from "@/data/impactData";

// Mapa do Brasil simplificado — silhueta SVG aproximada com dots por cidade
// viewBox em coordenadas geográficas mapeadas para 0..400 x 0..480

const cities = impactMetrics.cityDistribution;

// Bounds aproximados do território (lat/lng)
const minLng = -74;
const maxLng = -34;
const minLat = -34;
const maxLat = 6;

const W = 400;
const H = 480;

const project = (lat: number, lng: number) => {
  const x = ((lng - minLng) / (maxLng - minLng)) * W;
  const y = ((maxLat - lat) / (maxLat - minLat)) * H;
  return { x, y };
};

// Path simplificado do contorno do Brasil
const BRAZIL_PATH =
  "M 130 70 L 175 55 L 215 65 L 250 80 L 285 95 L 305 130 L 320 175 L 335 215 L 345 260 L 340 305 L 320 345 L 290 380 L 250 410 L 210 425 L 170 415 L 140 390 L 115 355 L 95 315 L 80 270 L 75 225 L 80 180 L 95 140 L 110 100 Z";

export function BrazilMap() {
  const maxCount = Math.max(...cities.map((c) => c.count));

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto block h-auto w-full max-w-sm"
        role="img"
        aria-label="Mapa do Brasil com distribuição de empreendedoras"
      >
        <path
          d={BRAZIL_PATH}
          fill="hsl(var(--secondary))"
          stroke="hsl(var(--primary) / 0.3)"
          strokeWidth="1.5"
        />
        {cities.map((c) => {
          const { x, y } = project(c.lat, c.lng);
          const r = 6 + (c.count / maxCount) * 18;
          return (
            <g key={c.city} className="group cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r={r}
                fill="hsl(var(--accent))"
                fillOpacity="0.35"
                className="transition-all"
              />
              <circle cx={x} cy={y} r={Math.max(3, r * 0.35)} fill="hsl(var(--accent))" />
              <title>
                {c.city}: {c.count} empreendedoras
              </title>
              <text
                x={x}
                y={y - r - 4}
                textAnchor="middle"
                className="fill-foreground text-[10px] font-semibold opacity-0 transition-opacity group-hover:opacity-100"
              >
                {c.city} · {c.count}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {cities.map((c) => (
          <div key={c.city} className="flex items-center justify-between">
            <span>{c.city}</span>
            <span className="font-semibold text-foreground">{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
