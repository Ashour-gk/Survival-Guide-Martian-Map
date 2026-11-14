import React from 'react'

type Point = { distM: number; elev: number; bad: boolean; stop?: number }

export function ElevationProfile({ profile, totalM }: { profile: Point[]; totalM: number }) {
  const W = 1000
  const H = 100
  const min = Math.min(...profile.map((p) => p.elev)) - 4
  const max = Math.max(...profile.map((p) => p.elev)) + 4
  const px = (d: number) => (d / totalM) * W
  const py = (e: number) => H - ((e - min) / (max - min)) * H
  const line = profile.map((p, i) => `${i ? 'L' : 'M'}${px(p.distM).toFixed(1)} ${py(p.elev).toFixed(1)}`).join('')
  const area = `${line}L${W} ${H}L0 ${H}Z`
  const stops = profile.filter((p) => p.stop !== undefined)

  return (
    <div className="border-t border-space-800 px-4 pt-3 pb-3 sm:px-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[13px] font-semibold whitespace-nowrap">Elevation along route</h3>
        <p className="font-mono text-[12px] tabular text-space-200 whitespace-nowrap">
          {Math.round(min + 4).toLocaleString()} to {Math.round(max - 4).toLocaleString()} m
        </p>
      </div>
      <div className="relative mt-2 h-[88px]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d={area} fill="var(--color-space-800)" />
          <path d={line} fill="none" stroke="var(--color-space-100)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          {profile.map((p, i) =>
            p.bad && i > 0 ? (
              <rect
                key={i}
                x={px(profile[i - 1].distM)}
                width={Math.max(1, px(p.distM) - px(profile[i - 1].distM))}
                y={0}
                height={H}
                fill="var(--color-hazard)"
                opacity={0.35}
              />
            ) : null
          )}
        </svg>
        {stops.map((p) => (
          <div key={p.stop} className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: `${(p.distM / totalM) * 100}%` }}>
            <span className="-translate-x-1/2 rounded bg-space-50 px-1 font-mono text-[11px] leading-4 font-semibold text-space-950">
              {(p.stop ?? 0) + 1}
            </span>
            <span className="w-px flex-1 -translate-x-1/2 bg-space-50/50" />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[11px] tabular text-space-200">
        <span>Rover</span>
        <span>{(totalM / 1000).toFixed(2)} km · back at rover</span>
      </div>
    </div>
  )
}
