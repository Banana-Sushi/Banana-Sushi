import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    await transporter.sendMail({
      from: `"Banana Sushi Website" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: email,
      subject: `New contact message from ${name}`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:40px auto;">
          <h2 style="font-size:20px;font-weight:900;text-transform:uppercase;margin-bottom:16px;">New Contact Message</h2>
          <p style="margin:0 0 8px;"><strong>Name:</strong> ${name}</p>
          <p style="margin:0 0 8px;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:16px 0;">
          <p style="white-space:pre-wrap;font-size:14px;color:#374151;">${message}</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Contact email failed:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
