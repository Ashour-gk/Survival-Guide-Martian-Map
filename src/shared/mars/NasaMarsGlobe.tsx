import React, { useMemo } from 'react'

/** Low-resolution, real NASA Mars Trek Viking mosaic tiles arranged as an equirectangular globe texture. */
export function NasaMarsGlobe({ className = '' }: { className?: string }) {
  const tiles = useMemo(() => {
    const zoom = 2
    return Array.from({ length: 1 << (zoom + 1) }, (_, column) =>
      Array.from({ length: 1 << zoom }, (_, row) => ({
        key: `${row}-${column}`,
        row,
        column,
        src: `/api/v1/map/tiles/viking/${zoom}/${row}/${column}.jpg`,
      })),
    ).flat()
  }, [])

  return (
    <div className={`mars-globe ${className}`} role="img" aria-label="Rotating globe textured with NASA Mars Viking imagery">
      <div className="mars-globe-texture" aria-hidden="true">
        {tiles.map((tile) => (
          <img key={tile.key} src={tile.src} alt="" loading="lazy" style={{ left: `${tile.column * 12.5}%`, top: `${tile.row * 25}%` }} />
        ))}
      </div>
      <div className="mars-globe-shade" aria-hidden="true" />
      <div className="mars-globe-rim" aria-hidden="true" />
    </div>
  )
}
