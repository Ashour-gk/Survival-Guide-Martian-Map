import type { Pt } from './data'

/** Persisted route waypoint. Risk estimates are omitted until verified sources exist. */
export type Stop = Pt & { id: string; label: string; note?: string }
export const stopName = (stop: Stop) => stop.label
