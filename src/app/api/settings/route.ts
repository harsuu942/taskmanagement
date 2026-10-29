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

    const companyDailyHours = parseFloat(settingsMap["COMPANY_DAILY_HOURS"] || "8");
    const enableSundayOt = settingsMap["ENABLE_SUNDAY_OT"] !== "false";
    const standardWorkDays = parseInt(settingsMap["STANDARD_WORK_DAYS"] || "26");
    const earnedDays = parseFloat(settingsMap["EARNED_LEAVE_DAYS"] || settingsMap["ANNUAL_LEAVE_QUOTA"] || "18");
    const earnedLeaveAccrual = parseFloat(settingsMap["EARNED_LEAVE_ACCRUAL"] || "1.5");
    const casualDays = parseFloat(settingsMap["CASUAL_LEAVE_DAYS"] || "0");
    const sickDays = parseFloat(settingsMap["SICK_LEAVE_DAYS"] || "0");
    const unpaidEnabled = settingsMap["UNPAID_LEAVE_ENABLED"] === "true";
    const annualLeaveQuota = earnedDays + casualDays + sickDays;

    // Salary & Deduction Components Defaults
    const defaultBasicPercent = parseFloat(settingsMap["DEFAULT_BASIC_PERCENT"] || "50");
    const defaultHraPercent = parseFloat(settingsMap["DEFAULT_HRA_PERCENT"] || "30");
    const defaultSpecialPercent = parseFloat(settingsMap["DEFAULT_SPECIAL_PERCENT"] || "20");
    const defaultPfPercent = parseFloat(settingsMap["DEFAULT_PF_PERCENT"] || "12");
    const defaultPtAmount = parseFloat(settingsMap["DEFAULT_PT_AMOUNT"] || "200");
    const defaultOtMultiplier = parseFloat(settingsMap["DEFAULT_OT_MULTIPLIER"] || "1.5");

    // Dynamic Salary Components Config (Custom Names & Custom Components)
    let salaryComponentsConfig = null;
    if (settingsMap["SALARY_COMPONENTS_CONFIG"]) {
      try {
        salaryComponentsConfig = JSON.parse(settingsMap["SALARY_COMPONENTS_CONFIG"]);
      } catch (e) {}
    }
    if (!salaryComponentsConfig || !Array.isArray(salaryComponentsConfig.earnings)) {
      salaryComponentsConfig = {
        earnings: [
          { id: "basic", name: "Basic Salary", type: "PERCENT_CTC", value: defaultBasicPercent, isDefault: true },
          { id: "hra", name: "House Rent Allowance (HRA)", type: "PERCENT_CTC", value: defaultHraPercent, isDefault: true },
          { id: "special", name: "Special Allowance", type: "PERCENT_CTC", value: defaultSpecialPercent, isDefault: true },
        ],
        deductions: [
          { id: "pf", name: "Provident Fund (PF)", type: "PERCENT_BASIC", value: defaultPfPercent, threshold: 15000, isDefault: true },
          { id: "pt", name: "Professional Tax (PT)", type: "FIXED", value: defaultPtAmount, threshold: 15000, isDefault: true },
        ],
        otMultiplier: defaultOtMultiplier,
      };
    }

    // Dynamic Leave Types Config (Custom Names & Custom Leave Types)
    let leaveTypesConfig = null;
    if (settingsMap["LEAVE_TYPES_CONFIG"]) {
      try {
        leaveTypesConfig = JSON.parse(settingsMap["LEAVE_TYPES_CONFIG"]);
      } catch (e) {}
    }
    if (!leaveTypesConfig || !Array.isArray(leaveTypesConfig) || leaveTypesConfig.length === 0) {
      leaveTypesConfig = [
        { id: "EARNED", name: "Earned Leave (EL)", annualDays: earnedDays, accrualRate: earnedLeaveAccrual, isPaid: true, isDefault: true },
        { id: "CASUAL", name: "Casual Leave (CL)", annualDays: casualDays, accrualRate: 0, isPaid: true, isDefault: true },
        { id: "SICK", name: "Sick Leave (SL)", annualDays: sickDays, accrualRate: 0, isPaid: true, isDefault: true },
        { id: "UNPAID", name: "Unpaid Leave (LWP)", annualDays: 0, accrualRate: 0, isPaid: false, isDefault: true },
      ];
    }

    return NextResponse.json({
      settings: {
        adminEmail,
        gmailUser,
        gmailAppPassword,
        hasPassword,
        gmailConfigured,
        companyDailyHours,
        enableSundayOt,
        standardWorkDays,
        annualLeaveQuota,
        earnedDays,
        earnedLeaveAccrual,
        casualDays,
        sickDays,
        unpaidEnabled,
        defaultBasicPercent,
        defaultHraPercent,
        defaultSpecialPercent,
        defaultPfPercent,
        defaultPtAmount,
        defaultOtMultiplier,
        salaryComponentsConfig,
        leaveTypesConfig,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      adminEmail,
      gmailUser,
      gmailAppPassword,
      testRecipient,
      companyDailyHours,
      enableSundayOt,
      standardWorkDays,
      annualLeaveQuota,
      earnedLeaveAccrual,
      earnedDays,
      casualDays,
      sickDays,
      unpaidEnabled,
      defaultBasicPercent,
      defaultHraPercent,
      defaultSpecialPercent,
      defaultPfPercent,
      defaultPtAmount,
      defaultOtMultiplier,
      salaryComponentsConfig,
      leaveTypesConfig,
    } = body;

    // Optional Action: Test Gmail SMTP Connection
    if (action === "test-email") {
      const recipient = testRecipient || adminEmail || "gaurav141@gmail.com";
      const testSubject = "[nacsconsulting] Test Email - Gmail SMTP Configuration Verified";
      const testHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 20px 24px; color: white;">
              <h2 style="margin: 0; font-size: 18px; font-weight: bold;">nacsconsulting - SMTP Test</h2>
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

    if (companyDailyHours !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "COMPANY_DAILY_HOURS" },
        create: { key: "COMPANY_DAILY_HOURS", value: String(companyDailyHours) },
        update: { value: String(companyDailyHours) },
      });
    }

    if (enableSundayOt !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "ENABLE_SUNDAY_OT" },
        create: { key: "ENABLE_SUNDAY_OT", value: String(enableSundayOt) },
        update: { value: String(enableSundayOt) },
      });
    }

    if (standardWorkDays !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "STANDARD_WORK_DAYS" },
        create: { key: "STANDARD_WORK_DAYS", value: String(standardWorkDays) },
        update: { value: String(standardWorkDays) },
      });
    }

    if (annualLeaveQuota !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "ANNUAL_LEAVE_QUOTA" },
        create: { key: "ANNUAL_LEAVE_QUOTA", value: String(annualLeaveQuota) },
        update: { value: String(annualLeaveQuota) },
      });
    }

    if (earnedLeaveAccrual !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "EARNED_LEAVE_ACCRUAL" },
        create: { key: "EARNED_LEAVE_ACCRUAL", value: String(earnedLeaveAccrual) },
        update: { value: String(earnedLeaveAccrual) },
      });
    }

    if (earnedDays !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "EARNED_LEAVE_DAYS" },
        create: { key: "EARNED_LEAVE_DAYS", value: String(earnedDays) },
        update: { value: String(earnedDays) },
      });
    }

    if (casualDays !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "CASUAL_LEAVE_DAYS" },
        create: { key: "CASUAL_LEAVE_DAYS", value: String(casualDays) },
        update: { value: String(casualDays) },
      });
    }

    if (sickDays !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "SICK_LEAVE_DAYS" },
        create: { key: "SICK_LEAVE_DAYS", value: String(sickDays) },
        update: { value: String(sickDays) },
      });
    }

    if (unpaidEnabled !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "UNPAID_LEAVE_ENABLED" },
        create: { key: "UNPAID_LEAVE_ENABLED", value: String(unpaidEnabled) },
        update: { value: String(unpaidEnabled) },
      });
    }

    if (defaultBasicPercent !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "DEFAULT_BASIC_PERCENT" },
        create: { key: "DEFAULT_BASIC_PERCENT", value: String(defaultBasicPercent) },
        update: { value: String(defaultBasicPercent) },
      });
    }

    if (defaultHraPercent !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "DEFAULT_HRA_PERCENT" },
        create: { key: "DEFAULT_HRA_PERCENT", value: String(defaultHraPercent) },
        update: { value: String(defaultHraPercent) },
      });
    }

    if (defaultSpecialPercent !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "DEFAULT_SPECIAL_PERCENT" },
        create: { key: "DEFAULT_SPECIAL_PERCENT", value: String(defaultSpecialPercent) },
        update: { value: String(defaultSpecialPercent) },
      });
    }

    if (defaultPfPercent !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "DEFAULT_PF_PERCENT" },
        create: { key: "DEFAULT_PF_PERCENT", value: String(defaultPfPercent) },
        update: { value: String(defaultPfPercent) },
      });
    }

    if (defaultPtAmount !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "DEFAULT_PT_AMOUNT" },
        create: { key: "DEFAULT_PT_AMOUNT", value: String(defaultPtAmount) },
        update: { value: String(defaultPtAmount) },
      });
    }

    if (defaultOtMultiplier !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "DEFAULT_OT_MULTIPLIER" },
        create: { key: "DEFAULT_OT_MULTIPLIER", value: String(defaultOtMultiplier) },
        update: { value: String(defaultOtMultiplier) },
      });
    }

    if (salaryComponentsConfig !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "SALARY_COMPONENTS_CONFIG" },
        create: { key: "SALARY_COMPONENTS_CONFIG", value: JSON.stringify(salaryComponentsConfig) },
        update: { value: JSON.stringify(salaryComponentsConfig) },
      });

      // Synchronize backward-compatible keys if earnings/deductions provided
      if (Array.isArray(salaryComponentsConfig.earnings)) {
        const basic = salaryComponentsConfig.earnings.find((e: any) => e.id === "basic")?.value;
        const hra = salaryComponentsConfig.earnings.find((e: any) => e.id === "hra")?.value;
        const special = salaryComponentsConfig.earnings.find((e: any) => e.id === "special")?.value;
        if (basic !== undefined) {
          await prisma.systemSetting.upsert({
            where: { key: "DEFAULT_BASIC_PERCENT" },
            create: { key: "DEFAULT_BASIC_PERCENT", value: String(basic) },
            update: { value: String(basic) },
          });
        }
        if (hra !== undefined) {
          await prisma.systemSetting.upsert({
            where: { key: "DEFAULT_HRA_PERCENT" },
            create: { key: "DEFAULT_HRA_PERCENT", value: String(hra) },
            update: { value: String(hra) },
          });
        }
        if (special !== undefined) {
          await prisma.systemSetting.upsert({
            where: { key: "DEFAULT_SPECIAL_PERCENT" },
            create: { key: "DEFAULT_SPECIAL_PERCENT", value: String(special) },
            update: { value: String(special) },
          });
        }
      }
      if (Array.isArray(salaryComponentsConfig.deductions)) {
        const pf = salaryComponentsConfig.deductions.find((d: any) => d.id === "pf")?.value;
        const pt = salaryComponentsConfig.deductions.find((d: any) => d.id === "pt")?.value;
        if (pf !== undefined) {
          await prisma.systemSetting.upsert({
            where: { key: "DEFAULT_PF_PERCENT" },
            create: { key: "DEFAULT_PF_PERCENT", value: String(pf) },
            update: { value: String(pf) },
          });
        }
        if (pt !== undefined) {
          await prisma.systemSetting.upsert({
            where: { key: "DEFAULT_PT_AMOUNT" },
            create: { key: "DEFAULT_PT_AMOUNT", value: String(pt) },
            update: { value: String(pt) },
          });
        }
      }
      if (salaryComponentsConfig.otMultiplier !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key: "DEFAULT_OT_MULTIPLIER" },
          create: { key: "DEFAULT_OT_MULTIPLIER", value: String(salaryComponentsConfig.otMultiplier) },
          update: { value: String(salaryComponentsConfig.otMultiplier) },
        });
      }
    }

    if (leaveTypesConfig !== undefined && Array.isArray(leaveTypesConfig)) {
      await prisma.systemSetting.upsert({
        where: { key: "LEAVE_TYPES_CONFIG" },
        create: { key: "LEAVE_TYPES_CONFIG", value: JSON.stringify(leaveTypesConfig) },
        update: { value: JSON.stringify(leaveTypesConfig) },
      });

      // Synchronize backward-compatible keys
      const earned = leaveTypesConfig.find((t: any) => t.id === "EARNED");
      const casual = leaveTypesConfig.find((t: any) => t.id === "CASUAL");
      const sick = leaveTypesConfig.find((t: any) => t.id === "SICK");
      const unpaid = leaveTypesConfig.find((t: any) => t.id === "UNPAID");

      if (earned) {
        await prisma.systemSetting.upsert({
          where: { key: "EARNED_LEAVE_DAYS" },
          create: { key: "EARNED_LEAVE_DAYS", value: String(earned.annualDays) },
          update: { value: String(earned.annualDays) },
        });
        if (earned.accrualRate !== undefined) {
          await prisma.systemSetting.upsert({
            where: { key: "EARNED_LEAVE_ACCRUAL" },
            create: { key: "EARNED_LEAVE_ACCRUAL", value: String(earned.accrualRate) },
            update: { value: String(earned.accrualRate) },
          });
        }
      }
      if (casual) {
        await prisma.systemSetting.upsert({
          where: { key: "CASUAL_LEAVE_DAYS" },
          create: { key: "CASUAL_LEAVE_DAYS", value: String(casual.annualDays) },
          update: { value: String(casual.annualDays) },
        });
      }
      if (sick) {
        await prisma.systemSetting.upsert({
          where: { key: "SICK_LEAVE_DAYS" },
          create: { key: "SICK_LEAVE_DAYS", value: String(sick.annualDays) },
          update: { value: String(sick.annualDays) },
        });
      }
      if (unpaid) {
        await prisma.systemSetting.upsert({
          where: { key: "UNPAID_LEAVE_ENABLED" },
          create: { key: "UNPAID_LEAVE_ENABLED", value: String(unpaid.annualDays > 0 || unpaid.isPaid === false) },
          update: { value: String(unpaid.annualDays > 0 || unpaid.isPaid === false) },
        });
      }

      const totalPaid = leaveTypesConfig
        .filter((t: any) => t.isPaid)
        .reduce((sum: number, t: any) => sum + (parseFloat(t.annualDays) || 0), 0);
      await prisma.systemSetting.upsert({
        where: { key: "ANNUAL_LEAVE_QUOTA" },
        create: { key: "ANNUAL_LEAVE_QUOTA", value: String(totalPaid) },
        update: { value: String(totalPaid) },
      });
    }

    return NextResponse.json({ success: true, message: "Settings saved successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
