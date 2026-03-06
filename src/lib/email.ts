import { Resend } from 'resend'
import type { Order, Profile } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? 'Peel & Post Studio <orders@peel-and-post.vercel.app>'
const STUDIO_EMAIL = process.env.STUDIO_EMAIL ?? 'contactnickparis@gmail.com'
const PORTAL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://peel-and-post.vercel.app'

// ─────────────────────────────────────────────
// Shared HTML layout
// ─────────────────────────────────────────────
function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Peel &amp; Post Studio</title>
</head>
<body style="margin:0;padding:0;background:#F7F3EE;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:12px;border:1px solid #EDE7DC;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#4A3728;padding:28px 40px;">
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#F7F3EE;letter-spacing:0.02em;">
              Peel &amp; Post Studio
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#A8896E;">Custom Sticker Printing</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 24px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#FAF7F4;padding:20px 40px;border-top:1px solid #EDE7DC;text-align:center;">
            <p style="margin:0;font-size:12px;color:#A8896E;">
              Questions? Reply to your order thread in the
              <a href="${PORTAL_URL}/orders" style="color:#C4714A;text-decoration:none;">client portal</a>.
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#C4A08A;">peel-and-post.vercel.app</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function label(text: string) {
  return `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#A8896E;">${text}</p>`
}

function value(text: string) {
  return `<p style="margin:0 0 16px;font-size:14px;color:#4A3728;">${text}</p>`
}

function ctaButton(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#C4714A;color:#FFFFFF;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;border-radius:6px;">${text}</a>`
}

function orderMeta(order: Order) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F4;border:1px solid #EDE7DC;border-radius:8px;padding:0;margin:20px 0;">
      <tr>
        <td style="padding:14px 20px;border-bottom:1px solid #EDE7DC;">
          ${label('Order')} ${value(`#${String(order.order_number).padStart(4, '0')} &nbsp;·&nbsp; ${order.product}`)}
        </td>
      </tr>
      <tr>
        <td style="padding:14px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%">${label('Size')} <p style="margin:0;font-size:13px;color:#4A3728;">${order.size}</p></td>
              <td width="33%">${label('Qty')} <p style="margin:0;font-size:13px;color:#4A3728;">${order.quantity}</p></td>
              <td width="33%">${label('Finish')} <p style="margin:0;font-size:13px;color:#4A3728;">${order.finish}</p></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

// ─────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────

export type EmailEvent =
  | 'order_placed'
  | 'proof_sent'
  | 'proof_approved'
  | 'revision_requested'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'

interface EmailPayload {
  order: Order
  customer: Pick<Profile, 'full_name' | 'email'>
  trackingNumber?: string
}

function buildEmail(event: EmailEvent, payload: EmailPayload): {
  to: string
  subject: string
  html: string
} | null {
  const { order, customer, trackingNumber } = payload
  const firstName = customer.full_name?.split(' ')[0] ?? 'there'
  const invoiceUrl = `${PORTAL_URL}/orders/${order.id}/invoice`
  const ordersUrl = `${PORTAL_URL}/orders`

  switch (event) {
    case 'order_placed':
      return {
        to: customer.email,
        subject: `Order confirmed — #${String(order.order_number).padStart(4, '0')}`,
        html: layout(`
          <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#4A3728;">
            Thanks, ${firstName}!
          </h2>
          <p style="margin:0 0 4px;font-size:15px;color:#4A3728;">Your order has been received and we&#8217;re reviewing your artwork.</p>
          <p style="margin:0 0 20px;font-size:13px;color:#A8896E;">We&#8217;ll send you a proof to approve before we go to print.</p>
          ${orderMeta(order)}
          ${ctaButton('View Order', ordersUrl)}
        `),
      }

    case 'proof_sent':
      return {
        to: customer.email,
        subject: `Your proof is ready — #${String(order.order_number).padStart(4, '0')}`,
        html: layout(`
          <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#4A3728;">
            Your proof is ready to review
          </h2>
          <p style="margin:0 0 20px;font-size:14px;color:#4A3728;">
            Hi ${firstName}, your proof for Order #${String(order.order_number).padStart(4, '0')} is waiting for your approval.
            Take a look and let us know if it looks good — or request a revision.
          </p>
          ${orderMeta(order)}
          ${ctaButton('Review Proof', ordersUrl)}
        `),
      }

    case 'proof_approved':
      return {
        to: STUDIO_EMAIL,
        subject: `✓ Proof approved — Order #${String(order.order_number).padStart(4, '0')}`,
        html: layout(`
          <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#4A3728;">
            Proof approved
          </h2>
          <p style="margin:0 0 20px;font-size:14px;color:#4A3728;">
            ${customer.full_name ?? customer.email} approved the proof for Order #${String(order.order_number).padStart(4, '0')}.
            Payment is due before production begins.
          </p>
          ${orderMeta(order)}
        `),
      }

    case 'revision_requested':
      return {
        to: STUDIO_EMAIL,
        subject: `↩ Revision requested — Order #${String(order.order_number).padStart(4, '0')}`,
        html: layout(`
          <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#4A3728;">
            Revision requested
          </h2>
          <p style="margin:0 0 20px;font-size:14px;color:#4A3728;">
            ${customer.full_name ?? customer.email} has requested a revision on Order #${String(order.order_number).padStart(4, '0')}.
            Check the portal for their notes.
          </p>
          ${orderMeta(order)}
        `),
      }

    case 'paid':
      return {
        to: customer.email,
        subject: `Payment confirmed — #${String(order.order_number).padStart(4, '0')}`,
        html: layout(`
          <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#4A3728;">
            Payment received &#10003;
          </h2>
          <p style="margin:0 0 20px;font-size:14px;color:#4A3728;">
            Hi ${firstName}, your payment has been confirmed and your stickers are headed to production.
            We&#8217;ll let you know when they&#8217;re on the way.
          </p>
          ${orderMeta(order)}
          ${ctaButton('View Invoice', invoiceUrl)}
        `),
      }

    case 'in_production':
      return {
        to: customer.email,
        subject: `In production — #${String(order.order_number).padStart(4, '0')}`,
        html: layout(`
          <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#4A3728;">
            Your stickers are in production
          </h2>
          <p style="margin:0 0 20px;font-size:14px;color:#4A3728;">
            Hi ${firstName}, your order is now on the press. We&#8217;ll notify you as soon as it ships.
          </p>
          ${orderMeta(order)}
          ${ctaButton('Track Order', ordersUrl)}
        `),
      }

    case 'shipped':
      return {
        to: customer.email,
        subject: `Your order is on its way — #${String(order.order_number).padStart(4, '0')}`,
        html: layout(`
          <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#4A3728;">
            Your stickers are on their way &#127873;
          </h2>
          <p style="margin:0 0 20px;font-size:14px;color:#4A3728;">
            Hi ${firstName}, your order has shipped!
            ${trackingNumber
              ? `Your tracking number is <strong style="color:#4A3728;">${trackingNumber}</strong>.`
              : ''}
          </p>
          ${orderMeta(order)}
          ${ctaButton('View Order', ordersUrl)}
        `),
      }

    case 'delivered':
      return {
        to: customer.email,
        subject: `Delivered — #${String(order.order_number).padStart(4, '0')}`,
        html: layout(`
          <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#4A3728;">
            Your order has been delivered
          </h2>
          <p style="margin:0 0 4px;font-size:14px;color:#4A3728;">
            Hi ${firstName}, your stickers have arrived. Hope they&#8217;re everything you imagined!
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#A8896E;">
            If anything isn&#8217;t right, just message us in the portal.
          </p>
          ${orderMeta(order)}
          ${ctaButton('View Invoice', invoiceUrl)}
        `),
      }

    default:
      return null
  }
}

// ─────────────────────────────────────────────
// Main send function — silently swallows errors
// so email failures never break API responses
// ─────────────────────────────────────────────
export async function sendStatusEmail(
  event: EmailEvent,
  order: Order,
  customer: Pick<Profile, 'full_name' | 'email'>,
  options?: { trackingNumber?: string }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const payload = buildEmail(event, { order, customer, trackingNumber: options?.trackingNumber })
  if (!payload) return

  try {
    await resend.emails.send({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    })
  } catch (err) {
    console.error(`[email] Failed to send ${event} for order ${order.id}:`, err)
  }
}
