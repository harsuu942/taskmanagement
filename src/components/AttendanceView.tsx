"use client";

import React, { useState, useEffect } from "react";
import { AttendanceRosterItem, User } from "@/types";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  UserX,
  RefreshCw,
  Coffee,
  Play,
  FileSpreadsheet,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { formatDuration } from "@/lib/formatters";
import { exportToExcel } from "@/lib/excelExport";

interface AttendanceViewProps {
  currentUser: User | null;
  onRefresh: () => void;
}

export default function AttendanceView({ currentUser, onRefresh }: AttendanceViewProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [datePreset, setDatePreset] = useState<string>("today");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  const [roster, setRoster] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalRecords: 0,
    totalEmployees: 0,
    present: 0,
    checkedOut: 0,
    absentOrLeave: 0,
    totalWorkDurationSeconds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserRecord, setCurrentUserRecord] = useState<any | null>(null);

  // Admin Edit Attendance Modal state
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editBreakMinutes, setEditBreakMinutes] = useState(0);
  const [editWorkMinutes, setEditWorkMinutes] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>("PRESENT");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setEditError("");

    if (item.checkInTime) {
      const d = new Date(item.checkInTime);
      setEditCheckIn(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
    } else {
      setEditCheckIn("");
    }

    if (item.checkOutTime) {
      const d = new Date(item.checkOutTime);
      setEditCheckOut(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
    } else {
      setEditCheckOut("");
    }

    setEditBreakMinutes(item.breakDurationSeconds ? Math.floor(item.breakDurationSeconds / 60) : 0);
    setEditWorkMinutes(item.workDurationSeconds ? Math.floor(item.workDurationSeconds / 60) : null);
    setEditStatus(item.status || "PRESENT");
    setEditNotes(item.record?.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setEditSaving(true);
    setEditError("");
    try {
      const date = editingItem.date || startDate;
      let checkInIso = null;
      if (editCheckIn) {
        const [h, m] = editCheckIn.split(":").map(Number);
        const d = new Date(`${date}T00:00:00`);
        d.setHours(h, m, 0, 0);
        checkInIso = d.toISOString();
      }

      let checkOutIso = null;
      if (editCheckOut) {
        const [h, m] = editCheckOut.split(":").map(Number);
        const d = new Date(`${date}T00:00:00`);
        d.setHours(h, m, 0, 0);
        checkOutIso = d.toISOString();
      }

      const breakSecs = editBreakMinutes * 60;
      const workSecs = editWorkMinutes !== null ? editWorkMinutes * 60 : undefined;

      const res = await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.record?.id,
          userId: editingItem.employee.id,
          date,
          checkInTime: checkInIso,
          checkOutTime: checkOutIso,
          breakDurationSeconds: breakSecs,
          workDurationSeconds: workSecs,
          status: editStatus,
          notes: editNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update attendance");
      }

      setEditingItem(null);
      await fetchAttendance();
      onRefresh();
    } catch (err: any) {
      setEditError(err.message || "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  };

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (preset === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "last7") {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      setStartDate(d7.toISOString().slice(0, 10));
      setEndDate(today);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(today);
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const targetEmployeeId = isAdmin ? employeeFilter : (currentUser?.id || "");
      const params = new URLSearchParams({
        startDate,
        endDate,
        employeeId: targetEmployeeId,
        userId: currentUser?.id || "",
      });
      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRoster(data.roster || []);
        if (data.allEmployees) {
          setEmployeesList(data.allEmployees);
        }
        if (data.currentUserAttendance) {
          setCurrentUserRecord(data.currentUserAttendance);
        }
        setSummary(data.summary || {
          totalRecords: 0,
          totalEmployees: 0,
          present: 0,
          checkedOut: 0,
          absentOrLeave: 0,
          totalWorkDurationSeconds: 0,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [startDate, endDate, employeeFilter, currentUser]);


  const handleAction = async (action: "check-in" | "check-out" | "break" | "resume-break") => {
    if (!currentUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          action,
          notes: checkInNotes,
        }),
      });
      if (res.ok) {
        setCheckInNotes("");
        fetchAttendance();
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const myRecord = roster.find((r) => r.employee?.id === currentUser?.id) || currentUserRecord;
  const isOnBreak = myRecord?.status === "ON_BREAK" || !!myRecord?.isOnBreak;
  const isCheckedIn = (myRecord?.status === "PRESENT" || (!myRecord?.checkOutTime && !!myRecord?.checkInTime && myRecord?.status !== "CHECKED_OUT")) && !isOnBreak;
  const isCheckedOut = myRecord?.status === "CHECKED_OUT";

  const handleExportExcel = () => {
    exportToExcel(
      `Attendance_Report_${startDate}_to_${endDate}`,
      [
        { header: "Date", key: "date" },
        { header: "Employee Name", formatter: (r: any) => r.employee?.name || "N/A" },
        { header: "User ID", formatter: (r: any) => r.employee?.userId || r.employee?.email || "" },
        { header: "Designation", formatter: (r: any) => r.employee?.designation || "" },
        { header: "Status", key: "status" },
        {
          header: "Check In Time",
          formatter: (r: any) =>
            r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A",
        },
        {
          header: "Check Out Time",
          formatter: (r: any) =>
            r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : (r.status === "PRESENT" ? "Active" : "N/A"),
        },
        {
          header: "Break Duration",
          formatter: (r: any) => (r.breakDurationSeconds ? formatDuration(r.breakDurationSeconds) : "0m"),
        },
        {
          header: "Net Work Duration",
          formatter: (r: any) => formatDuration(r.workDurationSeconds || 0),
        },
        {
          header: "Notes",
          formatter: (r: any) => r.record?.notes || "",
        },
      ],
      roster
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {isAdmin ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Total Staff</div>
              <div className="text-xl font-bold text-slate-900">{summary.totalEmployees}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Checked In (Active)</div>
              <div className="text-xl font-bold text-emerald-600">{summary.present}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Checked Out (Done)</div>
              <div className="text-xl font-bold text-indigo-600">{summary.checkedOut}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">On Leave / Absent</div>
              <div className="text-xl font-bold text-rose-600">{summary.absentOrLeave}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Shifts Recorded</div>
              <div className="text-xl font-bold text-slate-900">{roster.length}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Today's Status</div>
              <div className="text-sm font-bold text-emerald-600">
                {isCheckedIn ? "Active (Checked In)" : isCheckedOut ? "Shift Done" : "Not Checked In"}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Completed Shifts</div>
              <div className="text-xl font-bold text-indigo-600">
                {roster.filter((r) => r.status === "CHECKED_OUT").length}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Total Work Time</div>
              <div className="text-base font-bold text-teal-700 font-mono">
                {formatDuration(summary.totalWorkDurationSeconds)}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Interactive Personal Check-In / Check-Out Panel */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Personal Attendance Punch Card
            </h3>
          </div>
          <div className="text-xl font-bold text-white mt-1 flex items-center space-x-2">
            <span>{currentUser?.name}</span>
            <span className="text-xs text-slate-400 font-normal">({currentUser?.email})</span>
          </div>

          <div className="mt-3 flex items-center space-x-4 text-xs text-slate-300">
            <div>
              Status:{" "}
              {isOnBreak ? (
                <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                  ☕ On Break
                </span>
              ) : isCheckedIn ? (
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                  ● Checked In (Working)
                </span>
              ) : isCheckedOut ? (
                <span className="text-blue-400 font-bold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/40">
                  ✓ Checked Out
                </span>
              ) : (
                <span className="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/40">
                  ● On Leave / Not Checked In
                </span>
              )}
            </div>
            {myRecord?.checkInTime && (
              <div>
                Check-In:{" "}
                <strong className="text-white">
                  {new Date(myRecord.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </strong>
              </div>
            )}
            {myRecord?.breakDurationSeconds ? (
              <div>
                Total Break:{" "}
                <strong className="text-amber-300">
                  {formatDuration(myRecord.breakDurationSeconds)}
                </strong>
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {isOnBreak ? (
            <>
              <button
                disabled={actionLoading}
                onClick={() => handleAction("resume-break")}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Work</span>
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleAction("check-out")}
                className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-sm transition shadow-lg shadow-rose-500/20 flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Submit Check-Out</span>
              </button>
            </>
          ) : isCheckedIn ? (
            <>
              <button
                disabled={actionLoading}
                onClick={() => handleAction("break")}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2"
                title="Take a break (Pauses work shift)"
              >
                <Coffee className="w-4 h-4" />
                <span>Take Break</span>
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleAction("check-out")}
                className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-sm transition shadow-lg shadow-rose-500/20 flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Submit Check-Out</span>
              </button>
            </>
          ) : (
            <button
              disabled={actionLoading}
              onClick={() => handleAction("check-in")}
              className={`w-full sm:w-auto ${
                isCheckedOut
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                  : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
              } disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center space-x-2 cursor-pointer`}
            >
              <LogIn className="w-4 h-4" />
              <span>{isCheckedOut ? "Re-Check In / Resume Work" : "Submit Check-In"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Attendance Roster Table & Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Filter Controls Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-800">
                {isAdmin ? "Staff Attendance Roster" : "My Attendance History"}
              </h4>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                {roster.length} {roster.length === 1 ? (isAdmin ? "record" : "shift") : (isAdmin ? "records" : "shifts")}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                title="Export current attendance roster to Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download Excel</span>
              </button>
              <button
                onClick={fetchAttendance}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                title="Refresh Roster"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Toolbar: Presets, Date Range & Employee Select (Admin Only) */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-2 border-t border-slate-200">
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                Period:
              </span>
              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "last7", label: "Last 7 Days" },
                { id: "thisMonth", label: "This Month" },
                { id: "custom", label: "Custom Range" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    datePreset === p.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date Pickers & Optional Employee Dropdown (Admin only) */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full lg:w-auto">
              <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setDatePreset("custom");
                    setStartDate(e.target.value);
                  }}
                  className="bg-transparent text-slate-700 outline-none font-medium text-xs"
                />
                <span className="text-[10px] uppercase font-bold text-slate-400">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setDatePreset("custom");
                    setEndDate(e.target.value);
                  }}
                  className="bg-transparent text-slate-700 outline-none font-medium text-xs"
                />
              </div>

              {/* Employee Filter - ONLY visible to Admin */}
              {isAdmin && (
                <div className="flex items-center space-x-1.5">
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="ALL">All Staff ({employeesList.length || summary.totalEmployees})</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clear Filter Button */}
              {(datePreset !== "today" || (isAdmin && employeeFilter !== "ALL")) && (
                <button
                  onClick={() => {
                    applyPreset("today");
                    setEmployeeFilter("ALL");
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-1.5 py-1 whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Date</th>
                {isAdmin && (
                  <>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Login User ID / Gmail</th>
                  </>
                )}
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4">Check-Out Time</th>
                <th className="py-3 px-4">Break Time</th>
                <th className="py-3 px-4">Net Work Time</th>
                <th className="py-3 px-4 text-right">Attendance Status</th>
                {isAdmin && <th className="py-3 px-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 6} className="py-12 text-center text-slate-400">
                    {isAdmin
                      ? "No attendance records found matching the selected filter criteria."
                      : "No personal attendance records found for the selected period."}
                  </td>
                </tr>
              ) : (
                roster.map((item, idx) => (
                  <tr key={`${item.employee?.id || currentUser?.id}-${item.date || idx}`} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {item.date || startDate}
                    </td>

                    {isAdmin && (
                      <>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div className="flex items-center space-x-2">
                            {item.employee?.avatar ? (
                              <img
                                src={item.employee.avatar}
                                alt={item.employee.name}
                                className="w-6 h-6 rounded-full border border-slate-200"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                                {item.employee?.name?.slice(0, 1) || "E"}
                              </div>
                            )}
                            <div>
                              <div>{item.employee?.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {item.employee?.designation || "Team Member"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          <div>
                            {item.employee?.userId && (
                              <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[10px] border border-blue-200 mr-1.5">
                                {item.employee.userId}
                              </span>
                            )}
                            <span>{item.employee?.email}</span>
                          </div>
                        </td>
                      </>
                    )}

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {item.checkInTime ? (
                        new Date(item.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {item.checkOutTime ? (
                        new Date(item.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      ) : item.status === "PRESENT" ? (
                        <span className="text-emerald-600 font-bold">Active Now</span>
                      ) : item.status === "ON_BREAK" ? (
                        <span className="text-amber-600 font-bold">On Break</span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600">
                      {item.breakDurationSeconds ? formatDuration(item.breakDurationSeconds) : "-"}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {formatDuration(item.workDurationSeconds)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {item.status === "ON_BREAK" ? (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-amber-300">
                          ☕ On Break
                        </span>
                      ) : item.status === "PRESENT" ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-emerald-200">
                          ● Present (Checked In)
                        </span>
                      ) : item.status === "CHECKED_OUT" ? (
                        <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-blue-200">
                          ✓ Checked Out
                        </span>
                      ) : item.status === "ON_LEAVE" ? (
                        <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-purple-200">
                          🌴 Approved Leave
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-rose-200">
                          ● Absent
                        </span>
                      )}
                    </td>

                    {isAdmin && (
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="Edit staff attendance times or status"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" />
                          <span>Edit</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Edit Attendance Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="font-extrabold text-base">Edit Staff Attendance</h3>
                  <p className="text-xs text-blue-100">
                    {editingItem.employee.name} • {editingItem.date || startDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {editError}
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Attendance Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PRESENT">● Present (Checked In / Active)</option>
                  <option value="ON_BREAK">☕ On Break</option>
                  <option value="CHECKED_OUT">✓ Checked Out</option>
                  <option value="ABSENT_LEAVE">● Absent / On Leave</option>
                </select>
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Check-In Time
                  </label>
                  <input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Check-Out Time
                  </label>
                  <input
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    placeholder="HH:mm"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Break and Net Work Minutes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Break Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editBreakMinutes}
                    onChange={(e) => setEditBreakMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Work Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Auto-calculated"
                    value={editWorkMinutes !== null ? editWorkMinutes : ""}
                    onChange={(e) => setEditWorkMinutes(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Leave blank to auto-calculate</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Admin Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Adjusted check-in time upon request"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={handleSaveEdit}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-md shadow-blue-500/20 flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
