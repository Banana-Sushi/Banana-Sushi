import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { Order } from '@/types';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function getLogoAttachment() {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    return {
      filename: 'logo.png',
      content: fs.readFileSync(logoPath),
      cid: 'logo@sushibanana',
    };
  } catch {
    return null;
  }
}

// ─── Order Confirmation ───────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(order: Order, customerEmail: string) {
  const logo = getLogoAttachment();

  const itemsHtml = order.items
    .map(item => `<tr>
      <td style="padding:8px 0;font-weight:bold;">${item.quantity}x ${item.name}</td>
      <td style="padding:8px 0;text-align:right;font-weight:bold;">${(item.price * item.quantity).toFixed(2)}€</td>
    </tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f9f9f9;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#ffffff;padding:32px 40px;text-align:center;border-bottom:3px solid #fbbf24;">
      <img src="cid:logo@sushibanana" alt="Sushi Banana" style="height:52px;width:auto;display:block;margin:0 auto;" />
    </div>
    <div style="padding:40px;">
      <h2 style="font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;margin-bottom:8px;">
        Your order is confirmed!
      </h2>
      <p style="color:#9ca3af;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:32px;">
        Order ${order.orderNumber}
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${itemsHtml}
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:8px 0;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Delivery</td>
          <td style="padding:8px 0;text-align:right;font-weight:bold;">${order.deliveryFee.toFixed(2)}€</td>
        </tr>
        ${order.couponCode ? `
        <tr>
          <td style="padding:8px 0;color:#16a34a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Coupon</td>
          <td style="padding:8px 0;text-align:right;font-weight:bold;color:#16a34a;">-${(order.couponDiscount ?? 0).toFixed(2)}€</td>
        </tr>` : ''}
        <tr>
          <td style="padding:12px 0;font-size:18px;font-weight:900;text-transform:uppercase;">Total</td>
          <td style="padding:12px 0;text-align:right;font-size:18px;font-weight:900;">${order.total.toFixed(2)}€</td>
        </tr>
      </table>
      ${!order.paymentMethod.startsWith('pickup') ? `
      <div style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;">Delivery to</p>
        <p style="margin:0;font-weight:700;font-size:14px;">${order.address}, ${order.zipCode} ${order.city}</p>
      </div>` : ''}
      <p style="color:#6b7280;font-size:13px;line-height:1.6;">
        ${order.paymentMethod.startsWith('pickup')
          ? 'We are currently preparing your order. It will be ready for pickup at our restaurant shortly.'
          : 'We are currently preparing your order. You will receive your delivery within the usual timeframe.'}
      </p>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
      <p style="color:#d1d5db;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;margin:0;">
        Unter den Eichen 84a, 12205 Berlin
      </p>
    </div>
  </div>
  <p style="text-align:center;color:#d1d5db;font-size:11px;margin-top:16px;">
    If you did not receive this email in your inbox, please check your spam folder.
  </p>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Sushi Banana" <${process.env.GMAIL_USER}>`,
    to: customerEmail,
    subject: `Order confirmed — ${order.orderNumber} · Sushi Banana`,
    html,
    attachments: logo ? [logo] : [],
  });
}

// ─── Email Verification ───────────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, firstName: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sushibanana.de';
  const verifyUrl = `${baseUrl}/account/verify?token=${token}`;
  const logo = getLogoAttachment();

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f9f9f9;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#ffffff;padding:32px 40px;text-align:center;border-bottom:3px solid #fbbf24;">
      <img src="cid:logo@sushibanana" alt="Sushi Banana" style="height:52px;width:auto;display:block;margin:0 auto;" />
    </div>
    <div style="padding:40px;">
      <h2 style="font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;margin-bottom:8px;">
        Hallo, ${firstName}!
      </h2>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin-bottom:32px;">
        Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#000000;color:#ffffff;padding:16px 32px;border-radius:100px;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:0.2em;text-decoration:none;">
        E-Mail bestätigen
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px;line-height:1.6;">
        Falls du kein Konto bei Sushi Banana erstellt hast, kannst du diese E-Mail ignorieren.
      </p>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
      <p style="color:#d1d5db;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;margin:0;">
        Unter den Eichen 84a, 12205 Berlin
      </p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Sushi Banana" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Bitte bestätige deine E-Mail · Sushi Banana',
    html,
    attachments: logo ? [logo] : [],
  });
}

// ─── Discount Notification ────────────────────────────────────────────────────

type DiscountRecipient = { email: string; first_name: string };

type DiscountInfo = {
  section: string;
  discountType: string;
  discountValue: number | null;
  categoryName: string | null;
  minOrderTotal: number | null;
  endDate: string | null;
};

export async function sendDiscountEmail(recipients: DiscountRecipient[], discount: DiscountInfo) {
  if (recipients.length === 0) return;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sushibanana.de';
  const logo = getLogoAttachment();

  let discountHero = '';
  let discountLabel = '';
  if (discount.discountType === 'percentage' && discount.discountValue) {
    discountHero = `-${discount.discountValue}%`;
    discountLabel = `${discount.discountValue}% Rabatt`;
  } else if (discount.discountType === 'fixed' && discount.discountValue) {
    discountHero = `-${discount.discountValue}€`;
    discountLabel = `${discount.discountValue}€ Rabatt`;
  } else if (discount.discountType === 'two_for_one') {
    discountHero = '2&thinsp;für&thinsp;1';
    discountLabel = '2 für 1';
  }

  let scopeLabel = '';
  if (discount.section === 'global') scopeLabel = 'auf alle Bestellungen';
  else if (discount.section === 'category' && discount.categoryName) scopeLabel = `auf alle ${discount.categoryName}`;
  else if (discount.section === 'command' && discount.minOrderTotal) scopeLabel = `ab ${discount.minOrderTotal}€ Bestellwert`;
  else scopeLabel = 'auf ausgewählte Produkte';

  const urgencyBadge = discount.endDate
    ? `<p style="margin:12px 0 0;display:inline-block;background:rgba(0,0,0,0.25);border-radius:20px;padding:6px 16px;font-size:11px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#fff;">
        &#x23F3; Endet am ${new Date(discount.endDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}
       </p>`
    : '';

  for (const recipient of recipients) {
    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Neues Angebot – Sushi Banana</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">

        <!-- ── Logo header ── -->
        <tr>
          <td style="background:#000000;padding:28px 40px;text-align:center;">
            <img src="cid:logo@sushibanana" alt="Sushi Banana" height="44" style="display:block;margin:0 auto;height:44px;width:auto;" />
          </td>
        </tr>

        <!-- ── Hero discount block ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#000000 0%,#1a1a1a 100%);padding:48px 40px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:#fbbf24;">
              &#x2605; Exklusives Angebot &#x2605;
            </p>
            <p style="margin:0;font-size:76px;font-weight:900;color:#fbbf24;line-height:1;letter-spacing:-3px;">
              ${discountHero}
            </p>
            <p style="margin:10px 0 0;font-size:17px;font-weight:700;color:#d1d5db;letter-spacing:0.5px;">
              ${scopeLabel}
            </p>
            ${urgencyBadge}
          </td>
        </tr>

        <!-- ── Emoji food strip ── -->
        <tr>
          <td style="background:#fbbf24;padding:14px 40px;text-align:center;font-size:22px;letter-spacing:6px;">
            &#x1F363;&#x1F364;&#x1F371;&#x1F35C;&#x1F960;&#x1F366;
          </td>
        </tr>

        <!-- ── Body ── -->
        <tr>
          <td style="padding:40px 40px 32px;">

            <!-- Greeting -->
            <h2 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#000;text-transform:uppercase;letter-spacing:-0.5px;">
              Hey ${recipient.first_name}! &#x1F44B;
            </h2>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;font-weight:500;">
              Wir haben ein frisches Angebot nur für dich! Greif zu, solange es gilt –
              dein Rabatt wird beim Bestellen <strong style="color:#000;">automatisch</strong> angewendet.
            </p>

            <!-- Benefits checklist -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:13px;font-weight:700;color:#374151;">
                        <span style="color:#fbbf24;font-size:16px;margin-right:10px;">&#10003;</span>
                        Kein Gutscheincode nötig
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;font-weight:700;color:#374151;">
                        <span style="color:#fbbf24;font-size:16px;margin-right:10px;">&#10003;</span>
                        Wird automatisch beim Checkout abgezogen
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;font-weight:700;color:#374151;">
                        <span style="color:#fbbf24;font-size:16px;margin-right:10px;">&#10003;</span>
                        Frische Zutaten, täglich geliefert
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${baseUrl}/order"
                     style="display:inline-block;background:#000000;color:#ffffff;padding:20px 56px;border-radius:100px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:3px;text-decoration:none;">
                    Jetzt bestellen &#x2192;
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="border-top:1px solid #f3f4f6;background:#fafafa;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
              Sushi Banana · Unter den Eichen 84a, 12205 Berlin
            </p>
            <p style="margin:0;font-size:11px;color:#d1d5db;line-height:1.6;">
              Du erhältst diese E-Mail, weil du Rabatt-Benachrichtigungen aktiviert hast.<br>
              <a href="${baseUrl}/account" style="color:#9ca3af;text-decoration:underline;">Benachrichtigungen deaktivieren</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: `"Sushi Banana" <${process.env.GMAIL_USER}>`,
        to: recipient.email,
        subject: `${discountLabel} ${scopeLabel} – Nur für dich! 🎉`,
        html,
        attachments: logo ? [logo] : [],
      });
    } catch (err) {
      console.error(`Discount email failed for ${recipient.email}:`, err);
    }
  }
}
