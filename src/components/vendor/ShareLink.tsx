'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Copy, Check, Share2, MessageCircle, Mail } from 'lucide-react'

/**
 * Phase 1 client-link sharing. No automated delivery — every option just
 * opens something the vendor already controls:
 *  - Copy            → clipboard
 *  - Share           → native device share sheet (where supported)
 *  - WhatsApp / Email → opens the app with a prepared message
 */
export default function ShareLink({
  url,
  businessName,
  clientName,
}: {
  url: string
  businessName?: string
  clientName?: string
}) {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  // Detect the Web Share API on the client only (avoids hydration issues).
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      setCanShare(true)
    }
  }, [])

  const greeting = clientName ? `Hi ${clientName.split(' ')[0]}, ` : 'Hi, '
  const message = `${greeting}here is your secure project link${businessName ? ` from ${businessName}` : ''}: ${url}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Client link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select and copy the link manually.')
    }
  }

  async function nativeShare() {
    try {
      await (navigator as any).share({ title: businessName || 'Your project', text: message, url })
    } catch {
      /* user dismissed the share sheet — nothing to do */
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`
  const emailHref = `mailto:?subject=${encodeURIComponent(
    `Your secure project link${businessName ? ` from ${businessName}` : ''}`
  )}&body=${encodeURIComponent(message)}`

  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-forest-200 px-3 py-1.5 text-[13px] font-medium text-forest-800 hover:bg-forest-50 transition'

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={copy} className={btn}>
        {copied ? <Check size={14} /> : <Copy size={14} />}Copy link
      </button>
      {canShare && (
        <button onClick={nativeShare} className={btn}>
          <Share2 size={14} />Share
        </button>
      )}
      <a href={whatsappHref} target="_blank" rel="noreferrer" className={btn}>
        <MessageCircle size={14} />Share by WhatsApp
      </a>
      <a href={emailHref} className={btn}>
        <Mail size={14} />Share by email
      </a>
    </div>
  )
}
