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

export async function sendOrderConfirmationEmail(order: Order, customerEmail: string) {
  const logoPaths = [
    path.join(process.cwd(), 'public', 'logo.png'),
    path.join(process.cwd(), 'logo.png'),
  ];
  const resolvedLogoPath = logoPaths.find(p => fs.existsSync(p)) ?? null;

  const itemsHtml = order.items
    .map(item => `<tr>
      <td style="padding:8px 0;font-weight:bold;">${item.quantity}x ${item.name}</td>
      <td style="padding:8px 0;text-align:right;font-weight:bold;">${(item.price * item.quantity).toFixed(2)}€</td>
    </tr>`)
    .join('');

  const logoHtml = resolvedLogoPath
    ? `<img src="cid:logo" alt="Banana Sushi" style="height:52px;width:auto;display:block;margin:0 auto;" />`
    : `<h1 style="color:#000;font-size:28px;font-weight:900;letter-spacing:-1px;margin:0;">BANANA SUSHI<span style="color:#fbbf24;">.</span></h1>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f9f9f9;margin:0;padding:0;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:#ffffff;padding:32px 40px;text-align:center;border-bottom:3px solid #fbbf24;">
          ${logoHtml}
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
            <tr>
              <td style="padding:12px 0;font-size:18px;font-weight:900;text-transform:uppercase;">Total</td>
              <td style="padding:12px 0;text-align:right;font-size:18px;font-weight:900;">${order.total.toFixed(2)}€</td>
            </tr>
          </table>
          <div style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;">Delivery to</p>
            <p style="margin:0;font-weight:700;font-size:14px;">${order.address}, ${order.zipCode} ${order.city}</p>
          </div>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;">
            We are currently preparing your order. You will receive your delivery within the usual timeframe.
          </p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
          <p style="color:#d1d5db;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;margin:0;">
            BANANA SUSHI · Sushi-Allee 42, 10115 Berlin
          </p>
        </div>
      </div>
      <p style="text-align:center;color:#d1d5db;font-size:11px;margin-top:16px;">
        If you did not receive this email in your inbox, please check your spam folder.
      </p>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Banana Sushi" <${process.env.GMAIL_USER}>`,
    to: customerEmail,
    subject: `Order confirmed — ${order.orderNumber} · Banana Sushi`,
    html,
    attachments: resolvedLogoPath
      ? [{ filename: 'logo.png', path: resolvedLogoPath, cid: 'logo' }]
      : [],
  });
}
