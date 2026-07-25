import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Client portal shell — Phase 1 light & warm card with forest-deep header.
 * No vendor nav. Brand comes from the inviting studio, never hardcoded.
 */
export function ClientPortalLayout({
  children,
  className,
  centered,
  brandName,
  brandLetter,
  forLine,
  title,
  stepLabel,
  progressPct = 0,
}: {
  children: ReactNode
  className?: string
  /** Full-viewport centered state (loading / invalid). */
  centered?: boolean
  brandName?: string
  brandLetter?: string
  forLine?: string
  title?: string
  stepLabel?: string
  /** 0–100 lime progress fill in the forest header. */
  progressPct?: number
}) {
  if (centered) {
    return (
      <div
        className={cn('flex min-h-screen items-center justify-center px-4 sm:px-6', className)}
        style={{ background: 'var(--canvas-2)' }}
      >
        {children}
      </div>
    )
  }

  const letter = (brandLetter || brandName || '?').charAt(0).toUpperCase()

  return (
    <div
      className={cn('min-h-screen px-3 py-5 sm:px-5 sm:py-8 md:py-10', className)}
      style={{ background: 'var(--canvas)' }}
    >
      <div
        className="portal-shell mx-auto overflow-hidden"
        style={{
          maxWidth: 920,
          background: 'var(--canvas-2)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          boxShadow: 'var(--sh-lg)',
        }}
      >
        <header
          style={{
            background: 'var(--forest-deep)',
            color: '#fff',
            padding: '26px 22px 28px',
          }}
          className="sm:!px-10 sm:!pt-[30px] sm:!pb-[34px]"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 22,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'rgba(255,255,255,.15)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {letter}
            </span>
            <b style={{ fontSize: 14.5 }}>{brandName}</b>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                color: 'rgba(255,255,255,.6)',
                textAlign: 'right',
              }}
            >
              Private secure link · no account needed
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              {forLine ? (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)' }}>{forLine}</div>
              ) : null}
              {title ? (
                <h1
                  className="serif"
                  style={{
                    fontSize: 'clamp(26px, 4vw, 38px)',
                    lineHeight: 1.05,
                    margin: forLine ? '4px 0 0' : 0,
                    fontWeight: 400,
                  }}
                >
                  {title}
                </h1>
              ) : null}
            </div>
            {stepLabel ? (
              <div style={{ textAlign: 'right', minWidth: 140 }}>
                <div className="num" style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
                  {stepLabel}
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(progressPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={stepLabel}
                  style={{
                    width: 200,
                    maxWidth: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: 'rgba(255,255,255,.18)',
                    overflow: 'hidden',
                    marginTop: 7,
                    marginLeft: 'auto',
                  }}
                >
                  <i
                    style={{
                      display: 'block',
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, progressPct))}%`,
                      background: 'var(--lime)',
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <div className="portal-body" style={{ padding: '22px 18px 32px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function ClientPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(className)}
      style={{
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--line)',
        background: 'var(--panel)',
        padding: 16,
      }}
    >
      {children}
    </div>
  )
}
