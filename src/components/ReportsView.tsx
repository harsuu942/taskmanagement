"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User } from "@/types";
import {
  Mail,
  Send,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Eye,
  RefreshCw,
  Sparkles,
  Download,
  X,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Briefcase,
  Check,
  Search,
  Filter,
} from "lucide-react";
import { formatDuration } from "@/lib/formatters";
import { exportToExcel } from "@/lib/excelExport";

interface ReportsViewProps {
  currentUser: User | null;
  allUsers: User[];
}

export default function ReportsView({ currentUser, allUsers }: ReportsViewProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Active Report Tab: "eod" | "client" | "budget" | "employee_matrix"
  const [activeTab, setActiveTab] = useState<"eod" | "client" | "budget" | "employee_matrix">("eod");

  // Date selection state
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [datePreset, setDatePreset] = useState<string>("today");
  const [date, setDate] = useState(todayStr);

  // Custom date range state (defaults to start of month to today)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(todayStr);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("ALL");
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");
  const [activityFilter, setActivityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [employeesList, setEmployeesList] = useState<User[]>([]);

  // Server data
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [clientReports, setClientReports] = useState<any[]>([]);
  const [budgetVsActual, setBudgetVsActual] = useState<any[]>([]);
  const [employeeTaskMatrix, setEmployeeTaskMatrix] = useState<any[]>([]);
  const [savedReports, setSavedReports] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Sorting state for Employee Task Matrix
  const [sortField, setSortField] = useState<"employeeName" | "clientName" | "actualHours" | "billableHours" | "date">("date");
  const [sortAsc, setSortAsc] = useState(false);

  // Sorting state for Budget vs Actual
  const [budgetSortField, setBudgetSortField] = useState<"varianceHours" | "actualHours" | "billableHours" | "clientName">("varianceHours");
  const [budgetSortAsc, setBudgetSortAsc] = useState(true);

  // Ensure employee list is populated
  useEffect(() => {
    const emps = allUsers.filter((u) => u.role === "EMPLOYEE");
    if (emps.length > 0) {
      setEmployeesList(emps);
    } else {
      fetch("/api/employees")
        .then((res) => res.json())
        .then((d) => {
          if (d.employees) setEmployeesList(d.employees);
        })
        .catch(console.error);
    }
  }, [allUsers]);

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === "today") {
      setDate(now.toISOString().slice(0, 10));
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setDate(y.toISOString().slice(0, 10));
    } else if (preset === "2daysAgo") {
      const d = new Date(now);
      d.setDate(d.getDate() - 2);
      setDate(d.toISOString().slice(0, 10));
    }
  };

  const applyRangePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    setEndDate(today);

    if (preset === "thisWeek") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      setStartDate(monday.toISOString().slice(0, 10));
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
    } else if (preset === "last30Days") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().slice(0, 10));
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const url =
        dateMode === "range"
          ? `/api/reports/eod?startDate=${startDate}&endDate=${endDate}${
              selectedEmployeeId !== "ALL" ? `&employeeId=${selectedEmployeeId}` : ""
            }`
          : `/api/reports/eod?date=${date}${
              selectedEmployeeId !== "ALL" ? `&employeeId=${selectedEmployeeId}` : ""
            }`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setReportsData(data.reports || []);
        setClientReports(data.clientReports || []);
        setBudgetVsActual(data.budgetVsActual || []);
        setEmployeeTaskMatrix(data.employeeTaskMatrix || []);
        setSavedReports(data.savedReports || []);
        setPreviewIndex(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateMode, date, startDate, endDate, selectedEmployeeId]);

  const handleSendToGmail = async (employeeId?: string) => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/reports/eod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employeeId || selectedEmployeeId,
          date: dateMode === "range" ? startDate : date,
        }),
      });
      const data = await res.json();
      setSendResult(data);
      fetchReports();
    } catch (e: any) {
      setSendResult({ success: false, error: e.message });
    } finally {
      setSending(false);
    }
  };

  // Export Tab 1: EOD Reports Excel
  const handleExportExcel = () => {
    if (filteredReports.length === 0) return;
    const filename =
      dateMode === "range"
        ? `NACS_Report_${startDate}_to_${endDate}`
        : `NACS_EOD_Report_${date}`;
    exportToExcel(
      filename,
      [
        { header: "Employee Name", formatter: (r: any) => r.employee?.name || "" },
        { header: "Employee Email", formatter: (r: any) => r.employee?.email || "" },
        { header: "Designation", formatter: (r: any) => r.employee?.designation || "" },
        { header: "Date", key: "date" },
        { header: "Attendance Status", formatter: (r: any) => r.attendance?.status || "" },
        {
          header: "Check In",
          formatter: (r: any) =>
            r.attendance?.checkInTime
              ? new Date(r.attendance.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "N/A",
        },
        {
          header: "Check Out",
          formatter: (r: any) =>
            r.attendance?.checkOutTime
              ? new Date(r.attendance.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : r.attendance?.status === "PRESENT" || r.attendance?.status === "ON_BREAK"
              ? "In Progress"
              : "N/A",
        },
        {
          header: "Shift Duration",
          formatter: (r: any) => formatDuration(r.shiftDurationSeconds || 0),
        },
        {
          header: "Break Duration",
          formatter: (r: any) => formatDuration(r.attendance?.breakDurationSeconds || 0),
        },
        {
          header: "Task Time Logged",
          formatter: (r: any) => formatDuration(r.totalActiveSeconds || 0),
        },
        {
          header: "Tasks Completed",
          formatter: (r: any) => `${r.totalTasksCompleted || 0} / ${r.tasks?.length || 0}`,
        },
        {
          header: "Task Titles & Clients",
          formatter: (r: any) =>
            (r.tasks || []).map((t: any) => `${t.title} [Client: ${t.clientName || "General"}]`).join("; "),
        },
      ],
      filteredReports
    );
  };

  // Export Tab 2: Client-Wise Report Excel
  const handleExportClientExcel = () => {
    if (filteredClientReports.length === 0) return;
    exportToExcel(
      `NACS_Client_Wise_Report_${dateMode === "range" ? `${startDate}_to_${endDate}` : date}`,
      [
        { header: "Client Name", key: "clientName" },
        { header: "Tasks Count", key: "tasksCount" },
        { header: "Billable Hours (Budget)", key: "totalBillableHours" },
        { header: "Actual Hours Logged", key: "totalActualHours" },
        { header: "Variance (Hrs)", key: "varianceHours" },
        { header: "Assigned Staff", formatter: (r: any) => (r.assignedEmployees || []).join(", ") },
      ],
      filteredClientReports
    );
  };

  // Export Tab 3: Budget vs Actual Excel
  const handleExportBudgetExcel = () => {
    if (filteredBudgetVsActual.length === 0) return;
    exportToExcel(
      `NACS_Budget_vs_Actual_${dateMode === "range" ? `${startDate}_to_${endDate}` : date}`,
      [
        { header: "Task Title", key: "title" },
        { header: "Client Name", key: "clientName" },
        { header: "Employee Name", key: "employeeName" },
        { header: "Date", key: "date" },
        { header: "Budgeted / Billable Hours", key: "billableHours" },
        { header: "Actual Hours Logged", key: "actualHours" },
        { header: "Variance (Hrs)", key: "varianceHours" },
        { header: "Budget Status", key: "status" },
      ],
      filteredBudgetVsActual
    );
  };

  // Export Tab 4: Employee Task Matrix Excel
  const handleExportEmployeeMatrixExcel = () => {
    if (sortedEmployeeMatrix.length === 0) return;
    exportToExcel(
      `NACS_Employee_Tasks_Matrix_${dateMode === "range" ? `${startDate}_to_${endDate}` : date}`,
      [
        { header: "Employee Name", key: "employeeName" },
        { header: "Employee Email", key: "employeeEmail" },
        { header: "Client Name", key: "clientName" },
        { header: "Task Title", key: "title" },
        { header: "Date", key: "date" },
        { header: "Billable Hours", key: "billableHours" },
        { header: "Actual Hours Logged", key: "actualHours" },
        { header: "Employee Status", key: "employeeStatus" },
        { header: "Admin Status", key: "adminStatus" },
      ],
      sortedEmployeeMatrix
    );
  };

  // Filtered EOD Reports
  const filteredReports = reportsData.filter((rep) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = rep.employee.name.toLowerCase().includes(q);
      const matchEmail = rep.employee.email.toLowerCase().includes(q);
      const matchTask = rep.tasks.some(
        (t: any) =>
          t.title.toLowerCase().includes(q) ||
          (t.clientName && t.clientName.toLowerCase().includes(q))
      );
      if (!matchName && !matchEmail && !matchTask) return false;
    }

    if (activityFilter === "WORKED" && rep.totalActiveSeconds === 0 && rep.tasks.length === 0) {
      return false;
    }
    if (activityFilter === "COMPLETED" && rep.totalTasksCompleted === 0) {
      return false;
    }
    if (activityFilter === "PRESENT" && rep.attendance.status !== "PRESENT") {
      return false;
    }
    if (activityFilter === "ABSENT" && rep.attendance.status !== "ABSENT_LEAVE") {
      return false;
    }

    return true;
  });

  const activeReport = filteredReports[previewIndex] || filteredReports[0] || null;

  // Filtered Client Reports
  const filteredClientReports = useMemo(() => {
    return clientReports.filter((c) => {
      if (selectedClientId !== "ALL" && c.clientName !== selectedClientId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchClient = c.clientName.toLowerCase().includes(q);
        const matchEmp = (c.assignedEmployees || []).some((e: string) => e.toLowerCase().includes(q));
        if (!matchClient && !matchEmp) return false;
      }
      return true;
    });
  }, [clientReports, selectedClientId, searchQuery]);

  // Unique client names for dropdown
  const uniqueClientNames = useMemo(() => {
    const set = new Set<string>();
    clientReports.forEach((c) => set.add(c.clientName));
    return Array.from(set);
  }, [clientReports]);

  // Filtered Budget vs Actual
  const filteredBudgetVsActual = useMemo(() => {
    let list = budgetVsActual.filter((item) => {
      if (selectedClientId !== "ALL" && item.clientName !== selectedClientId) return false;
      if (selectedEmployeeId !== "ALL" && item.employeeName !== allUsers.find((u) => u.id === selectedEmployeeId)?.name) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !item.title.toLowerCase().includes(q) &&
          !item.clientName.toLowerCase().includes(q) &&
          !item.employeeName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    list.sort((a, b) => {
      let valA = a[budgetSortField];
      let valB = b[budgetSortField];
      if (typeof valA === "string") {
        return budgetSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return budgetSortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [budgetVsActual, selectedClientId, selectedEmployeeId, searchQuery, budgetSortField, budgetSortAsc, allUsers]);

  // Sorted & Filtered Employee Task Matrix
  const sortedEmployeeMatrix = useMemo(() => {
    let list = employeeTaskMatrix.filter((item) => {
      if (selectedClientId !== "ALL" && item.clientName !== selectedClientId) return false;
      if (selectedEmployeeId !== "ALL" && item.employeeName !== allUsers.find((u) => u.id === selectedEmployeeId)?.name) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !item.title.toLowerCase().includes(q) &&
          !item.clientName.toLowerCase().includes(q) &&
          !item.employeeName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [employeeTaskMatrix, selectedClientId, selectedEmployeeId, searchQuery, sortField, sortAsc, allUsers]);

  const toggleSort = (field: "employeeName" | "clientName" | "actualHours" | "billableHours" | "date") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Reports &amp; Analytics Dashboard
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Task execution logs, client billable breakdown, budget vs actual comparison, and attendance analytics.
          </p>
        </div>

        {/* Global Export & Action Controls */}
        <div className="flex items-center space-x-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {activeTab === "eod" && (
            <>
              <button
                disabled={filteredReports.length === 0}
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export EOD Excel</span>
              </button>

              <button
                disabled={sending || reportsData.length === 0}
                onClick={() => handleSendToGmail()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? "Sending..." : "Send to Gmail"}</span>
              </button>
            </>
          )}

          {activeTab === "client" && (
            <button
              disabled={filteredClientReports.length === 0}
              onClick={handleExportClientExcel}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Client Report</span>
            </button>
          )}

          {activeTab === "budget" && (
            <button
              disabled={filteredBudgetVsActual.length === 0}
              onClick={handleExportBudgetExcel}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Budget Excel</span>
            </button>
          )}

          {activeTab === "employee_matrix" && (
            <button
              disabled={sortedEmployeeMatrix.length === 0}
              onClick={handleExportEmployeeMatrixExcel}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Matrix Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-2xs gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab("eod")}
          className={`py-2 px-4 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === "eod"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Attendance &amp; EOD Reports</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("client");
            if (dateMode === "single") {
              setDateMode("range");
              applyRangePreset("thisMonth");
            }
          }}
          className={`py-2 px-4 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === "client"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Client-Wise Report</span>
        </button>

        <button
          onClick={() => setActiveTab("budget")}
          className={`py-2 px-4 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === "budget"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Budget vs Actual Hours</span>
        </button>

        <button
          onClick={() => setActiveTab("employee_matrix")}
          className={`py-2 px-4 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === "employee_matrix"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Employee Tasks &amp; Hours Matrix</span>
        </button>
      </div>

      {/* Unified Filter Toolbar Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filter Reports &bull; Date &amp; Scope Selection
            </h4>
          </div>

          {(datePreset !== "today" || selectedEmployeeId !== "ALL" || selectedClientId !== "ALL" || activityFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                applyDatePreset("today");
                setSelectedEmployeeId("ALL");
                setSelectedClientId("ALL");
                setActivityFilter("ALL");
                setSearchQuery("");
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
          {/* Mode Switcher: Single Day vs Custom Date Range */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setDateMode("single");
                  setDatePreset("today");
                  setDate(todayStr);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  dateMode === "single"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📅 Single Day Report
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateMode("range");
                  setDatePreset("thisMonth");
                  applyRangePreset("thisMonth");
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  dateMode === "range"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🗓️ Custom Date Range (Multi-Day Extract)
              </button>
            </div>

            {dateMode === "range" && (
              <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold">
                Range Active: {startDate} ➔ {endDate}
              </span>
            )}
          </div>

          {/* Date Pickers */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            {dateMode === "single" ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                  Day:
                </span>
                {[
                  { id: "today", label: "Today" },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "2daysAgo", label: "2 Days Ago" },
                  { id: "custom", label: "Custom Date" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyDatePreset(p.id)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      datePreset === p.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDatePreset("custom");
                    setDate(e.target.value);
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none font-medium ml-1"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                  Range:
                </span>
                {[
                  { id: "thisWeek", label: "This Week" },
                  { id: "thisMonth", label: "This Month" },
                  { id: "last30Days", label: "Last 30 Days" },
                  { id: "customRange", label: "Custom Range" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyRangePreset(p.id)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      datePreset === p.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setDatePreset("customRange");
                      setStartDate(e.target.value);
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none font-medium"
                  />
                  <span className="text-slate-400 font-bold">&rarr;</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setDatePreset("customRange");
                      setEndDate(e.target.value);
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none font-medium"
                  />
                </div>
              </div>
            )}

            {/* Scope Filter Dropdowns & Search */}
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              {/* Employee Selector */}
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none font-medium"
              >
                <option value="ALL">All Employees</option>
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>

              {/* Client Selector (for client, budget, matrix tabs) */}
              {(activeTab === "client" || activeTab === "budget" || activeTab === "employee_matrix") && (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none font-medium"
                >
                  <option value="ALL">All Clients</option>
                  {uniqueClientNames.map((cName) => (
                    <option key={cName} value={cName}>
                      {cName}
                    </option>
                  ))}
                </select>
              )}

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tasks, clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none w-44"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ATTENDANCE & EOD REPORTS */}
      {/* ========================================================================= */}
      {activeTab === "eod" && (
        <div className="space-y-6">
          {/* Dispatch Feedback Alert */}
          {sendResult && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center justify-between ${
                sendResult.success
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              <div className="flex items-center space-x-2">
                {sendResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                )}
                <span>
                  {sendResult.message || (sendResult.success ? "Reports dispatched successfully!" : sendResult.error)}
                </span>
              </div>
              <button onClick={() => setSendResult(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Content Area */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs">Loading EOD reports for the selected scope...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 text-sm">No report records found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No attendance punches or task logs match the selected date ({dateMode === "range" ? `${startDate} to ${endDate}` : date}).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Employee Report Cards List */}
              <div className="lg:col-span-1 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                  <span>Reports ({filteredReports.length})</span>
                  <span>Total Logged</span>
                </div>

                <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                  {filteredReports.map((rep, idx) => {
                    const isSelected = idx === previewIndex;
                    return (
                      <div
                        key={`${rep.employee.id}-${rep.date}`}
                        onClick={() => setPreviewIndex(idx)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                          isSelected
                            ? "bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {rep.employee.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {rep.date} &bull; {rep.employee.designation || "Staff"}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                rep.attendance.status === "PRESENT"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : rep.attendance.status.startsWith("PUBLIC_HOLIDAY")
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {rep.attendance.status}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {rep.tasks.length} task(s)
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-blue-700 text-xs block">
                            {formatDuration(rep.totalActiveSeconds)}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                            {rep.totalTasksCompleted} completed
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Detailed Report Preview */}
              <div className="lg:col-span-2">
                {activeReport ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                    {/* Report Header */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-extrabold text-slate-900">
                            {activeReport.employee.name}
                          </h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {activeReport.employee.designation || "Staff"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Date: <span className="font-bold text-slate-800">{activeReport.date}</span> &bull; {activeReport.employee.email}
                        </p>
                      </div>

                      <button
                        onClick={() => handleSendToGmail(activeReport.employee.id)}
                        disabled={sending}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Individual EOD</span>
                      </button>
                    </div>

                    {/* Attendance KPI Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Attendance</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-1 block">{activeReport.attendance.status}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Shift Duration</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-1 block">{formatDuration(activeReport.shiftDurationSeconds)}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Task Time Logged</span>
                        <span className="text-xs font-extrabold text-blue-700 mt-1 block">{formatDuration(activeReport.totalActiveSeconds)}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tasks Completed</span>
                        <span className="text-xs font-extrabold text-emerald-700 mt-1 block">
                          {activeReport.totalTasksCompleted} / {activeReport.tasks.length}
                        </span>
                      </div>
                    </div>

                    {/* Tasks Detail Table */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                        Tasks Worked On ({activeReport.tasks.length})
                      </h4>
                      {activeReport.tasks.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">
                          No tasks logged or worked on by this employee on this date.
                        </p>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">Task Title</th>
                                <th className="py-2.5 px-3">Client</th>
                                <th className="py-2.5 px-3 text-center">Duration</th>
                                <th className="py-2.5 px-3 text-center">Billable</th>
                                <th className="py-2.5 px-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activeReport.tasks.map((t: any) => (
                                <tr key={t.id} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                                    {t.title}
                                    <span className="block text-[10px] text-slate-400 font-normal">
                                      {t.recurrence} &bull; {t.priority}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 font-medium">
                                    {t.clientName || "General"}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-blue-700 text-center">
                                    {formatDuration(t.durationSeconds)}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-800 text-center">
                                    {t.billableHours ? `${t.billableHours} hrs` : "&mdash;"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        t.employeeStatus === "COMPLETED"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : t.employeeStatus === "IN_PROGRESS"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {t.employeeStatus}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CLIENT-WISE REPORT */}
      {/* ========================================================================= */}
      {activeTab === "client" && (
        <div className="space-y-6">
          {/* Client Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Clients
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {filteredClientReports.length}
              </span>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Tasks
              </span>
              <span className="text-2xl font-extrabold text-blue-700 mt-1 block">
                {filteredClientReports.reduce((acc, c) => acc + c.tasksCount, 0)}
              </span>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Budgeted / Billable Hours
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
                {filteredClientReports.reduce((acc, c) => acc + c.totalBillableHours, 0).toFixed(1)} hrs
              </span>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Actual Hours Logged
              </span>
              <span className="text-2xl font-extrabold text-indigo-700 mt-1 block">
                {filteredClientReports.reduce((acc, c) => acc + c.totalActualHours, 0).toFixed(1)} hrs
              </span>
            </div>
          </div>

          {/* Client Table */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Client Wise Breakdown &bull; {dateMode === "range" ? `${startDate} to ${endDate}` : date}
              </h4>
              <span className="text-xs text-slate-500 font-semibold">
                Showing {filteredClientReports.length} client(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Client Name</th>
                    <th className="py-3 px-4 text-center">Tasks Worked</th>
                    <th className="py-3 px-4 text-center">Billable / Budget (Hrs)</th>
                    <th className="py-3 px-4 text-center">Actual Hours Logged</th>
                    <th className="py-3 px-4 text-center">Variance (Hrs)</th>
                    <th className="py-3 px-4">Assigned Team Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredClientReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No client task logs found for the selected dates.
                      </td>
                    </tr>
                  ) : (
                    filteredClientReports.map((c) => {
                      const isUnderBudget = c.varianceHours >= 0;
                      return (
                        <tr key={c.clientName} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-4 h-4 text-blue-600" />
                              <span>{c.clientName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {c.tasksCount}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {c.totalBillableHours} hrs
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                            {c.totalActualHours} hrs
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                                isUnderBudget
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {c.varianceHours > 0 ? `+${c.varianceHours}` : c.varianceHours} hrs
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {c.assignedEmployees && c.assignedEmployees.length > 0
                              ? c.assignedEmployees.join(", ")
                              : "&mdash;"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BUDGET VS ACTUAL HOURS */}
      {/* ========================================================================= */}
      {activeTab === "budget" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Budgeted Hours
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {filteredBudgetVsActual.reduce((acc, t) => acc + (t.billableHours || 0), 0).toFixed(1)} hrs
              </span>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Actual Hours
              </span>
              <span className="text-2xl font-extrabold text-blue-700 mt-1 block">
                {filteredBudgetVsActual.reduce((acc, t) => acc + t.actualHours, 0).toFixed(1)} hrs
              </span>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Under Budget Tasks
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
                {filteredBudgetVsActual.filter((t) => t.status === "UNDER_BUDGET").length}
              </span>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Over Budget Tasks
              </span>
              <span className="text-2xl font-extrabold text-rose-700 mt-1 block">
                {filteredBudgetVsActual.filter((t) => t.status === "OVER_BUDGET").length}
              </span>
            </div>
          </div>

          {/* Budget Table */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Budget vs Actual Comparison Table
              </h4>
              <span className="text-xs text-slate-500 font-semibold">
                Showing {filteredBudgetVsActual.length} task log(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Task Title</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4 text-center">Date</th>
                    <th className="py-3 px-4 text-center">Budgeted (Hrs)</th>
                    <th className="py-3 px-4 text-center">Actual (Hrs)</th>
                    <th className="py-3 px-4 text-center">Variance</th>
                    <th className="py-3 px-4 text-right">Health Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBudgetVsActual.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No task entries match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBudgetVsActual.map((item) => {
                      const isUnder = item.status === "UNDER_BUDGET";
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {item.title}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {item.clientName}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-semibold">
                            {item.employeeName}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                            {item.date}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {item.billableHours}h
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                            {item.actualHours}h
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                                isUnder
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {item.varianceHours > 0 ? `+${item.varianceHours}` : item.varianceHours}h
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                isUnder
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {isUnder ? "Within Budget" : "Over Budget"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EMPLOYEE TASKS & HOURS MATRIX (MULTI-COLUMN SORTING) */}
      {/* ========================================================================= */}
      {activeTab === "employee_matrix" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Employee Tasks &amp; Hours Matrix
                </h4>
                <p className="text-[11px] text-slate-500">
                  Click column headers (Employee, Client, Date, Billable, Actual) to sort.
                </p>
              </div>
              <span className="text-xs text-slate-600 font-bold bg-white border border-slate-200 px-3 py-1 rounded-lg">
                Total Records: {sortedEmployeeMatrix.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th
                      onClick={() => toggleSort("employeeName")}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition select-none"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Employee</span>
                        {sortField === "employeeName" ? (
                          sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort("clientName")}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition select-none"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Client</span>
                        {sortField === "clientName" ? (
                          sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-4">Task Title</th>

                    <th
                      onClick={() => toggleSort("date")}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition text-center select-none"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Date</span>
                        {sortField === "date" ? (
                          sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort("billableHours")}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition text-center select-none"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Billable (Budget)</span>
                        {sortField === "billableHours" ? (
                          sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort("actualHours")}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition text-center select-none"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Actual Hours</span>
                        {sortField === "actualHours" ? (
                          sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedEmployeeMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No employee task records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    sortedEmployeeMatrix.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {item.employeeName}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {item.employeeEmail}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">
                          {item.clientName}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.title}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 font-mono text-[11px]">
                          {item.date}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {item.billableHours ? `${item.billableHours}h` : "&mdash;"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                          {item.actualHours}h
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.employeeStatus === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.employeeStatus === "IN_PROGRESS"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.employeeStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
