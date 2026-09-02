import type { OrderWithItems } from "./db";
import { formatSgd } from "./pricing";

export type MailResult =
  | { ok: true; provider: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string; provider?: string };

function runtimeEnv(name: string) {
  try {
    const v = (process.env as Record<string, string | undefined>)[name];
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

export function siteBaseUrl() {
  const explicit = runtimeEnv("NEXT_PUBLIC_SITE_URL") || runtimeEnv("SITE_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = runtimeEnv("VERCEL_URL");
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

export function mailFromAddress() {
  return (
    runtimeEnv("MAIL_FROM") ||
    runtimeEnv("RESEND_FROM") ||
    runtimeEnv("SMTP_FROM") ||
    "Aunty Hong Demo <onboarding@resend.dev>"
  );
}

export function mailConfigured() {
  return Boolean(runtimeEnv("RESEND_API_KEY") || runtimeEnv("SMTP_HOST"));
}

function invoiceQuery(order: OrderWithItems) {
  if (order.customer_email) return `?email=${encodeURIComponent(order.customer_email)}`;
  if (order.customer_phone) return `?phone=${encodeURIComponent(order.customer_phone)}`;
  return "";
}

function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function invoiceNoFor(order: OrderWithItems) {
  return order.invoice_no || `INV-${order.order_no}`;
}

export function buildOrderConfirmationEmail(order: OrderWithItems) {
  const base = siteBaseUrl();
  const invNo = invoiceNoFor(order);
  const invoiceUrl = `${base}/invoice/${encodeURIComponent(order.order_no)}${invoiceQuery(order)}`;
  const fulfilment =
    order.delivery_kind === "collect"
      ? `Collect at Aljunied kitchen${order.requested_date ? ` · ${order.requested_date}` : ""}`
      : `Delivery${order.address ? `: ${order.address}` : ""}${
          order.requested_date ? ` · ${order.requested_date}` : ""
        }${order.express_slot ? " · Express slot" : ""}`;
  const payRef = order.paynow_ref || order.stripe_payment_intent_id || order.order_no;
  const payMethod = order.payment_method || "pending";

  const lines = (order.items || [])
    .map(
      (it) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #e8dcc8;">${escapeHtml(it.product_title)}<br/><span style="color:#7a6555;font-size:12px;">${escapeHtml(it.variant_label)}</span></td>
          <td style="padding:8px 0;border-bottom:1px solid #e8dcc8;text-align:center;">${it.qty}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e8dcc8;text-align:right;">${escapeHtml(formatSgd(Number(it.unit_price) * Number(it.qty)))}</td>
        </tr>`
    )
    .join("");

  const discountRow =
    order.discount && Number(order.discount) > 0
      ? `<tr><td colspan="2" style="padding:4px 0;">Discount${
          order.voucher_code ? ` (${escapeHtml(order.voucher_code)})` : ""
        }</td><td style="text-align:right;">−${escapeHtml(formatSgd(Number(order.discount)))}</td></tr>`
      : "";

  const subject = `Order confirmation ${order.order_no} — Aunty Hong`;
  const html = `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;color:#2A1B14;background:#FBF6EE;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8dcc8;padding:28px;">
    <p style="letter-spacing:0.12em;text-transform:uppercase;color:#b8963e;font-size:12px;margin:0;">Aunty Hong</p>
    <h1 style="font-size:28px;margin:8px 0 4px;">Order confirmed</h1>
    <p style="margin:0 0 16px;color:#7a6555;">Thank you, ${escapeHtml(order.customer_name)}. Your kitchen order is recorded.</p>
    <p style="margin:0 0 4px;"><strong>Order</strong> ${escapeHtml(order.order_no)}</p>
    <p style="margin:0 0 4px;"><strong>Invoice</strong> ${escapeHtml(invNo)}</p>
    <p style="margin:0 0 4px;"><strong>Payment ref</strong> ${escapeHtml(String(payRef))} (${escapeHtml(payMethod)})</p>
    <p style="margin:0 0 20px;"><strong>Fulfilment</strong> ${escapeHtml(fulfilment)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="text-align:left;color:#7a6555;">
          <th style="padding-bottom:8px;">Item</th>
          <th style="padding-bottom:8px;text-align:center;">Qty</th>
          <th style="padding-bottom:8px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${lines}</tbody>
    </table>
    <table style="width:100%;margin-top:16px;font-size:14px;">
      <tr><td>Subtotal</td><td style="text-align:right;">${escapeHtml(formatSgd(Number(order.subtotal)))}</td></tr>
      ${discountRow}
      <tr><td>Delivery</td><td style="text-align:right;">${escapeHtml(formatSgd(Number(order.delivery_fee)))}</td></tr>
      <tr><td style="padding-top:8px;font-weight:bold;">Total (SGD)</td><td style="padding-top:8px;text-align:right;font-weight:bold;">${escapeHtml(formatSgd(Number(order.total)))}</td></tr>
    </table>
    <p style="margin:24px 0 8px;">
      <a href="${escapeHtml(invoiceUrl)}" style="display:inline-block;background:#2A1B14;color:#FBF6EE;padding:10px 16px;text-decoration:none;">View invoice</a>
    </p>
    <p style="font-size:12px;color:#7a6555;margin-top:20px;">
      Demo storefront — not the live auntyhong.sg shop. Kitchen: 1005 Aljunied Ave 5 #01-42, Singapore 389886 · +65 9638 1788.
    </p>
  </div>
</body></html>`;

  const text = [
    `Order confirmed — ${order.order_no}`,
    `Hi ${order.customer_name},`,
    ``,
    `Invoice: ${invNo}`,
    `Payment ref: ${payRef} (${payMethod})`,
    `Fulfilment: ${fulfilment}`,
    ``,
    ...(order.items || []).map(
      (it) =>
        `- ${it.qty}× ${it.product_title} (${it.variant_label}) ${formatSgd(Number(it.unit_price) * Number(it.qty))}`
    ),
    ``,
    `Subtotal: ${formatSgd(Number(order.subtotal))}`,
    order.discount
      ? `Discount${order.voucher_code ? ` (${order.voucher_code})` : ""}: −${formatSgd(Number(order.discount))}`
      : "",
    `Delivery: ${formatSgd(Number(order.delivery_fee))}`,
    `Total: ${formatSgd(Number(order.total))}`,
    ``,
    `Invoice: ${invoiceUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text, invoiceUrl };
}

async function sendViaResend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailResult> {
  const key = runtimeEnv("RESEND_API_KEY");
  if (!key) return { ok: false, error: "RESEND_API_KEY missing" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[mail] Resend failed", res.status, body.slice(0, 200));
    return { ok: false, error: `Resend HTTP ${res.status}`, provider: "resend" };
  }
  return { ok: true, provider: "resend" };
}

async function sendViaSmtp(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailResult> {
  const host = runtimeEnv("SMTP_HOST");
  if (!host) return { ok: false, error: "SMTP_HOST missing" };
  const port = Number(runtimeEnv("SMTP_PORT") || 587);
  const user = runtimeEnv("SMTP_USER");
  const pass = runtimeEnv("SMTP_PASS");
  try {
    // Optional dependency — only required when SMTP_HOST is set.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require("nodemailer") as {
      createTransport: (opts: Record<string, unknown>) => {
        sendMail: (opts: Record<string, unknown>) => Promise<unknown>;
      };
    };
    const transporter = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
    await transporter.sendMail({
      from: mailFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true, provider: "smtp" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SMTP send failed";
    if (/Cannot find module ['"]nodemailer['"]/.test(msg)) {
      return {
        ok: false,
        error: "SMTP_HOST set but nodemailer is not installed",
        provider: "smtp",
      };
    }
    console.error("[mail] SMTP failed:", msg);
    return { ok: false, error: msg, provider: "smtp" };
  }
}

/** Send order confirmation + invoice summary. Never throws. */
export async function sendOrderConfirmation(order: OrderWithItems): Promise<MailResult> {
  const to = String(order.customer_email || "").trim();
  if (!to) {
    console.info("[mail] skip confirmation — no customer_email on", order.order_no);
    return { ok: false, skipped: true, reason: "no_email" };
  }
  const content = buildOrderConfirmationEmail(order);
  try {
    if (runtimeEnv("RESEND_API_KEY")) {
      return await sendViaResend({ to, ...content });
    }
    if (runtimeEnv("SMTP_HOST")) {
      return await sendViaSmtp({ to, ...content });
    }
    console.warn(
      "[mail] Confirmation email could not be sent — set RESEND_API_KEY or SMTP_HOST. Order",
      order.order_no
    );
    return { ok: false, error: "Mail not configured (RESEND_API_KEY or SMTP_HOST)" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mail failed";
    console.error("[mail] unexpected failure:", msg);
    return { ok: false, error: msg };
  }
}
