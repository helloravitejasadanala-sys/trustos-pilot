import { Resend } from 'resend'
import { PRODUCT_NAME } from '@/lib/brand'

/**
 * Resend is ready only when both the API key and a From address on a
 * verified domain are set. Without those, forgot-password stays manual.
 */
export function isResendMailReady(): boolean {
  const key = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!key || !from) return false
  if (!key.startsWith('re_')) return false
  if (!from.includes('@')) return false
  return true
}

export type SendResetEmailResult = { ok: true } | { ok: false; error: string }

/** Send a one-time password reset link. Caller must only invoke when mail is ready. */
export async function sendResetEmail(opts: {
  to: string
  resetUrl: string
  expiresAt: Date
}): Promise<SendResetEmailResult> {
  if (!isResendMailReady()) {
    return { ok: false, error: 'Resend is not configured' }
  }

  const from = process.env.RESEND_FROM_EMAIL!.trim()
  const resend = new Resend(process.env.RESEND_API_KEY!.trim())
  const hours = Math.max(1, Math.round((opts.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)))

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: `Reset your ${PRODUCT_NAME} password`,
    text: [
      `Reset your ${PRODUCT_NAME} password using this one-time link:`,
      '',
      opts.resetUrl,
      '',
      `This link expires in about ${hours} hour${hours === 1 ? '' : 's'}. If you did not ask for a reset, you can ignore this email.`,
    ].join('\n'),
    html: `
      <p>Reset your <strong>${PRODUCT_NAME}</strong> password using this one-time link:</p>
      <p><a href="${opts.resetUrl}">${opts.resetUrl}</a></p>
      <p style="color:#666;font-size:13px">This link expires in about ${hours} hour${hours === 1 ? '' : 's'}. If you did not ask for a reset, you can ignore this email.</p>
    `.trim(),
  })

  if (error) {
    return { ok: false, error: error.message || 'Resend send failed' }
  }
  return { ok: true }
}
