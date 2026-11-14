import { M_PER_UNIT, Pt } from './data'

/** Route geometry only. Scientific values must come from verified API sources. */
export function fullRoute(stops: Pt[], start?: Pt | null) {
  return start ? [start, ...stops] : stops
}

/** Straight-line distance in the map's projected meters-per-unit scale. */
export function routeLength(points: Pt[]) {
  let length = 0
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) * M_PER_UNIT
  return length
}
