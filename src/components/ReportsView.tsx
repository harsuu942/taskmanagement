"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { formatDuration } from "@/lib/formatters";
import { exportToExcel } from "@/lib/excelExport";

interface ReportsViewProps {
  currentUser: User | null;
  allUsers: User[];
}

export default function ReportsView({ currentUser, allUsers }: ReportsViewProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [datePreset, setDatePreset] = useState<string>("today");
  const [date, setDate] = useState(todayStr);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("ALL");
  const [activityFilter, setActivityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [employeesList, setEmployeesList] = useState<User[]>([]);

  const [reportsData, setReportsData] = useState<any[]>([]);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

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

  const fetchReports = async () => {
    setLoading(true);
    try {
      const url = `/api/reports/eod?date=${date}${selectedEmployeeId !== "ALL" ? `&employeeId=${selectedEmployeeId}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setReportsData(data.reports || []);
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
  }, [date, selectedEmployeeId]);

  const handleSendToGmail = async (employeeId?: string) => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/reports/eod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employeeId || selectedEmployeeId,
          date,
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

  const handleExportExcel = () => {
    if (filteredReports.length === 0) return;
    exportToExcel(
      `EOD_Report_${date}`,
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
          formatter: (r: any) =>
            formatDuration(
              r.shiftDurationSeconds !== undefined
                ? r.shiftDurationSeconds
                : r.attendance?.durationMinutes
                ? r.attendance.durationMinutes * 60
                : 0
            ),
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
          header: "Task Titles",
          formatter: (r: any) => (r.tasks || []).map((t: any) => t.title).join("; "),
        },
      ],
      filteredReports
    );
  };

  // Client-side filtering for activity status and search query
  const filteredReports = reportsData.filter((rep) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = rep.employee.name.toLowerCase().includes(q);
      const matchEmail = rep.employee.email.toLowerCase().includes(q);
      const matchTask = rep.tasks.some((t: any) => t.title.toLowerCase().includes(q));
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              End of Day (EOD) Reports &amp; Gmail Dispatcher
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated task summary, timer durations, and attendance dispatched directly to Admin Gmail
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Download Excel Button */}
          <button
            disabled={filteredReports.length === 0}
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </button>

          {/* Dispatch Button */}
          <button
            disabled={sending || reportsData.length === 0}
            onClick={() => handleSendToGmail()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? "Sending via Gmail..." : "Send EOD to Admin Gmail"}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filter EOD Reports
            </h4>
          </div>

          {(datePreset !== "today" || selectedEmployeeId !== "ALL" || activityFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                applyDatePreset("today");
                setSelectedEmployeeId("ALL");
                setActivityFilter("ALL");
                setSearchQuery("");
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
              Date:
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

          {/* Employee & Activity Dropdowns & Search */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full lg:w-auto">
            {/* Employee Filter */}
            <select
              value={selectedEmployeeId}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                setPreviewIndex(0);
              }}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none font-medium text-slate-700"
            >
              <option value="ALL">All Employees ({employeesList.length})</option>
              {employeesList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>

            {/* Activity Status Filter */}
            <select
              value={activityFilter}
              onChange={(e) => {
                setActivityFilter(e.target.value);
                setPreviewIndex(0);
              }}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none font-medium text-slate-700"
            >
              <option value="ALL">All Activity</option>
              <option value="WORKED">Active / Logged Time</option>
              <option value="COMPLETED">With Completed Tasks</option>
              <option value="PRESENT">Checked In (Present)</option>
              <option value="ABSENT">On Leave / Absent</option>
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by name or task..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPreviewIndex(0);
              }}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none font-medium text-slate-700 w-44"
            />
          </div>
        </div>
      </div>

      {/* Result Alert */}
      {sendResult && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            sendResult.success
              ? sendResult.warning
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {sendResult.success ? (
              sendResult.warning ? (
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              )
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <div>
              <div className="font-bold">{sendResult.message || "Dispatch completed"}</div>
              {sendResult.success && sendResult.dispatches && (
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Target Recipient: {sendResult.dispatches[0]?.adminRecipient || "Admin"} &bull; {sendResult.dispatches.length} employee report(s)
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSendResult(null)}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/80 hover:bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 transition flex items-center gap-1 shadow-2xs cursor-pointer ml-4 flex-shrink-0"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
            <span>Dismiss</span>
          </button>
        </div>
      )}

      {/* Main Layout: Left Tabs / Right Report Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Employee Selection List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Employee Reports ({filteredReports.length} of {reportsData.length})
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              📅 {date}
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
              Loading report summaries...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
              No employee reports found matching current filters for {date}.
            </div>
          ) : (
            filteredReports.map((rep, idx) => {
              const isSelected = activeReport?.employee?.id === rep.employee.id;
              return (
                <div
                  key={rep.employee.id}
                  onClick={() => setPreviewIndex(idx)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/80 border-blue-400 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 text-sm">{rep.employee.name}</div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rep.attendance.status === "PRESENT"
                          ? "bg-emerald-100 text-emerald-700"
                          : rep.attendance.status === "CHECKED_OUT"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {rep.attendance.status === "PRESENT"
                        ? "Present"
                        : rep.attendance.status === "CHECKED_OUT"
                        ? "Checked Out"
                        : "On Leave"}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-1 truncate">{rep.employee.email}</div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Tasks Worked</span>
                      <div className="font-bold text-slate-800">
                        {rep.totalTasksCompleted} / {rep.tasks.length} done
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Time</span>
                      <div className="font-mono font-bold text-blue-700">{formatDuration(rep.totalActiveSeconds)}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>


        {/* Right: Interactive Report Preview */}
        <div className="lg:col-span-8">
          {activeReport ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Preview Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Live HTML Email Report Preview (Admin Recipient)
                  </span>
                </div>

                <button
                  onClick={() => handleSendToGmail(activeReport.employee.id)}
                  disabled={sending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Send This Report Only</span>
                </button>
              </div>

              {/* Formatted Report Body (matches Gmail email design) */}
              <div className="p-6 space-y-6">
                {/* Email Header Card */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-5 rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Daily Work & Task Report</h2>
                    <p className="text-xs text-blue-100 mt-0.5">
                      Task Management System • End of Day Summary
                    </p>
                  </div>
                  <div className="bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-xs">
                    📅 {activeReport.date}
                  </div>
                </div>

                {/* Employee Info & Attendance Bar */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900">{activeReport.employee.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{activeReport.employee.email} &bull; {activeReport.employee.designation || "Team Member"}</div>
                    </div>

                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ● {activeReport.attendance.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-200 text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Check In</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {activeReport.attendance.checkInTime
                          ? new Date(activeReport.attendance.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "N/A"}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Check Out</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {activeReport.attendance.checkOutTime
                          ? new Date(activeReport.attendance.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : (activeReport.attendance.status === "PRESENT" || activeReport.attendance.status === "ON_BREAK") ? "In Progress" : "N/A"}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Shift Duration</div>
                      <div className="text-xs font-bold text-indigo-700 font-mono mt-0.5">
                        {formatDuration(
                          activeReport.shiftDurationSeconds !== undefined
                            ? activeReport.shiftDurationSeconds
                            : activeReport.attendance.durationMinutes
                            ? activeReport.attendance.durationMinutes * 60
                            : 0
                        )}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Break Time</div>
                      <div className="text-xs font-bold text-amber-600 font-mono mt-0.5">
                        {formatDuration(activeReport.attendance.breakDurationSeconds || 0)}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Task Time Logged</div>
                      <div className="text-xs font-bold text-blue-600 font-mono mt-0.5">
                        {formatDuration(activeReport.totalActiveSeconds)}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Tasks Completed</div>
                      <div className="text-xs font-bold text-emerald-600 mt-0.5">
                        {activeReport.totalTasksCompleted} / {activeReport.tasks.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tasks Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    📋 Task Activity Breakdown ({activeReport.tasks.length})
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Task Name</th>
                          <th className="py-2.5 px-2 text-center">Priority</th>
                          <th className="py-2.5 px-2 text-center">Time Spent</th>
                          <th className="py-2.5 px-2 text-center">Employee Status</th>
                          <th className="py-2.5 px-3 text-center">Admin Approval</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {activeReport.tasks.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">
                              No tasks logged for today.
                            </td>
                          </tr>
                        ) : (
                          activeReport.tasks.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                <div>{t.title}</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Recurrence: {t.recurrence}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                  {t.priority}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-700">
                                {formatDuration(t.durationSeconds)}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                  {t.employeeStatus}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    t.adminStatus === "FINAL_COMPLETED"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : t.adminStatus === "PENDING_REVIEW"
                                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {t.adminStatus === "PENDING_REVIEW"
                                    ? "Pending Review"
                                    : t.adminStatus === "FINAL_COMPLETED"
                                    ? "Final Approved"
                                    : t.adminStatus}
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
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Select an employee report to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
