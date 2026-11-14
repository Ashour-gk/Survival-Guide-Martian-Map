import React, { useEffect, useState } from 'react'
import { readBrowserPhoto } from './api'

export function BrowserPhoto({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [resolved, setResolved] = useState(src.startsWith('browser-photo:') ? '' : src)
  useEffect(() => {
    if (!src.startsWith('browser-photo:')) { setResolved(src); return }
    let objectUrl = ''
    let active = true
    void readBrowserPhoto(src.slice('browser-photo:'.length)).then((blob) => {
      if (active && blob) { objectUrl = URL.createObjectURL(blob); setResolved(objectUrl) }
    })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src])
  if (!resolved) return <div className={className} aria-label={alt} />
  return <img src={resolved} alt={alt} className={className} />
}
