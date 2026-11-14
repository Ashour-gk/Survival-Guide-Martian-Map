import React from 'react'

type Props = { className?: string; alt?: string }

export function MarsLogo({ className = '', alt = 'RedTrace logo' }: Props) {
  return (
    <span className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${className}`}>
      <img
        src="/assets/redtrace-logo.jpeg"
        alt={alt}
        className="h-full w-full object-cover [clip-path:circle(40%_at_50%_50%)]"
        draggable={false}
      />
    </span>
  )
}
