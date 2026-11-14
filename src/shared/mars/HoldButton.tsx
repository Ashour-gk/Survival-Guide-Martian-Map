import React, { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// Adapted from the LongPress pattern: press and hold until the ring fills.
// Releasing early springs the ring back, so a mis-tap never starts an EVA.

const ui = { type: 'spring', stiffness: 305, damping: 33 } as const
const lively = { type: 'spring', stiffness: 622, damping: 17 } as const

const SIZE = 84
const R = 37
const C = 2 * Math.PI * R

type State = 'rest' | 'holding' | 'done'

type Props = {
  label: string
  holdingLabel: string
  doneLabel: string
  detail?: string
  disabled?: boolean
  hold?: number
  onConfirm?: () => void
}

export function HoldButton({ label, holdingLabel, doneLabel, detail, disabled, hold = 1.2, onConfirm }: Props) {
  const [state, setState] = useState<State>('rest')
  const reduce = useReducedMotion()
  const wasDone = useRef(false)

  useEffect(() => {
    wasDone.current = state === 'done'
    if (state !== 'done') return
    const t = setTimeout(() => {
      onConfirm?.()
      setState('rest')
    }, 450)
    return () => clearTimeout(t)
  }, [state, onConfirm])

  const start = () => !disabled && state === 'rest' && setState('holding')
  const cancel = () => state === 'holding' && setState('rest')

  const text = disabled ? label : state === 'holding' ? holdingLabel : state === 'done' ? doneLabel : label

  return (
    <div className={`flex items-center gap-4 ${disabled ? 'opacity-60' : ''}`}>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="pointer-events-none absolute inset-0" aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--color-space-700)" strokeWidth={4} />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={C}
            style={{ rotate: -90, transformOrigin: 'center' }}
            initial={false}
            animate={state}
            custom={wasDone.current}
            variants={{
              rest: (fromDone: boolean) => ({
                strokeDashoffset: C,
                opacity: 0,
                stroke: '#e6f3f8',
                transition: fromDone || reduce ? { duration: 0 } : ui,
              }),
              holding: {
                strokeDashoffset: 0,
                opacity: 1,
                stroke: '#e6f3f8',
                transition: { strokeDashoffset: { duration: hold, ease: 'linear' }, opacity: { duration: 0.1 } },
              },
              done: { strokeDashoffset: 0, opacity: 1, stroke: '#a9d6e5', transition: { duration: 0.2 } },
            }}
            onAnimationComplete={(def) => def === 'holding' && setState('done')}
          />
        </svg>
        <motion.button
          type="button"
          disabled={disabled}
          aria-label={label}
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
          className="absolute inset-[9px] flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-space-50 disabled:cursor-not-allowed"
          style={{ touchAction: 'none' }}
          initial={false}
          animate={state === 'holding' ? 'pressed' : state}
          variants={{
            rest: { scale: 1, backgroundColor: '#e6f3f8', color: '#012a4a' },
            pressed: { scale: 0.92, backgroundColor: '#e6f3f8', color: '#012a4a' },
            done: { scale: 1, backgroundColor: '#a9d6e5', color: '#011d33' },
          }}
          transition={{ ...lively, backgroundColor: { duration: 0.2 }, color: { duration: 0.2 } }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {/* boot-print chevron: step out */}
            <motion.path
              d="M9 6l6 6-6 6"
              variants={{ rest: { x: 0 }, pressed: { x: 1.5 }, done: { x: 4 } }}
              transition={lively}
            />
          </svg>
        </motion.button>
      </div>
      <div className="min-w-0">
        <motion.p
          key={text}
          aria-live="polite"
          initial={reduce ? false : { opacity: 0, y: 4, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={ui}
          className="text-[15px] font-semibold text-space-50"
        >
          {text}
        </motion.p>
        {detail && <p className="mt-0.5 text-[13px] leading-snug text-space-100">{detail}</p>}
      </div>
    </div>
  )
}
