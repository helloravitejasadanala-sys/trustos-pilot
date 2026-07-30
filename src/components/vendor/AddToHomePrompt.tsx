'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'trustos_a2hs_dismissed'

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return true
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const ios = 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone
  return mq || !!ios
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

function installHint() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios) return 'Share → Add to Home Screen'
  return 'Browser menu → Add to Home screen'
}

/**
 * One-line, dismissible nudge for first mobile visit — only when not already installed.
 */
export default function AddToHomePrompt() {
  const [visible, setVisible] = useState(false)
  const [hint, setHint] = useState('')

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return
      if (!isMobileViewport()) return
      if (isStandaloneDisplay()) return
      setHint(installHint())
      setVisible(true)
    } catch {
      /* private mode / blocked storage — skip quietly */
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="vendor-a2hs" role="status">
      <p className="vendor-a2hs__text">
        Add TrustOS to your Home Screen for the full app. <span className="vendor-a2hs__hint">{hint}</span>
      </p>
      <button type="button" className="vendor-a2hs__dismiss" onClick={dismiss} aria-label="Dismiss">
        Got it
      </button>
    </div>
  )
}
