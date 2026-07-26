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
  showProgress = true,
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
  /** Hide the progress bar (e.g. completed booking) while keeping stepLabel. */
  showProgress?: boolean
}) {
  if (centered) {
    return (
      <div
        className={cn('portal-app flex items-center justify-center', className)}
        style={{ background: 'var(--canvas-2)' }}
      >
        {children}
      </div>
    )
  }

  const letter = (brandLetter || brandName || '?').charAt(0).toUpperCase()

  return (
    <div className={cn('portal-app', className)}>
      <div
        className="portal-shell max-w-full"
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
            padding: '16px 14px 18px',
          }}
          className="sm:!px-10 sm:!pt-[30px] sm:!pb-[34px]"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
              minWidth: 0,
              flexWrap: 'wrap',
            }}
            className="sm:!mb-[22px]"
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
                flexShrink: 0,
              }}
            >
              {letter}
            </span>
            <b style={{ fontSize: 14.5, minWidth: 0, overflowWrap: 'anywhere' }}>{brandName}</b>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 11.5,
                color: 'rgba(255,255,255,.6)',
                textAlign: 'right',
                maxWidth: '100%',
              }}
              className="basis-full sm:basis-auto sm:!text-[12px]"
            >
              Private secure link · no account needed
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              minWidth: 0,
            }}
          >
            <div style={{ minWidth: 0, flex: '1 1 160px' }}>
              {forLine ? (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', overflowWrap: 'anywhere' }}>{forLine}</div>
              ) : null}
              {title ? (
                <h1
                  className="serif"
                  style={{
                    fontSize: 'clamp(24px, 7vw, 38px)',
                    lineHeight: 1.05,
                    margin: forLine ? '4px 0 0' : 0,
                    fontWeight: 400,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {title}
                </h1>
              ) : null}
            </div>
            {stepLabel ? (
              <div style={{ textAlign: 'left', minWidth: 0, flex: '1 1 120px' }} className="sm:!text-right">
                <div className="num" style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
                  {stepLabel}
                </div>
                {showProgress ? (
                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(progressPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={stepLabel}
                    style={{
                      width: '100%',
                      maxWidth: 200,
                      height: 6,
                      borderRadius: 3,
                      background: 'rgba(255,255,255,.18)',
                      overflow: 'hidden',
                      marginTop: 7,
                    }}
                    className="sm:!ml-auto"
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
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <div className="portal-body" style={{ padding: '14px 12px 22px' }}>
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
