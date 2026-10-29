import { NextResponse } from "next/server";
import { sendEmailReport } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeEmail,
      employeeName,
      monthYear,
      payslipData,
      htmlContent: customHtml,
    } = body;

    if (!employeeEmail) {
      return NextResponse.json(
        { error: "Employee email address is required." },
        { status: 400 }
      );
    }

    const subject = `[NACS Consulting] Salary Slip for the Month of ${monthYear || "Current Period"} - ${employeeName || "Employee"}`;

    const html = customHtml || generatePayslipEmailHtml(payslipData, employeeName, monthYear);

    const result = await sendEmailReport(employeeEmail, subject, html);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Salary slip for ${monthYear} successfully dispatched to ${employeeEmail}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to send payslip" }, { status: 500 });
  }
}

function generatePayslipEmailHtml(data: any, employeeName: string, monthYear: string): string {
  if (!data) return `<p>Salary Slip for ${employeeName} - ${monthYear}</p>`;

  const formatCurrency = (val: number) =>
    "₹" + Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Salary Slip - NACS Consulting</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0f172a, #1e3a8a); color: white; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
        .title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .subtitle { margin: 4px 0 0; font-size: 12px; color: #93c5fd; }
        .badge { background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .content { padding: 32px; }
        .table-section { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
        .table-section th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 8px 12px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .table-section td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
        .label { color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; }
        .val { font-weight: 700; color: #0f172a; }
        .split-grid { display: flex; gap: 20px; margin-bottom: 24px; }
        .split-col { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .net-pay-box { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin-top: 24px; }
        .net-pay-title { font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; }
        .net-pay-amount { font-size: 28px; font-weight: 800; color: #1e3a8a; margin: 6px 0; }
        .net-pay-words { font-size: 11px; color: #64748b; font-style: italic; }
        .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1 class="title">NACS CONSULTING</h1>
            <p class="subtitle">Taxation, Corporate & Management Consultancy Services</p>
          </div>
          <div class="badge">Payslip &bull; ${monthYear}</div>
        </div>

        <div class="content">
          <!-- Employee & Bank Info -->
          <table class="table-section">
            <thead>
              <tr><th colspan="4">Employee &amp; Statutory Particulars</th></tr>
            </thead>
            <tbody>
              <tr>
                <td class="label" width="25%">Employee Name</td>
                <td class="val" width="25%">${data.name || employeeName}</td>
                <td class="label" width="25%">Employee ID / User ID</td>
                <td class="val" width="25%">${data.userId || "EMP-" + (data.id ? data.id.slice(0, 6) : "NACS")}</td>
              </tr>
              <tr>
                <td class="label">Designation</td>
                <td class="val">${data.designation || "Consultant"}</td>
                <td class="label">Date of Joining</td>
                <td class="val">${data.joiningDate || "N/A"}</td>
              </tr>
              <tr>
                <td class="label">PAN Number</td>
                <td class="val" style="font-family: monospace;">${data.panNumber || "N/A"}</td>
                <td class="label">Contact / Phone</td>
                <td class="val">${data.phone || "N/A"}</td>
              </tr>
              <tr>
                <td class="label">Bank Name</td>
                <td class="val">${data.bankName || "N/A"}</td>
                <td class="label">Bank A/C Number</td>
                <td class="val" style="font-family: monospace;">${data.bankAccountNumber || "N/A"}</td>
              </tr>
              <tr>
                <td class="label">IFSC Code</td>
                <td class="val" style="font-family: monospace;">${data.bankIfsc || "N/A"}</td>
                <td class="label">Branch</td>
                <td class="val">${data.bankBranch || "N/A"}</td>
              </tr>
              ${data.address ? `
              <tr>
                <td class="label">Residential Address</td>
                <td class="val" colspan="3">${data.address}</td>
              </tr>
              ` : ""}
            </tbody>
          </table>

          <!-- Attendance & Days Breakdown -->
          <table class="table-section">
            <thead>
              <tr><th colspan="7">Attendance &amp; Work Cycle Metrics (${monthYear})</th></tr>
            </thead>
            <tbody>
              <tr style="text-align: center;">
                <td style="font-weight: 700; color: #475569;">Calendar Days<br><span style="font-size: 14px; color: #0f172a;">${data.totalDaysInMonth || 30}</span></td>
                <td style="font-weight: 700; color: #475569;">Working Days<br><span style="font-size: 14px; color: #0f172a;">${data.workingDays || 26}</span></td>
                <td style="font-weight: 700; color: #16a34a;">Present Days<br><span style="font-size: 14px; color: #16a34a;">${data.presentDays || 0}</span></td>
                <td style="font-weight: 700; color: #2563eb;">Paid Leaves<br><span style="font-size: 14px; color: #2563eb;">${data.paidLeaves || 0}</span></td>
                <td style="font-weight: 700; color: #dc2626;">Unpaid (LWP)<br><span style="font-size: 14px; color: #dc2626;">${data.unpaidLeaves || 0}</span></td>
                <td style="font-weight: 700; color: #7c3aed;">Public Holidays<br><span style="font-size: 14px; color: #7c3aed;">${data.publicHolidays || 0}</span></td>
                <td style="font-weight: 700; color: #d97706;">OT Hours<br><span style="font-size: 14px; color: #d97706;">${data.overtimeHours || 0} hrs</span></td>
              </tr>
            </tbody>
          </table>

          <!-- Earnings vs Deductions Table -->
          <table class="table-section">
            <thead>
              <tr>
                <th width="35%">Earnings Component</th>
                <th width="15%" style="text-align: right;">Amount</th>
                <th width="35%">Deduction Component</th>
                <th width="15%" style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td style="text-align: right; font-weight: 700;">${formatCurrency(data.basicSalary)}</td>
                <td>Loss of Pay (LWP / Unpaid)</td>
                <td style="text-align: right; font-weight: 700; color: #dc2626;">${formatCurrency(data.unpaidDeduction)}</td>
              </tr>
              <tr>
                <td>House Rent Allowance (HRA)</td>
                <td style="text-align: right; font-weight: 700;">${formatCurrency(data.hra)}</td>
                <td>Provident Fund (PF)</td>
                <td style="text-align: right; font-weight: 700; color: #dc2626;">${formatCurrency(data.pfDeduction)}</td>
              </tr>
              <tr>
                <td>Special &amp; Other Allowances</td>
                <td style="text-align: right; font-weight: 700;">${formatCurrency(data.specialAllowance)}</td>
                <td>Professional Tax / TDS</td>
                <td style="text-align: right; font-weight: 700; color: #dc2626;">${formatCurrency(data.ptDeduction)}</td>
              </tr>
              <tr>
                <td>Overtime Pay (${data.overtimeHours || 0} hrs)</td>
                <td style="text-align: right; font-weight: 700; color: #d97706;">${formatCurrency(data.overtimePay)}</td>
                <td>Other Deductions</td>
                <td style="text-align: right; font-weight: 700; color: #dc2626;">${formatCurrency(data.otherDeductions || 0)}</td>
              </tr>
              <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1;">
                <td>Gross Total Earnings</td>
                <td style="text-align: right; color: #16a34a; font-size: 13px;">${formatCurrency(data.grossEarnings)}</td>
                <td>Total Deductions</td>
                <td style="text-align: right; color: #dc2626; font-size: 13px;">${formatCurrency(data.totalDeductions)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Net Pay Box -->
          <div class="net-pay-box">
            <div class="net-pay-title">Net Salary Payable</div>
            <div class="net-pay-amount">${formatCurrency(data.netSalary)}</div>
            ${data.netSalaryInWords ? `<div class="net-pay-words">Amount in words: ${data.netSalaryInWords}</div>` : ""}
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 6px 0; font-weight: 700; color: #1e293b;">⚡ This auto generator &bull; System Verified</p>
          <p style="margin: 0 0 4px 0;">This is an auto-generated salary slip and does not require a signature.</p>
          <p style="margin: 0;">NACS Consulting &bull; For any discrepancies, please reach out to accounts / HR.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
