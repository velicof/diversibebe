import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email, token } = await req.json();

  const verificationUrl = `http://localhost:3000/verify-email?token=${token}&email=${encodeURIComponent(
    email
  )}`;

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "✅ Confirmă adresa de email — DiversiBebe",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FFF8F6; border-radius: 16px;">
          <h1 style="color: #3D2C3E; font-size: 24px;">Bun venit la DiversiBebe! 👶</h1>
          <p style="color: #5C4A5E; font-size: 16px;">Te rugăm să confirmi adresa de email dând click pe butonul de mai jos:</p>
          <a href="${verificationUrl}" style="display: inline-block; background: #D4849A; color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-size: 16px; font-weight: bold; margin: 16px 0;">
            ✅ Confirmă emailul
          </a>
          <p style="color: #8B7A8E; font-size: 13px; margin-top: 24px;">Dacă nu tu ai creat acest cont, ignoră acest email.</p>
          <p style="color: #8B7A8E; font-size: 13px;">Link-ul expiră în 24 de ore.</p>
        </div>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
