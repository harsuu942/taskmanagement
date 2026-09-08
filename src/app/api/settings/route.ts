import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmailReport } from "@/lib/email";

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const adminEmail = settingsMap["ADMIN_NOTIFICATION_EMAIL"] || process.env.ADMIN_NOTIFICATION_EMAIL || "gaurav141@gmail.com";
    const gmailUser = settingsMap["GMAIL_USER"] || process.env.GMAIL_USER || "";
    const hasPassword = !!(settingsMap["GMAIL_APP_PASSWORD"] || process.env.GMAIL_APP_PASSWORD);
    const gmailAppPassword = settingsMap["GMAIL_APP_PASSWORD"] || process.env.GMAIL_APP_PASSWORD || "";

    const gmailConfigured = !!(
      gmailUser &&
      hasPassword &&
      !gmailUser.includes("example.com")
    );

    return NextResponse.json({
      settings: {
        adminEmail,
        gmailUser,
        gmailAppPassword,
        hasPassword,
        gmailConfigured,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, adminEmail, gmailUser, gmailAppPassword, testRecipient } = body;

    // Optional Action: Test Gmail SMTP Connection
    if (action === "test-email") {
      const recipient = testRecipient || adminEmail || "gaurav141@gmail.com";
      const testSubject = "[Task Management] Test Email - Gmail SMTP Configuration Verified";
      const testHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 20px 24px; color: white;">
              <h2 style="margin: 0; font-size: 18px; font-weight: bold;">Task Management - SMTP Test</h2>
              <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Automated Notification Verification</p>
            </div>
            <div style="padding: 24px;">
              <p style="margin-top: 0; font-size: 14px; line-height: 1.6;">
                Congratulations! Your Gmail SMTP integration is working perfectly.
              </p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; color: #166534; font-size: 13px; font-weight: 600;">
                ✅ Status: Live Gmail SMTP connection active and verified.
              </div>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
                All employee End of Day (EOD) work reports, task metrics, and attendance digests can now be delivered directly to this inbox.
              </p>
            </div>
          </div>
        </div>
      `;

      const result = await sendEmailReport(recipient, testSubject, testHtml);
      return NextResponse.json(result);
    }

    if (adminEmail !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "ADMIN_NOTIFICATION_EMAIL" },
        create: { key: "ADMIN_NOTIFICATION_EMAIL", value: adminEmail.trim() },
        update: { value: adminEmail.trim() },
      });
    }

    if (gmailUser !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "GMAIL_USER" },
        create: { key: "GMAIL_USER", value: gmailUser.trim() },
        update: { value: gmailUser.trim() },
      });
    }

    if (gmailAppPassword !== undefined && gmailAppPassword.trim()) {
      await prisma.systemSetting.upsert({
        where: { key: "GMAIL_APP_PASSWORD" },
        create: { key: "GMAIL_APP_PASSWORD", value: gmailAppPassword.trim().replace(/\s+/g, "") },
        update: { value: gmailAppPassword.trim().replace(/\s+/g, "") },
      });
    }

    return NextResponse.json({ success: true, message: "Settings saved successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

