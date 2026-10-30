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
  FileText,
  Trash2,
  Plus,
  Upload,
  Download,
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

  // Holiday Management Modal state
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidaysList, setHolidaysList] = useState<any[]>([]);
  const [holidayTab, setHolidayTab] = useState<"list" | "add" | "import">("list");
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDesc, setNewHolidayDesc] = useState("");
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [holidayError, setHolidayError] = useState("");
  const [importText, setImportText] = useState("");
  const [parsedImportRows, setParsedImportRows] = useState<Array<{ date: string; name: string; description?: string }>>([]);

  const fetchHolidays = async () => {
    try {
      const res = await fetch("/api/holidays");
      const data = await res.json();
      if (res.ok) {
        setHolidaysList(data.holidays || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) {
      setHolidayError("Please provide both Date and Holiday Name.");
      return;
    }
    setHolidaySaving(true);
    setHolidayError("");
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newHolidayDate,
          name: newHolidayName.trim(),
          description: newHolidayDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add holiday");
      setNewHolidayDate("");
      setNewHolidayName("");
      setNewHolidayDesc("");
      setHolidayTab("list");
      await fetchHolidays();
      await fetchAttendance();
    } catch (err: any) {
      setHolidayError(err.message || "Failed to add holiday");
    } finally {
      setHolidaySaving(false);
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the holiday "${name}"?`)) return;
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to delete holiday");
      await fetchHolidays();
      await fetchAttendance();
    } catch (err: any) {
      alert(err.message || "Error deleting holiday");
    }
  };

  const handleDownloadSampleHolidays = () => {
    exportToExcel(
      "NACS_Holidays_Sample_Template",
      [
        { header: "Date", key: "date" },
        { header: "Holiday Name", key: "name" },
        { header: "Description", key: "description" },
      ],
      [
        { date: "2026-01-26", name: "Republic Day", description: "National Holiday" },
        { date: "2026-08-15", name: "Independence Day", description: "National Holiday" },
        { date: "2026-10-02", name: "Gandhi Jayanti", description: "National Holiday" },
        { date: "2026-11-08", name: "Diwali", description: "Festival of Lights" },
      ]
    );
  };

  const parseHolidayCsvText = (text: string) => {
    setImportText(text);
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const rows: Array<{ date: string; name: string; description?: string }> = [];

    for (const line of lines) {
      if (line.toLowerCase().includes("date") && (line.toLowerCase().includes("holiday") || line.toLowerCase().includes("name"))) {
        continue;
      }
      let parts = line.split(",").map((s) => s.replace(/^["']|["']$/g, "").trim());
      if (parts.length < 2) {
        parts = line.split("\t").map((s) => s.trim());
      }
      if (parts.length >= 2) {
        const rawDate = parts[0];
        const rawName = parts[1];
        const rawDesc = parts[2] || "";

        const dateMatch = rawDate.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/);
        if (dateMatch && rawName) {
          const isoDate = dateMatch[1].replace(/[/.]/g, "-");
          rows.push({
            date: isoDate,
            name: rawName,
            description: rawDesc || undefined,
          });
        }
      } else {
        const match = line.match(/^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})[\s,]+(.+)$/);
        if (match) {
          rows.push({
            date: match[1].replace(/[/.]/g, "-"),
            name: match[2].trim(),
          });
        }
      }
    }
    setParsedImportRows(rows);
  };

  const handleBulkImportHolidays = async () => {
    if (parsedImportRows.length === 0) {
      setHolidayError("No valid holiday records parsed to import.");
      return;
    }
    setHolidaySaving(true);
    setHolidayError("");
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holidays: parsedImportRows,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import holidays");
      alert(data.message || `Successfully imported ${data.count} holidays.`);
      setImportText("");
      setParsedImportRows([]);
      setHolidayTab("list");
      await fetchHolidays();
      await fetchAttendance();
    } catch (err: any) {
      setHolidayError(err.message || "Failed to import holidays");
    } finally {
      setHolidaySaving(false);
    }
  };

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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Personal Attendance Punch Card
              </div>
              <div className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <span>{currentUser?.name}</span>
                <span className="text-xs text-slate-500 font-normal">({currentUser?.email})</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center space-x-4 text-xs text-slate-600 flex-wrap gap-y-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Status:</span>
              {isOnBreak ? (
                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  On Break
                </span>
              ) : isCheckedIn ? (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ● Checked In (Working)
                </span>
              ) : isCheckedOut ? (
                <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  ✓ Checked Out
                </span>
              ) : myRecord?.status === "PUBLIC_HOLIDAY" ? (
                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Public Holiday{myRecord.holidayName ? `: ${myRecord.holidayName}` : ""}
                </span>
              ) : myRecord?.status === "ON_LEAVE" ? (
                <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Approved Leave
                </span>
              ) : (
                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  ● Not Checked In
                </span>
              )}
            </div>
            {myRecord?.checkInTime && (
              <div>
                <span className="text-slate-500">Check-In: </span>
                <strong className="text-slate-900 font-semibold">
                  {new Date(myRecord.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </strong>
              </div>
            )}
            {myRecord?.breakDurationSeconds ? (
              <div>
                <span className="text-slate-500">Total Break: </span>
                <strong className="text-amber-700 font-semibold">
                  {formatDuration(myRecord.breakDurationSeconds)}
                </strong>
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Buttons: Check In, Break, Check Out (with Enabled/Disabled states) */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          {/* Button 1: Check In */}
          <button
            disabled={actionLoading || isCheckedIn || isOnBreak}
            onClick={() => handleAction("check-in")}
            className={`w-full sm:w-auto font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 ${
              isCheckedIn || isOnBreak
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95"
            }`}
            title={
              isCheckedIn
                ? "Already checked in"
                : isOnBreak
                ? "Currently on break"
                : isCheckedOut
                ? "Click to re-check in & resume work"
                : "Submit check-in for today"
            }
          >
            <LogIn className="w-4 h-4" />
            <span>{isCheckedIn ? "Checked In" : isCheckedOut ? "Re-Check In" : "Check In"}</span>
          </button>

          {/* Button 2: Break / Resume */}
          <button
            disabled={actionLoading || ((!isCheckedIn && !isOnBreak) || isCheckedOut)}
            onClick={() => (isOnBreak ? handleAction("resume-break") : handleAction("break"))}
            className={`w-full sm:w-auto font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 ${
              (!isCheckedIn && !isOnBreak) || isCheckedOut
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : isOnBreak
                ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs animate-pulse active:scale-95"
                : "bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-xs active:scale-95"
            }`}
            title={
              isOnBreak
                ? "Click to resume work from break"
                : isCheckedIn
                ? "Take a break (pauses shift)"
                : "Must check in before taking a break"
            }
          >
            {isOnBreak ? (
              <Play className="w-4 h-4 fill-current" />
            ) : (
              <Coffee className="w-4 h-4" />
            )}
            <span>{isOnBreak ? "Resume Work" : "Break"}</span>
          </button>

          {/* Button 3: Check Out */}
          <button
            disabled={actionLoading || (!isCheckedIn && !isOnBreak)}
            onClick={() => handleAction("check-out")}
            className={`w-full sm:w-auto font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 ${
              !isCheckedIn && !isOnBreak
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs active:scale-95"
            }`}
            title={
              !isCheckedIn && !isOnBreak
                ? "Not checked in"
                : "Submit check-out and complete workday"
            }
          >
            <LogOut className="w-4 h-4" />
            <span>Check Out</span>
          </button>
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
                {isAdmin ? "Staff Attendance Register" : "My Attendance History"}
              </h4>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                {roster.length} {roster.length === 1 ? (isAdmin ? "record" : "shift") : (isAdmin ? "records" : "shifts")}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {isAdmin && (
                <button
                  onClick={() => {
                    setIsHolidayModalOpen(true);
                    fetchHolidays();
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Manage Public Holidays & Calendar (Excel/Manual)"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Holiday Calendar</span>
                </button>
              )}
              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                title="Export current attendance register to Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download Excel</span>
              </button>
              <button
                onClick={fetchAttendance}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                title="Refresh Register"
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
                      ) : item.status === "PUBLIC_HOLIDAY" ? (
                        <span className="bg-amber-50 text-amber-900 font-bold px-2.5 py-1 rounded-full text-[10px] border border-amber-300">
                          Public Holiday{item.holidayName ? `: ${item.holidayName}` : ""}
                        </span>
                      ) : item.status === "ON_LEAVE" ? (
                        <span className="bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-blue-200">
                          Approved Leave
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Edit Staff Attendance</h3>
                  <p className="text-xs text-slate-500">
                    {editingItem.employee.name} • {editingItem.date || startDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
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

      {/* Admin Public Holiday Calendar Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Public Holiday Calendar</h3>
                  <p className="text-xs text-slate-500">
                    Official holidays show as &ldquo;Public Holiday&rdquo; instead of unexcused absent.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 space-x-4 text-xs font-bold">
              <button
                onClick={() => setHolidayTab("list")}
                className={`pb-2.5 px-1 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  holidayTab === "list"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Holidays List</span>
                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full text-[10px]">
                  {holidaysList.length}
                </span>
              </button>
              <button
                onClick={() => setHolidayTab("add")}
                className={`pb-2.5 px-1 border-b-2 transition flex items-center space-x-1 cursor-pointer ${
                  holidayTab === "add"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Single Holiday</span>
              </button>
              <button
                onClick={() => setHolidayTab("import")}
                className={`pb-2.5 px-1 border-b-2 transition flex items-center space-x-1 cursor-pointer ${
                  holidayTab === "import"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import from Excel / CSV</span>
              </button>
            </div>

            {/* Error Message */}
            {holidayError && (
              <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{holidayError}</span>
              </div>
            )}

            {/* Tab Body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {holidayTab === "list" && (
                <div>
                  {holidaysList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-600">No public holidays added yet.</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        Add individual holidays or import your annual calendar from Excel.
                      </p>
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => setHolidayTab("add")}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          + Add Holiday
                        </button>
                        <button
                          onClick={() => setHolidayTab("import")}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Import Excel/CSV
                        </button>
                      </div>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Holiday Name</th>
                          <th className="py-2.5 px-3">Notes</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {holidaysList.map((h) => (
                          <tr key={h.id} className="hover:bg-blue-50/40 transition">
                            <td className="py-2.5 px-3 font-mono font-semibold text-blue-900 whitespace-nowrap">
                              {h.date}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {h.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {h.description || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDeleteHoliday(h.id, h.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Delete Holiday"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {holidayTab === "add" && (
                <form onSubmit={handleAddHoliday} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Holiday Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Holiday Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Republic Day, Independence Day, Diwali"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Description / Category (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. National Gazetted Holiday"
                      value={newHolidayDesc}
                      onChange={(e) => setNewHolidayDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setHolidayTab("list")}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={holidaySaving}
                      className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-md shadow-blue-500/20 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{holidaySaving ? "Saving..." : "Save Holiday"}</span>
                    </button>
                  </div>
                </form>
              )}

              {holidayTab === "import" && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-bold">Excel / CSV Batch Calendar Import</p>
                      <p className="text-blue-700 text-[11px]">
                        Upload your holiday schedule file or copy-paste directly from Excel / Google Sheets.
                        Columns expected: <strong>Date (YYYY-MM-DD), Holiday Name, Notes (optional)</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadSampleHolidays}
                      className="shrink-0 flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer"
                      title="Download sample Excel template"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Sample Template</span>
                    </button>
                  </div>

                  {/* File Upload Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Upload File (.csv / .tsv / .txt)
                    </label>
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const content = evt.target?.result as string;
                            if (content) parseHolidayCsvText(content);
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-300 rounded-xl p-1 bg-slate-50"
                    />
                  </div>

                  {/* Direct Paste Area */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Or Paste Text / Table Rows
                    </label>
                    <textarea
                      rows={5}
                      value={importText}
                      onChange={(e) => parseHolidayCsvText(e.target.value)}
                      placeholder={`2026-01-26, Republic Day, National Holiday\n2026-08-15, Independence Day\n2026-10-02, Gandhi Jayanti\n2026-11-08, Diwali, Festival`}
                      className="w-full font-mono text-xs px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Parsed Preview Table */}
                  {parsedImportRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                        <span>✓ Successfully parsed {parsedImportRows.length} holiday(s):</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto border border-emerald-200 rounded-xl bg-emerald-50/40 p-2 text-xs">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] text-emerald-900 uppercase font-bold border-b border-emerald-200">
                              <th className="py-1 px-2">Date</th>
                              <th className="py-1 px-2">Name</th>
                              <th className="py-1 px-2">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-100 text-[11px]">
                            {parsedImportRows.map((r, idx) => (
                              <tr key={idx}>
                                <td className="py-1 px-2 font-mono font-bold text-emerald-900">{r.date}</td>
                                <td className="py-1 px-2 font-semibold text-slate-800">{r.name}</td>
                                <td className="py-1 px-2 text-slate-500">{r.description || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-2 flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setImportText("");
                            setParsedImportRows([]);
                          }}
                          className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          disabled={holidaySaving}
                          onClick={handleBulkImportHolidays}
                          className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-md shadow-blue-500/20 flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{holidaySaving ? "Importing..." : `Import ${parsedImportRows.length} Holidays`}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
