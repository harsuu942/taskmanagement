"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { User, SalaryComponentsConfig } from "@/types";
import {
  FileText,
  X,
  Printer,
  Mail,
  Calendar,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Send,
  Sparkles,
  Clock,
  Check,
} from "lucide-react";

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any | null;
  allEmployees?: any[];
  currentUser?: User | null;
}

// Convert number to Indian currency words
function numberToWords(num: number): string {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = Math.round(num);
  if (n === 0) return "Zero Rupees Only";
  if (n < 0) return "Minus " + numberToWords(Math.abs(n));

  function inWords(val: number): string {
    if (val < 20) return a[val];
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : " ");
    if (val < 1000) return inWords(Math.floor(val / 100)) + "Hundred " + (val % 100 !== 0 ? inWords(val % 100) : "");
    if (val < 100000) return inWords(Math.floor(val / 1000)) + "Thousand " + (val % 1000 !== 0 ? inWords(val % 1000) : "");
    if (val < 10000000) return inWords(Math.floor(val / 100000)) + "Lakh " + (val % 100000 !== 0 ? inWords(val % 100000) : "");
    return inWords(Math.floor(val / 10000000)) + "Crore " + (val % 10000000 !== 0 ? inWords(val % 10000000) : "");
  }

  return "Rupees " + inWords(n).trim() + " Only";
}

export default function SalarySlipModal({
  isOpen,
  onClose,
  employee: initialEmployee,
  allEmployees = [],
  currentUser,
}: SalarySlipModalProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployee?.id || "");

  const printRef = useRef<HTMLDivElement>(null);

  // Active employee object
  const employee = useMemo(() => {
    if (allEmployees.length > 0 && selectedEmployeeId) {
      return allEmployees.find((e) => e.id === selectedEmployeeId) || initialEmployee;
    }
    return initialEmployee;
  }, [allEmployees, selectedEmployeeId, initialEmployee]);

  useEffect(() => {
    if (initialEmployee?.id) {
      setSelectedEmployeeId(initialEmployee.id);
    }
  }, [initialEmployee]);

  // Attendance, Leave & Holiday metrics state
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [presentDays, setPresentDays] = useState(0);
  const [paidLeaves, setPaidLeaves] = useState(0);
  const [unpaidLeaves, setUnpaidLeaves] = useState(0);
  const [publicHolidays, setPublicHolidays] = useState(0);
  const [overtimeHours, setOvertimeHours] = useState(0);

  // Manual editable adjustments & components customization
  const [monthlySalaryInput, setMonthlySalaryInput] = useState<number>(30000);
  const [hourlyRateInput, setHourlyRateInput] = useState<number>(200);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [bonusAmount, setBonusAmount] = useState<number>(0);

  // Admin configurable earnings & deductions components (null = auto calculated by standard formula)
  const [basicOverride, setBasicOverride] = useState<number | null>(null);
  const [hraOverride, setHraOverride] = useState<number | null>(null);
  const [specialOverride, setSpecialOverride] = useState<number | null>(null);
  const [otPayOverride, setOtPayOverride] = useState<number | null>(null);
  const [lwpOverride, setLwpOverride] = useState<number | null>(null);
  const [pfOverride, setPfOverride] = useState<number | null>(null);
  const [ptOverride, setPtOverride] = useState<number | null>(null);
  const [componentOverrides, setComponentOverrides] = useState<{ [id: string]: number | null }>({});
  const [showComponentConfig, setShowComponentConfig] = useState(true);

  // Dynamic system defaults and components config for salary slip
  const [salaryConfig, setSalaryConfig] = useState<SalaryComponentsConfig>({
    earnings: [
      { id: "basic", name: "Basic Salary", type: "PERCENT_CTC", value: 50, isDefault: true },
      { id: "hra", name: "House Rent Allowance (HRA)", type: "PERCENT_CTC", value: 30, isDefault: true },
      { id: "special", name: "Special Allowance", type: "PERCENT_CTC", value: 20, isDefault: true },
    ],
    deductions: [
      { id: "pf", name: "Provident Fund (PF)", type: "PERCENT_BASIC", value: 12, threshold: 15000, isDefault: true },
      { id: "pt", name: "Professional Tax (PT)", type: "FIXED", value: 200, threshold: 15000, isDefault: true },
    ],
    otMultiplier: 1.5,
  });

  const [systemDefaults, setSystemDefaults] = useState({
    basicPercent: 50,
    hraPercent: 30,
    specialPercent: 20,
    pfPercent: 12,
    ptAmount: 200,
    otMultiplier: 1.5,
  });

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          if (data.settings.salaryComponentsConfig) {
            setSalaryConfig(data.settings.salaryComponentsConfig);
          }
          setSystemDefaults({
            basicPercent: data.settings.defaultBasicPercent ?? 50,
            hraPercent: data.settings.defaultHraPercent ?? 30,
            specialPercent: data.settings.defaultSpecialPercent ?? 20,
            pfPercent: data.settings.defaultPfPercent ?? 12,
            ptAmount: data.settings.defaultPtAmount ?? 200,
            otMultiplier: data.settings.defaultOtMultiplier ?? 1.5,
          });
        }
      })
      .catch(console.error);
  }, [isOpen]);

  const handleResetComponents = () => {
    setBasicOverride(null);
    setHraOverride(null);
    setSpecialOverride(null);
    setOtPayOverride(null);
    setLwpOverride(null);
    setPfOverride(null);
    setPtOverride(null);
    setComponentOverrides({});
    setOtherDeductions(0);
    setBonusAmount(0);
  };

  // Email sending state
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Months array
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calculate days in selected month
  const totalDaysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Update salary when employee changes
  useEffect(() => {
    if (employee?.salary && employee.salary > 0) {
      setMonthlySalaryInput(employee.salary);
    }
    if (employee?.hourlyRate && employee.hourlyRate > 0) {
      setHourlyRateInput(employee.hourlyRate);
    }
    handleResetComponents();
  }, [employee]);

  // Fetch employee attendance & leaves for the month
  useEffect(() => {
    if (!isOpen || !employee?.id) return;

    const fetchMonthStats = async () => {
      setLoadingMetrics(true);
      try {
        const startStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
        const endStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(totalDaysInMonth).padStart(2, "0")}`;

        // Fetch attendance records
        const attRes = await fetch(`/api/attendance?startDate=${startStr}&endDate=${endStr}&employeeId=${employee.id}`);
        const attData = await attRes.json();

        // Fetch leaves
        const leaveRes = await fetch(`/api/leaves?userId=${employee.id}&role=EMPLOYEE`);
        const leaveData = await leaveRes.json();

        // Fetch holidays
        const holRes = await fetch(`/api/holidays?startDate=${startStr}&endDate=${endStr}`);
        const holData = await holRes.json();

        const holidays = holData.holidays || [];
        setPublicHolidays(holidays.length);

        // Process Attendance
        let presentCount = 0;
        let otHoursSum = 0;

        if (attData.records && Array.isArray(attData.records)) {
          attData.records.forEach((r: any) => {
            if (r.userId === employee.id) {
              const recDate = new Date(`${r.date}T00:00:00`);
              const isSunday = recDate.getDay() === 0;

              if (r.status === "PRESENT" || r.checkInTime || r.workDurationSeconds > 0) {
                presentCount++;
              }

              // Overtime: Sunday work counts 100% as OT!
              const workHours = (r.workDurationSeconds || 0) / 3600;
              if (isSunday) {
                otHoursSum += workHours;
              } else if (workHours > 8) {
                otHoursSum += (workHours - 8);
              }
            }
          });
        }
        setPresentDays(presentCount);
        setOvertimeHours(parseFloat(otHoursSum.toFixed(1)));

        // Process Leaves
        let paid = 0;
        let unpaid = 0;
        if (leaveData.leaves && Array.isArray(leaveData.leaves)) {
          const approved = leaveData.leaves.filter((l: any) => {
            if (l.status !== "APPROVED" || l.userId !== employee.id) return false;
            return (l.startDate <= endStr && l.endDate >= startStr);
          });

          approved.forEach((l: any) => {
            const count = l.daysCount || 1;
            if (l.leaveType === "UNPAID") {
              unpaid += count;
            } else {
              paid += count;
            }
          });
        }
        setPaidLeaves(paid);
        setUnpaidLeaves(unpaid);
      } catch (err) {
        console.error("Error calculating month stats:", err);
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchMonthStats();
  }, [isOpen, employee?.id, selectedMonth, selectedYear, totalDaysInMonth]);

  // Working Days in Month (excluding Sundays)
  const workingDays = useMemo(() => {
    let sundays = 0;
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(selectedYear, selectedMonth, day);
      if (d.getDay() === 0) sundays++;
    }
    return Math.max(1, totalDaysInMonth - sundays - publicHolidays);
  }, [selectedYear, selectedMonth, totalDaysInMonth, publicHolidays]);

  const formatINR = (val: number) =>
    "₹" + Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Salary Calculations with Dynamic Component Overrides
  const calculations = useMemo(() => {
    const grossBase = Number(monthlySalaryInput) || 0;

    // Effective Hourly Rate for OT
    const effectiveHourlyRate =
      hourlyRateInput > 0
        ? hourlyRateInput
        : workingDays > 0
        ? grossBase / (workingDays * 8)
        : 150;

    const otMultiplier = salaryConfig.otMultiplier || systemDefaults.otMultiplier || 1.5;
    const defaultOtPay = Math.round(overtimeHours * effectiveHourlyRate * otMultiplier);
    const otPay = otPayOverride !== null ? otPayOverride : defaultOtPay;
    const bonus = Number(bonusAmount || 0);

    // Dynamic Earnings calculation
    const computedEarningsList: Array<{
      id: string;
      name: string;
      type?: string;
      amount: number;
      defaultAmount: number;
      isCustom: boolean;
    }> = [];

    const configuredEarnings = (salaryConfig.earnings && salaryConfig.earnings.length > 0)
      ? salaryConfig.earnings
      : [
          { id: "basic", name: "Basic Salary", type: "PERCENT_CTC" as const, value: 50, isDefault: true },
          { id: "hra", name: "House Rent Allowance (HRA)", type: "PERCENT_CTC" as const, value: 30, isDefault: true },
          { id: "special", name: "Special Allowance", type: "PERCENT_CTC" as const, value: 20, isDefault: true },
        ];

    let computedBasic = 0;
    let defaultBasic = 0;
    let defaultHra = 0;
    let defaultSpecial = 0;
    let basicVal = 0;
    let hraVal = 0;
    let specialVal = 0;

    configuredEarnings.forEach((e) => {
      let override = componentOverrides[e.id] ?? null;
      if (e.id === "basic" && basicOverride !== null) override = basicOverride;
      if (e.id === "hra" && hraOverride !== null) override = hraOverride;
      if (e.id === "special" && specialOverride !== null) override = specialOverride;

      const def = e.type === "PERCENT_CTC"
        ? Math.round(grossBase * (e.value / 100))
        : Math.round(e.value);

      const finalAmt = override !== null ? override : def;

      if (e.id === "basic") {
        defaultBasic = def;
        basicVal = finalAmt;
        computedBasic = finalAmt;
      } else if (e.id === "hra") {
        defaultHra = def;
        hraVal = finalAmt;
      } else if (e.id === "special") {
        defaultSpecial = def;
        specialVal = finalAmt;
      }

      computedEarningsList.push({
        id: e.id,
        name: e.name + (e.type === "PERCENT_CTC" ? ` (${e.value}%)` : ""),
        type: e.type,
        amount: Math.round(finalAmt),
        defaultAmount: Math.round(def),
        isCustom: override !== null,
      });
    });

    if (computedBasic === 0) {
      computedBasic = basicVal || Math.round(grossBase * 0.5);
    }

    // Overtime pay in earnings
    computedEarningsList.push({
      id: "overtime",
      name: `Overtime Pay (${overtimeHours} hrs @ ${formatINR(Math.round(effectiveHourlyRate * otMultiplier))}/hr)`,
      amount: Math.round(otPay),
      defaultAmount: Math.round(defaultOtPay),
      isCustom: otPayOverride !== null,
    });

    // Bonus if applicable
    if (bonus > 0) {
      computedEarningsList.push({
        id: "bonus",
        name: "Performance / Festival Bonus",
        amount: Math.round(bonus),
        defaultAmount: 0,
        isCustom: true,
      });
    }

    const totalGrossEarnings = computedEarningsList.reduce((sum, item) => sum + item.amount, 0);

    // Deductions calculation
    const perDaySalary = totalDaysInMonth > 0 ? grossBase / totalDaysInMonth : 0;
    const defaultLwp = Math.round(unpaidLeaves * perDaySalary);
    const lwpDeduction = lwpOverride !== null ? lwpOverride : defaultLwp;

    const computedDeductionsList: Array<{
      id: string;
      name: string;
      type?: string;
      amount: number;
      defaultAmount: number;
      isCustom: boolean;
    }> = [
      {
        id: "lwp",
        name: `Loss of Pay (LWP - ${unpaidLeaves} day(s))`,
        amount: Math.round(lwpDeduction),
        defaultAmount: Math.round(defaultLwp),
        isCustom: lwpOverride !== null,
      },
    ];

    const configuredDeductions = (salaryConfig.deductions && salaryConfig.deductions.length > 0)
      ? salaryConfig.deductions
      : [
          { id: "pf", name: "Provident Fund (PF)", type: "PERCENT_BASIC" as const, value: 12, threshold: 15000, isDefault: true },
          { id: "pt", name: "Professional Tax (PT)", type: "FIXED" as const, value: 200, threshold: 15000, isDefault: true },
        ];

    let defaultPf = 0;
    let defaultPt = 0;
    let pfVal = 0;
    let ptVal = 0;

    configuredDeductions.forEach((d) => {
      let override = componentOverrides[d.id] ?? null;
      if (d.id === "pf" && pfOverride !== null) override = pfOverride;
      if (d.id === "pt" && ptOverride !== null) override = ptOverride;

      let def = 0;
      const baseVal = d.type === "PERCENT_BASIC" ? computedBasic : grossBase;
      if (!d.threshold || baseVal >= d.threshold) {
        if (d.type === "PERCENT_BASIC") {
          def = Math.round(computedBasic * (d.value / 100));
        } else if (d.type === "PERCENT_CTC") {
          def = Math.round(grossBase * (d.value / 100));
        } else {
          def = Math.round(d.value);
        }
      }

      const finalAmt = override !== null ? override : def;

      if (d.id === "pf") {
        defaultPf = def;
        pfVal = finalAmt;
      } else if (d.id === "pt") {
        defaultPt = def;
        ptVal = finalAmt;
      }

      computedDeductionsList.push({
        id: d.id,
        name: d.name,
        type: d.type,
        amount: Math.round(finalAmt),
        defaultAmount: Math.round(def),
        isCustom: override !== null,
      });
    });

    const other = Number(otherDeductions || 0);
    if (other > 0) {
      computedDeductionsList.push({
        id: "other",
        name: "Other Deductions",
        amount: Math.round(other),
        defaultAmount: 0,
        isCustom: true,
      });
    }

    const totalDeductionsCalc = computedDeductionsList.reduce((sum, item) => sum + item.amount, 0);
    const netSalaryCalc = Math.max(0, totalGrossEarnings - totalDeductionsCalc);

    // Paired rows for synchronized dual-column table rendering
    const maxRows = Math.max(computedEarningsList.length, computedDeductionsList.length);
    const pairedRows: Array<{
      earning: typeof computedEarningsList[0] | null;
      deduction: typeof computedDeductionsList[0] | null;
    }> = [];
    for (let i = 0; i < maxRows; i++) {
      pairedRows.push({
        earning: computedEarningsList[i] || null,
        deduction: computedDeductionsList[i] || null,
      });
    }

    const hasAnyOverride =
      basicOverride !== null ||
      hraOverride !== null ||
      specialOverride !== null ||
      otPayOverride !== null ||
      lwpOverride !== null ||
      pfOverride !== null ||
      ptOverride !== null ||
      Object.values(componentOverrides).some((v) => v !== null) ||
      otherDeductions > 0 ||
      bonusAmount > 0;

    return {
      basicSalary: Math.round(basicVal || computedBasic),
      defaultBasic,
      hra: Math.round(hraVal),
      defaultHra,
      specialAllowance: Math.round(specialVal),
      defaultSpecial,
      overtimePay: Math.round(otPay),
      defaultOtPay,
      bonusAmount: Math.round(bonus),
      grossEarnings: Math.round(totalGrossEarnings),
      unpaidDeduction: Math.round(lwpDeduction),
      defaultLwp,
      pfDeduction: Math.round(pfVal),
      defaultPf,
      ptDeduction: Math.round(ptVal),
      defaultPt,
      otherDeductions: Math.round(other),
      totalDeductions: Math.round(totalDeductionsCalc),
      netSalary: Math.round(netSalaryCalc),
      netSalaryInWords: numberToWords(Math.round(netSalaryCalc)),
      effectiveHourlyRate: Math.round(effectiveHourlyRate),
      computedEarningsList,
      computedDeductionsList,
      pairedRows,
      hasCustomComponents: hasAnyOverride,
    };
  }, [
    monthlySalaryInput,
    hourlyRateInput,
    overtimeHours,
    workingDays,
    bonusAmount,
    totalDaysInMonth,
    unpaidLeaves,
    otherDeductions,
    basicOverride,
    hraOverride,
    specialOverride,
    otPayOverride,
    lwpOverride,
    pfOverride,
    ptOverride,
    componentOverrides,
    salaryConfig,
    systemDefaults,
  ]);

  const monthYearString = `${months[selectedMonth]} ${selectedYear}`;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Email Payslip Handler
  const handleEmailPayslip = async () => {
    if (!employee?.email) {
      setEmailStatus({ type: "error", message: "Employee does not have an email address." });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    const payload = {
      employeeEmail: employee.email,
      employeeName: employee.name,
      monthYear: monthYearString,
      payslipData: {
        id: employee.id,
        name: employee.name,
        userId: employee.userId || employee.email.split("@")[0],
        designation: employee.designation,
        email: employee.email,
        phone: employee.phone,
        panNumber: employee.panNumber,
        address: employee.address,
        joiningDate: employee.joiningDate,
        bankAccountName: employee.bankAccountName || employee.name,
        bankName: employee.bankName,
        bankBranch: employee.bankBranch,
        bankAccountNumber: employee.bankAccountNumber,
        bankIfsc: employee.bankIfsc,
        totalDaysInMonth,
        workingDays,
        presentDays,
        paidLeaves,
        unpaidLeaves,
        publicHolidays,
        overtimeHours,
        ...calculations,
      },
    };

    try {
      const res = await fetch("/api/payslips/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch payslip email.");
      setEmailStatus({
        type: "success",
        message: `Salary Slip successfully emailed to ${employee.email}!`,
      });
    } catch (err: any) {
      setEmailStatus({
        type: "error",
        message: err.message || "Failed to email salary slip.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-900 text-white print:hidden">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold tracking-wide">
              Employee Salary Slip Generator &bull; {monthYearString}
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleEmailPayslip}
              disabled={isSendingEmail}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isSendingEmail ? "Sending Email..." : "Email to Employee"}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar (Hidden in Print) */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs print:hidden space-y-2">
          {emailStatus && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center justify-between ${
                emailStatus.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              <div className="flex items-center space-x-2">
                {emailStatus.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{emailStatus.message}</span>
              </div>
              <button
                onClick={() => setEmailStatus(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
            {/* Employee Selector */}
            {allEmployees.length > 0 && (
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                  Select Employee
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                >
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation || "Staff"}) - {emp.userId || emp.email.split("@")[0]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Month Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                Pay Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                Pay Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Base Salary Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                Monthly CTC / Salary (₹)
              </label>
              <input
                type="number"
                value={monthlySalaryInput}
                onChange={(e) => setMonthlySalaryInput(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Admin Components Customization Button */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowComponentConfig(!showComponentConfig)}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {showComponentConfig
                  ? "Hide Component Customization"
                  : "Set Earning & Deduction Components"}
              </span>
              {calculations.hasCustomComponents && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-extrabold">
                  Custom Components Active
                </span>
              )}
            </button>

            {calculations.hasCustomComponents && (
              <button
                type="button"
                onClick={handleResetComponents}
                className="text-[11px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
              >
                Reset to Standard Auto Formula
              </button>
            )}
          </div>

          {/* Component Config Panel */}
          {showComponentConfig && (
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 mt-2 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Admin Salary Components Adjustment
                </span>
                <span className="text-[10px] text-slate-500">
                  Override standard percentages or statutory deductions as needed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Earnings Components */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-bold text-emerald-900 border-b border-emerald-200 pb-1 flex items-center justify-between">
                    <span>Earnings Components</span>
                    <span className="text-[10px] text-emerald-700 font-bold">Gross: {formatINR(calculations.grossEarnings)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(salaryConfig.earnings && salaryConfig.earnings.length > 0 ? salaryConfig.earnings : [
                      { id: "basic", name: "Basic Salary", type: "PERCENT_CTC" as const, value: 50 },
                      { id: "hra", name: "House Rent Allowance (HRA)", type: "PERCENT_CTC" as const, value: 30 },
                      { id: "special", name: "Special Allowance", type: "PERCENT_CTC" as const, value: 20 },
                    ]).map((e) => {
                      const currentVal =
                        e.id === "basic"
                          ? basicOverride
                          : e.id === "hra"
                          ? hraOverride
                          : e.id === "special"
                          ? specialOverride
                          : componentOverrides[e.id] ?? null;

                      const defVal =
                        e.type === "PERCENT_CTC"
                          ? Math.round((Number(monthlySalaryInput) || 0) * (e.value / 100))
                          : Math.round(e.value);

                      return (
                        <div key={e.id}>
                          <label className="block text-[10px] text-slate-600 font-semibold mb-0.5 truncate" title={e.name}>
                            {e.name} ({e.type === "PERCENT_CTC" ? `${e.value}%` : "₹"})
                          </label>
                          <input
                            type="number"
                            placeholder={`Auto: ${defVal}`}
                            value={currentVal !== null ? currentVal : ""}
                            onChange={(ev) => {
                              const val = ev.target.value === "" ? null : parseFloat(ev.target.value) || 0;
                              if (e.id === "basic") setBasicOverride(val);
                              else if (e.id === "hra") setHraOverride(val);
                              else if (e.id === "special") setSpecialOverride(val);
                              else setComponentOverrides((prev) => ({ ...prev, [e.id]: val }));
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold"
                          />
                        </div>
                      );
                    })}

                    <div>
                      <label className="block text-[10px] text-slate-600 font-semibold mb-0.5">
                        Overtime Pay (₹)
                      </label>
                      <input
                        type="number"
                        placeholder={`Auto: ${calculations.defaultOtPay}`}
                        value={otPayOverride !== null ? otPayOverride : ""}
                        onChange={(e) =>
                          setOtPayOverride(e.target.value === "" ? null : parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 font-semibold mb-0.5">
                        Bonus / Festival Pay (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={bonusAmount || ""}
                        onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold text-emerald-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Deductions Components */}
                <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-bold text-rose-900 border-b border-rose-200 pb-1 flex items-center justify-between">
                    <span>Deduction Components</span>
                    <span className="text-[10px] text-rose-700 font-bold">Total: {formatINR(calculations.totalDeductions)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-600 font-semibold mb-0.5">
                        Loss of Pay (LWP ₹)
                      </label>
                      <input
                        type="number"
                        placeholder={`Auto: ${calculations.defaultLwp}`}
                        value={lwpOverride !== null ? lwpOverride : ""}
                        onChange={(e) =>
                          setLwpOverride(e.target.value === "" ? null : parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold text-rose-700"
                      />
                    </div>

                    {(salaryConfig.deductions && salaryConfig.deductions.length > 0 ? salaryConfig.deductions : [
                      { id: "pf", name: "Provident Fund (PF)", type: "PERCENT_BASIC" as const, value: 12, threshold: 15000 },
                      { id: "pt", name: "Professional Tax (PT)", type: "FIXED" as const, value: 200, threshold: 15000 },
                    ]).map((d) => {
                      const currentVal =
                        d.id === "pf"
                          ? pfOverride
                          : d.id === "pt"
                          ? ptOverride
                          : componentOverrides[d.id] ?? null;

                      const baseVal = d.type === "PERCENT_BASIC" ? calculations.basicSalary : (Number(monthlySalaryInput) || 0);
                      let defVal = 0;
                      if (!d.threshold || baseVal >= d.threshold) {
                        if (d.type === "PERCENT_BASIC") {
                          defVal = Math.round(baseVal * (d.value / 100));
                        } else if (d.type === "PERCENT_CTC") {
                          defVal = Math.round(baseVal * (d.value / 100));
                        } else {
                          defVal = Math.round(d.value);
                        }
                      }

                      return (
                        <div key={d.id}>
                          <label className="block text-[10px] text-slate-600 font-semibold mb-0.5 truncate" title={d.name}>
                            {d.name} {d.type === "PERCENT_BASIC" ? `(${d.value}% Basic)` : d.type === "PERCENT_CTC" ? `(${d.value}% CTC)` : "(₹)"}
                          </label>
                          <input
                            type="number"
                            placeholder={`Auto: ${defVal}`}
                            value={currentVal !== null ? currentVal : ""}
                            onChange={(ev) => {
                              const val = ev.target.value === "" ? null : parseFloat(ev.target.value) || 0;
                              if (d.id === "pf") setPfOverride(val);
                              else if (d.id === "pt") setPtOverride(val);
                              else setComponentOverrides((prev) => ({ ...prev, [d.id]: val }));
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold text-rose-700"
                          />
                        </div>
                      );
                    })}

                    <div>
                      <label className="block text-[10px] text-slate-600 font-semibold mb-0.5">
                        Other Deductions (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={otherDeductions || ""}
                        onChange={(e) => setOtherDeductions(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold text-rose-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Printable Salary Slip Content */}
        <div ref={printRef} className="overflow-y-auto p-6 sm:p-8 space-y-6 print:p-8 print:overflow-visible">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src="/logo.png"
                  alt="NACS Logo"
                  className="w-12 h-12 object-contain rounded-lg border border-slate-200"
                />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                    NACS CONSULTING
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    Corporate Financial, Legal &amp; Taxation Advisory
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Email: accounts@nacsconsulting.com &bull; Portal: taskmanagement.nacs
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block bg-slate-900 text-white font-extrabold text-xs px-3 py-1 rounded uppercase tracking-wider">
                  SALARY VOUCHER
                </div>
                <div className="text-sm font-extrabold text-blue-900 mt-1">
                  Pay Slip for {monthYearString}
                </div>
                <div className="text-[11px] text-slate-500">
                  Generated on: {new Date().toLocaleDateString("en-IN")}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Employee & Bank Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Employee Particulars */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3.5 py-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px] border-b border-slate-200">
                Employee Particulars
              </div>
              <div className="p-3 space-y-1.5 divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500 font-semibold">Employee Name:</span>
                  <span className="font-extrabold text-slate-900">{employee?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-slate-500 font-semibold">Employee User ID:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {employee?.userId || employee?.email?.split("@")[0] || "EMP-01"}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-slate-500 font-semibold">Designation:</span>
                  <span className="font-semibold text-slate-800">{employee?.designation || "Consultant"}</span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-slate-500 font-semibold">Date of Joining:</span>
                  <span className="font-medium text-slate-700">{employee?.joiningDate || "N/A"}</span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-slate-500 font-semibold">PAN Number:</span>
                  <span className="font-mono font-bold text-slate-900 uppercase">
                    {employee?.panNumber || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-slate-500 font-semibold">Phone:</span>
                  <span className="font-medium text-slate-700">{employee?.phone || "N/A"}</span>
                </div>
                {employee?.address && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-500 font-semibold">Address:</span>
                    <span className="font-medium text-slate-700 text-right max-w-xs">{employee.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Particulars */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3.5 py-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px] border-b border-slate-200">
                Bank &amp; Payment Details
              </div>
              <div className="p-3 space-y-1.5 divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500 font-semibold">Emp Name in Bank:</span>
                  <span className="font-extrabold text-slate-900">
                    {employee?.bankAccountName || employee?.name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-slate-500 font-semibold">Bank Name:</span>
                  <span className="font-semibold text-slate-800">{employee?.bankName || "N/A"}</span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-slate-500 font-semibold">Account Number:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {employee?.bankAccountNumber || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-slate-500 font-semibold">IFSC Code:</span>
                  <span className="font-mono font-bold text-blue-700 uppercase">
                    {employee?.bankIfsc || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-slate-500 font-semibold">Branch:</span>
                  <span className="font-medium text-slate-700">{employee?.bankBranch || "Main Branch"}</span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-slate-500 font-semibold">Payment Mode:</span>
                  <span className="font-bold text-emerald-700">Bank Transfer (NEFT/IMPS)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Attendance & Leave Overview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Work Cycle &amp; Attendance Record &bull; {monthYearString}
              </span>
              {loadingMetrics && (
                <span className="text-[11px] text-blue-600 font-semibold animate-pulse">
                  Calculating attendance records...
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-center text-xs">
              <div className="p-2.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Calendar Days</span>
                <span className="text-sm font-extrabold text-slate-800">{totalDaysInMonth}</span>
              </div>
              <div className="p-2.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Working Days</span>
                <span className="text-sm font-extrabold text-slate-800">{workingDays}</span>
              </div>
              <div className="p-2.5 bg-emerald-50/50">
                <span className="text-emerald-700 text-[10px] uppercase font-bold block">Days Present</span>
                <span className="text-sm font-extrabold text-emerald-700">{presentDays}</span>
              </div>
              <div className="p-2.5 bg-blue-50/50">
                <span className="text-blue-700 text-[10px] uppercase font-bold block">Paid Leaves</span>
                <span className="text-sm font-extrabold text-blue-700">{paidLeaves}</span>
              </div>
              <div className="p-2.5 bg-rose-50/50">
                <span className="text-rose-700 text-[10px] uppercase font-bold block">Unpaid / LWP</span>
                <span className="text-sm font-extrabold text-rose-700">{unpaidLeaves}</span>
              </div>
              <div className="p-2.5 bg-purple-50/50">
                <span className="text-purple-700 text-[10px] uppercase font-bold block">Holidays</span>
                <span className="text-sm font-extrabold text-purple-700">{publicHolidays}</span>
              </div>
              <div className="p-2.5 bg-amber-50/50">
                <span className="text-amber-800 text-[10px] uppercase font-bold block">OT Hours</span>
                <span className="text-sm font-extrabold text-amber-800">{overtimeHours} hrs</span>
              </div>
            </div>
          </div>

          {/* Section 3: Dual Column Earnings & Deductions Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4 text-left w-1/3">Earnings Component</th>
                  <th className="py-2.5 px-4 text-right w-1/6">Amount (₹)</th>
                  <th className="py-2.5 px-4 text-left w-1/3 border-l border-slate-700">Deductions Component</th>
                  <th className="py-2.5 px-4 text-right w-1/6">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calculations.pairedRows.map((row, idx) => (
                  <tr key={idx}>
                    {/* Earnings Column */}
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {row.earning ? row.earning.name : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {row.earning ? formatINR(row.earning.amount) : "—"}
                    </td>
                    {/* Deductions Column */}
                    <td className="py-2.5 px-4 font-semibold text-slate-800 border-l border-slate-200">
                      {row.deduction ? row.deduction.name : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                      {row.deduction ? formatINR(row.deduction.amount) : "—"}
                    </td>
                  </tr>
                ))}

                {/* Subtotals */}
                <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-300">
                  <td className="py-2.5 px-4 text-slate-900 uppercase">Gross Total Earnings</td>
                  <td className="py-2.5 px-4 text-right text-emerald-700 text-sm">
                    {formatINR(calculations.grossEarnings)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-900 uppercase border-l border-slate-300">
                    Total Deductions
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-700 text-sm">
                    {formatINR(calculations.totalDeductions)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 4: Net Salary Payable Box */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-500 rounded-2xl p-5 text-center space-y-1.5 shadow-xs">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-blue-800">
              NET SALARY PAYABLE (CREDITED TO BANK)
            </div>
            <div className="text-3xl font-extrabold text-blue-950 tracking-tight">
              {formatINR(calculations.netSalary)}
            </div>
            <div className="text-xs font-semibold text-slate-600 italic">
              Amount in Words: <span className="text-blue-900 font-bold">{calculations.netSalaryInWords}</span>
            </div>
          </div>

          {/* Section 5: Auto Generated Document Notice (Replaces Signatures) */}
          <div className="pt-8 border-t border-slate-300 flex flex-col items-center justify-center text-center space-y-2">
            <div className="inline-flex items-center space-x-2 bg-slate-100 text-slate-800 border border-slate-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>This auto generator &bull; System Verified Document</span>
            </div>
            <p className="text-xs font-bold text-slate-900">
              This is an auto-generated salary slip and does not require a signature.
            </p>
            <p className="text-[11px] text-slate-500">
              Generated automatically by NACS Task &amp; Payroll Management System &bull; Legally valid digital voucher
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
