import nodemailer from "nodemailer";
import { formatDuration } from "./formatters";
import { EmployeeDailyReportData, TaskReportItem } from "@/types";
export { formatDuration };
export type { EmployeeDailyReportData, TaskReportItem };

export function generateReportHtml(data: EmployeeDailyReportData): string {
  const { employee, date, attendance, tasks, totalActiveSeconds, totalTasksCompleted, totalTasksPending, shiftDurationSeconds } = data;

  const taskRows = tasks.length === 0
    ? `<tr><td colspan="5" style="padding: 16px; text-align: center; color: #6B778C;">No tasks worked on today.</td></tr>`
    : tasks.map((t, idx) => {
        const priorityColor =
          t.priority === "URGENT" ? "#DE350B" :
          t.priority === "HIGH" ? "#FF8B00" :
          t.priority === "MEDIUM" ? "#0052CC" : "#36B37E";

        const empStatusBadge =
          t.employeeStatus === "COMPLETED" ? "#E3FCEF; color: #006644" :
          t.employeeStatus === "IN_PROGRESS" ? "#DEEBFF; color: #0747A6" :
          t.employeeStatus === "ON_HOLD" ? "#FFF0B3; color: #172B4D" : "#EBECF0; color: #42526E";

        const adminStatusBadge =
          t.adminStatus === "FINAL_COMPLETED" ? "#E3FCEF; color: #006644; border: 1px solid #36B37E" :
          t.adminStatus === "PENDING_REVIEW" ? "#FFF0B3; color: #8F4C00; border: 1px solid #FFAB00" :
          "#F4F5F7; color: #6B778C";

        return `
          <tr style="border-bottom: 1px solid #EBECF0; background: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'};">
            <td style="padding: 12px; font-weight: 500; color: #172B4D;">
              ${t.title}
              <div style="font-size: 11px; color: #6B778C; margin-top: 2px;">Recurrence: <strong>${t.recurrence}</strong></div>
            </td>
            <td style="padding: 12px; text-align: center;">
              <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: ${priorityColor}15; color: ${priorityColor};">
                ${t.priority}
              </span>
            </td>
            <td style="padding: 12px; font-family: monospace; font-size: 13px; font-weight: bold; color: #0747A6; text-align: center;">
              ${formatDuration(t.durationSeconds)}
            </td>
            <td style="padding: 12px; text-align: center;">
              <span style="font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; background: ${empStatusBadge};">
                ${t.employeeStatus}
              </span>
            </td>
            <td style="padding: 12px; text-align: center;">
              <span style="font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; background: ${adminStatusBadge};">
                ${t.adminStatus === 'PENDING_REVIEW' ? 'Pending Review' : t.adminStatus === 'FINAL_COMPLETED' ? 'Final Approved' : t.adminStatus}
              </span>
            </td>
          </tr>
        `;
      }).join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Daily Work & Task Report - ${employee.name}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F5F7; margin: 0; padding: 24px; color: #172B4D;">
    <div style="max-width: 680px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #DFE1E6; box-shadow: 0 4px 12px rgba(9, 30, 66, 0.08);">
      
      <!-- Top Header -->
      <div style="background: linear-gradient(135deg, #0747A6 0%, #0052CC 100%); color: #FFFFFF; padding: 24px 32px;">
        <table style="width: 100%;">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Daily Work & Task Report</h1>
              <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Automated End of Day Summary</p>
            </td>
            <td style="text-align: right;">
              <div style="background: rgba(255, 255, 255, 0.2); padding: 6px 14px; border-radius: 20px; display: inline-block; font-size: 12px; font-weight: 600;">
                📅 ${date}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Employee Info & Attendance Banner -->
      <div style="padding: 24px 32px; background: #FAFBFC; border-bottom: 1px solid #EBECF0;">
        <table style="width: 100%;">
          <tr>
            <td>
              <div style="font-size: 18px; font-weight: 700; color: #172B4D;">${employee.name}</div>
              <div style="font-size: 13px; color: #6B778C; margin-top: 2px;">📧 ${employee.email} &bull; ${employee.designation || 'Team Member'}</div>
            </td>
            <td style="text-align: right;">
              <span style="font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 4px; ${attendance.status === 'PRESENT' || attendance.status === 'CHECKED_OUT' ? 'background: #E3FCEF; color: #006644;' : attendance.status === 'ON_BREAK' ? 'background: #FFF0B3; color: #172B4D;' : 'background: #FFEBE6; color: #BF2600;'}">
                ● ${attendance.status === 'PRESENT' ? 'Checked In (Present)' : attendance.status === 'ON_BREAK' ? 'On Break' : attendance.status === 'CHECKED_OUT' ? 'Checked Out' : 'On Leave / Absent'}
              </span>
            </td>
          </tr>
        </table>

        <!-- Metrics Cards -->
        <table style="width: 100%; border-collapse: separate; border-spacing: 6px 0; margin-top: 14px;">
          <tr>
            <td style="background: #FFFFFF; border: 1px solid #DFE1E6; border-radius: 6px; padding: 10px; text-align: center; width: 18%;">
              <div style="font-size: 10px; color: #6B778C; text-transform: uppercase; font-weight: 600;">Check In</div>
              <div style="font-size: 13px; font-weight: 700; color: #172B4D; margin-top: 4px;">${attendance.checkInTime ? new Date(attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>
            </td>
            <td style="background: #FFFFFF; border: 1px solid #DFE1E6; border-radius: 6px; padding: 10px; text-align: center; width: 18%;">
              <div style="font-size: 10px; color: #6B778C; text-transform: uppercase; font-weight: 600;">Check Out</div>
              <div style="font-size: 13px; font-weight: 700; color: #172B4D; margin-top: 4px;">${attendance.checkOutTime ? new Date(attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (attendance.status === 'PRESENT' ? 'Active' : 'N/A')}</div>
            </td>
            <td style="background: #FFFFFF; border: 1px solid #DFE1E6; border-radius: 6px; padding: 10px; text-align: center; width: 22%;">
              <div style="font-size: 10px; color: #6B778C; text-transform: uppercase; font-weight: 600;">Shift Duration</div>
              <div style="font-size: 13px; font-weight: 700; color: #0052CC; margin-top: 4px;">${formatDuration(shiftDurationSeconds || attendance.workDurationSeconds || 0)}</div>
            </td>
            <td style="background: #FFFFFF; border: 1px solid #DFE1E6; border-radius: 6px; padding: 10px; text-align: center; width: 18%;">
              <div style="font-size: 10px; color: #6B778C; text-transform: uppercase; font-weight: 600;">Break Time</div>
              <div style="font-size: 13px; font-weight: 700; color: #FFAB00; margin-top: 4px;">${attendance.breakDurationSeconds ? formatDuration(attendance.breakDurationSeconds) : '0m'}</div>
            </td>
            <td style="background: #FFFFFF; border: 1px solid #DFE1E6; border-radius: 6px; padding: 10px; text-align: center; width: 24%;">
              <div style="font-size: 10px; color: #6B778C; text-transform: uppercase; font-weight: 600;">Tasks Completed</div>
              <div style="font-size: 13px; font-weight: 700; color: #36B37E; margin-top: 4px;">${totalTasksCompleted} / ${tasks.length}</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Tasks Section -->
      <div style="padding: 24px 32px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #172B4D; margin: 0 0 16px 0;">
          📋 Tasks Activity Breakdown (${tasks.length})
        </h2>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #F4F5F7; color: #5E6C84; border-bottom: 2px solid #DFE1E6; text-align: left;">
              <th style="padding: 10px 12px; font-weight: 700;">Task Name</th>
              <th style="padding: 10px 12px; font-weight: 700; text-align: center;">Priority</th>
              <th style="padding: 10px 12px; font-weight: 700; text-align: center;">Time Spent</th>
              <th style="padding: 10px 12px; font-weight: 700; text-align: center;">Employee Status</th>
              <th style="padding: 10px 12px; font-weight: 700; text-align: center;">Admin Status</th>
            </tr>
          </thead>
          <tbody>
            ${taskRows}
          </tbody>
        </table>
      </div>

      <!-- Footer Note -->
      <div style="background: #F4F5F7; padding: 16px 32px; border-top: 1px solid #EBECF0; font-size: 12px; color: #6B778C; text-align: center;">
        This report was automatically compiled by Task Management Portal.<br>
        Admin review: Tasks marked as 'Pending Review' can be finalized in the Admin Dashboard.
      </div>
    </div>
  </body>
  </html>
  `;
}

import prisma from "@/lib/prisma";

export async function getEmailCredentials(): Promise<{ gmailUser: string | null; gmailPass: string | null }> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ["GMAIL_USER", "GMAIL_APP_PASSWORD"] },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));
    const dbUser = map.get("GMAIL_USER")?.trim();
    const dbPass = map.get("GMAIL_APP_PASSWORD")?.trim();

    const gmailUser = dbUser || process.env.GMAIL_USER || null;
    const gmailPass = dbPass || process.env.GMAIL_APP_PASSWORD || null;

    return { gmailUser, gmailPass };
  } catch (err) {
    console.error("Error fetching email credentials from DB:", err);
    return {
      gmailUser: process.env.GMAIL_USER || null,
      gmailPass: process.env.GMAIL_APP_PASSWORD || null,
    };
  }
}

export async function sendEmailReport(
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  const { gmailUser, gmailPass } = await getEmailCredentials();

  // If real Gmail credentials are provided, send live email
  if (gmailUser && gmailPass && gmailPass.length >= 6 && !gmailUser.includes("example.com")) {
    try {
      const cleanPass = gmailPass.replace(/\s+/g, "");

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: cleanPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      const info = await transporter.sendMail({
        from: `"Task Management Portal" <${gmailUser}>`,
        to: toEmail,
        subject: subject,
        html: htmlContent,
      });

      return {
        success: true,
        message: `Email dispatched successfully to ${toEmail} (MessageId: ${info.messageId})`,
      };
    } catch (error: any) {
      console.error("Nodemailer Gmail SMTP error:", error);
      let errMsg = error.message || "Unknown SMTP error";
      if (
        errMsg.includes("BadCredentials") ||
        errMsg.includes("Username and Password not accepted") ||
        errMsg.includes("Invalid login")
      ) {
        errMsg = "Gmail authentication failed. Please verify your Gmail address and 16-character Google App Password in Settings -> Gmail & EOD Reports.";
      } else if (errMsg.includes("ENOTFOUND") || error.code === "ENOTFOUND") {
        errMsg = "Network error: Unable to reach smtp.gmail.com. Please ensure the machine has active internet access and can connect to Google SMTP servers.";
      }
      return {
        success: false,
        message: `Gmail SMTP Error: ${errMsg}`,
      };
    }
  }

  // Fallback when Gmail SMTP credentials are not configured yet
  return {
    success: false,
    message: `Gmail SMTP credentials not configured. Please open Settings -> "Gmail & EOD Reports" and provide your Gmail address and 16-character App Password.`,
  };
}
