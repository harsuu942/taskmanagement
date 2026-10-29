"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, LeaveRequest, LeaveStats, LeaveType, LeaveStatus, LeaveSummaryItem, CustomLeaveTypeConfig } from "@/types";
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Check,
  X,
  Building2,
  Users,
  ChevronRight,
  Sparkles,
  Calendar,
  FileText,
  Trash2,
  Palmtree,
  Coffee,
  HeartPulse,
  Sun,
  ShieldCheck,
  AlertTriangle,
  Edit3,
  Upload,
  Download,
  FileSpreadsheet,
  Layers,
  Zap,
  Settings,
} from "lucide-react";

interface LeavesViewProps {
  currentUser: User | null;
  allUsers: User[];
  onLeaveUpdated?: () => void;
}

export default function LeavesView({
  currentUser,
  allUsers,
  onLeaveUpdated,
}: LeavesViewProps) {
  const isAdmin = currentUser?.role === "ADMIN";

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummaryItem[]>([]);
  const [configuredLeaveTypes, setConfiguredLeaveTypes] = useState<CustomLeaveTypeConfig[]>([]);
  const [holidaysList, setHolidaysList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterEmployee, setFilterEmployee] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Actions
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [reviewModalLeave, setReviewModalLeave] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Apply Form State
  const todayStr = new Date().toISOString().slice(0, 10);
  const [applyUserId, setApplyUserId] = useState(currentUser?.id || "");
  const [applyType, setApplyType] = useState<LeaveType>("CASUAL");
  const [applyStartDate, setApplyStartDate] = useState(todayStr);
  const [applyEndDate, setApplyEndDate] = useState(todayStr);
  const [isHourly, setIsHourly] = useState(false);
  const [durationHours, setDurationHours] = useState<number>(4);
  const [applyReason, setApplyReason] = useState("");
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Admin Bulk Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // View switcher: "leaves" (Leave Applications) vs "holidays" (Public Holiday Calendar)
  const [activeMainTab, setActiveMainTab] = useState<"leaves" | "holidays">("leaves");

  // Public Holiday Management State (Admin)
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayTab, setHolidayTab] = useState<"list" | "add" | "import">("list");
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState(todayStr);
  const [holidayDesc, setHolidayDesc] = useState("");
  const [holidaySubmitting, setHolidaySubmitting] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [holidayImportText, setHolidayImportText] = useState("");
  const [holidayImportSubmitting, setHolidayImportSubmitting] = useState(false);
  const [holidaySuccessMsg, setHolidaySuccessMsg] = useState<string | null>(null);

  // Admin Edit Leave State
  const [editLeaveModal, setEditLeaveModal] = useState<LeaveRequest | null>(null);
  const [editLeaveType, setEditLeaveType] = useState<LeaveType>("CASUAL");
  const [editLeaveStartDate, setEditLeaveStartDate] = useState(todayStr);
  const [editLeaveEndDate, setEditLeaveEndDate] = useState(todayStr);
  const [editLeaveDaysCount, setEditLeaveDaysCount] = useState<number | string>(1);
  const [editLeaveReason, setEditLeaveReason] = useState("");
  const [editLeaveStatus, setEditLeaveStatus] = useState<LeaveStatus>("PENDING");
  const [editLeaveNotes, setEditLeaveNotes] = useState("");
  const [editLeaveSubmitting, setEditLeaveSubmitting] = useState(false);
  const [editLeaveError, setEditLeaveError] = useState<string | null>(null);

  // Leave Settings Modal State (Admin: Configure Leave Types & Quotas)
  const [isLeaveSettingsModalOpen, setIsLeaveSettingsModalOpen] = useState(false);
  const [leaveTypesConfigList, setLeaveTypesConfigList] = useState<CustomLeaveTypeConfig[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDays, setNewTypeDays] = useState<number>(10);
  const [newTypeAccrual, setNewTypeAccrual] = useState<number>(0);
  const [newTypeIsPaid, setNewTypeIsPaid] = useState<boolean>(true);
  const [leaveSettingsLoading, setLeaveSettingsLoading] = useState(false);
  const [leaveSettingsMsg, setLeaveSettingsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const openLeaveSettings = async () => {
    setLeaveSettingsMsg(null);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.settings) {
        if (data.settings.leaveTypesConfig && Array.isArray(data.settings.leaveTypesConfig)) {
          setLeaveTypesConfigList(data.settings.leaveTypesConfig);
        } else {
          setLeaveTypesConfigList([
            { id: "EARNED", name: "Earned Leave (EL)", annualDays: data.settings.earnedDays ?? 18, accrualRate: data.settings.earnedLeaveAccrual ?? 1.5, isPaid: true, isDefault: true },
            { id: "CASUAL", name: "Casual Leave (CL)", annualDays: data.settings.casualDays ?? 0, accrualRate: 0, isPaid: true, isDefault: true },
            { id: "SICK", name: "Sick Leave (SL)", annualDays: data.settings.sickDays ?? 0, accrualRate: 0, isPaid: true, isDefault: true },
            { id: "UNPAID", name: "Unpaid Leave (LWP)", annualDays: 0, accrualRate: 0, isPaid: false, isDefault: true },
          ]);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsLeaveSettingsModalOpen(true);
  };

  const handleUpdateLeaveTypeField = (index: number, patch: Partial<CustomLeaveTypeConfig>) => {
    setLeaveTypesConfigList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleAddCustomLeaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const cleanId = newTypeName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .slice(0, 16) + "_" + Math.floor(100 + Math.random() * 900);

    const newEntry: CustomLeaveTypeConfig = {
      id: cleanId,
      name: newTypeName.trim(),
      annualDays: Number(newTypeDays) || 0,
      accrualRate: Number(newTypeAccrual) || 0,
      isPaid: newTypeIsPaid,
      isDefault: false,
    };

    setLeaveTypesConfigList((prev) => [...prev, newEntry]);
    setNewTypeName("");
    setNewTypeDays(10);
    setNewTypeAccrual(0);
    setNewTypeIsPaid(true);
  };

  const handleDeleteCustomLeaveType = (index: number) => {
    setLeaveTypesConfigList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveLeaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveSettingsLoading(true);
    setLeaveSettingsMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypesConfig: leaveTypesConfigList,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save leave quota settings.");
      setLeaveSettingsMsg({ type: "success", text: "Leave types & quotas updated successfully! Cards refreshed." });
      fetchLeaves();
    } catch (err: any) {
      setLeaveSettingsMsg({ type: "error", text: err.message || "Failed to update settings." });
    } finally {
      setLeaveSettingsLoading(false);
    }
  };

  const handleOpenEditLeave = (l: LeaveRequest) => {
    setEditLeaveModal(l);
    setEditLeaveType(l.leaveType);
    setEditLeaveStartDate(l.startDate);
    setEditLeaveEndDate(l.endDate);
    setEditLeaveDaysCount(l.daysCount !== undefined && l.daysCount !== null ? l.daysCount : 1);
    setEditLeaveReason(l.reason);
    setEditLeaveStatus(l.status);
    setEditLeaveNotes(l.reviewNotes || "");
    setEditLeaveError(null);
  };

  const handleSaveEditLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLeaveModal) return;
    setEditLeaveSubmitting(true);
    setEditLeaveError(null);
    try {
      const parsedDays = parseFloat(String(editLeaveDaysCount));
      const res = await fetch(`/api/leaves/${editLeaveModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: editLeaveStartDate,
          endDate: editLeaveEndDate,
          leaveType: editLeaveType,
          daysCount: !isNaN(parsedDays) && parsedDays > 0 ? parsedDays : undefined,
          reason: editLeaveReason,
          status: editLeaveStatus,
          reviewNotes: editLeaveNotes,
          reviewerId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update leave");
      setEditLeaveModal(null);
      fetchLeaves();
      if (onLeaveUpdated) onLeaveUpdated();
    } catch (err: any) {
      setEditLeaveError(err.message || "Failed to update leave");
    } finally {
      setEditLeaveSubmitting(false);
    }
  };

  // Holiday Management Handlers
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) {
      setHolidayError("Holiday Name and Date are required.");
      return;
    }
    setHolidaySubmitting(true);
    setHolidayError(null);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: holidayName.trim(),
          date: holidayDate,
          description: holidayDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save holiday");
      setHolidayName("");
      setHolidayDesc("");
      setHolidaySuccessMsg(`Added "${holidayName}" to official holiday calendar.`);
      fetchLeaves();
      setHolidayTab("list");
    } catch (err: any) {
      setHolidayError(err.message || "Failed to add holiday");
    } finally {
      setHolidaySubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from Public Holidays?`)) return;
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete holiday");
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || "Failed to delete holiday");
    }
  };

  const handleBulkImportHolidays = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayImportText.trim()) return;
    setHolidayImportSubmitting(true);
    setHolidayError(null);
    try {
      const lines = holidayImportText.trim().split("\n");
      const holidaysToImport: { date: string; name: string; description?: string }[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || (trimmed.toLowerCase().includes("date") && trimmed.toLowerCase().includes("name"))) continue;
        const parts = trimmed.split(/[\t,|]+/).map((p) => p.trim());
        if (parts.length >= 2) {
          const d = parts[0];
          const n = parts[1];
          if (/^\d{4}-\d{2}-\d{2}$/.test(d) && n) {
            holidaysToImport.push({ date: d, name: n, description: parts[2] || undefined });
          }
        }
      }
      if (holidaysToImport.length === 0) {
        throw new Error("No valid holiday records found. Use format: YYYY-MM-DD | Holiday Name");
      }
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holidays: holidaysToImport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import holidays");
      setHolidayImportText("");
      setHolidaySuccessMsg(`Successfully imported ${data.count || holidaysToImport.length} holidays to official calendar!`);
      fetchLeaves();
      setHolidayTab("list");
    } catch (err: any) {
      setHolidayError(err.message || "Failed to import holidays");
    } finally {
      setHolidayImportSubmitting(false);
    }
  };

  // Fetch Leaves & Stats & Holidays
  const fetchLeaves = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const url = `/api/leaves?userId=${currentUser.id}&role=${currentUser.role}&status=${filterStatus}&employeeId=${filterEmployee}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setLeaves(data.leaves || []);
        setStats(data.stats || null);
        setLeaveSummary(data.leaveSummary || []);
        if (data.configuredLeaveTypes && Array.isArray(data.configuredLeaveTypes)) {
          setConfiguredLeaveTypes(data.configuredLeaveTypes);
        }
      }

      // Also fetch holidays
      const holRes = await fetch("/api/holidays");
      const holData = await holRes.json();
      if (holRes.ok && holData.holidays) {
        setHolidaysList(holData.holidays);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [currentUser, filterEmployee, filterStatus]);

  // Check if dates conflict with public holiday
  const conflictingHoliday = useMemo(() => {
    if (!applyStartDate) return null;
    const end = applyEndDate || applyStartDate;
    return holidaysList.find((h) => h.date >= applyStartDate && h.date <= end) || null;
  }, [applyStartDate, applyEndDate, holidaysList]);

  // Calculated day count for form
  const calculatedDays = useMemo(() => {
    if (isHourly || applyType === "HOURLY") {
      return parseFloat((durationHours / 8).toFixed(2));
    }
    if (applyType === "HALF_DAY") return 0.5;
    if (!applyStartDate || !applyEndDate) return 1;
    const start = new Date(applyStartDate).getTime();
    const end = new Date(applyEndDate).getTime();
    if (end < start) return 0;
    return Math.round((end - start) / (1000 * 3600 * 24)) + 1;
  }, [applyStartDate, applyEndDate, applyType, isHourly, durationHours]);

  // Selected Employee Leave Balance & Stats for Apply Form
  const selectedEmployeeStats = useMemo(() => {
    const targetId = isAdmin ? applyUserId : currentUser?.id;
    const approvedLeaves = leaves.filter(
      (l) => l.userId === targetId && l.status === "APPROVED"
    );

    const typeIdUpper = String(applyType).toUpperCase();
    const typeCfg = configuredLeaveTypes.find((t) => String(t.id).toUpperCase() === typeIdUpper);
    const isPaidType = typeCfg ? typeCfg.isPaid !== false : (typeIdUpper !== "UNPAID");
    const quota = typeCfg ? parseFloat(String(typeCfg.annualDays)) || 0 : 0;

    const taken = approvedLeaves
      .filter((l) => {
        const lType = l.leaveType.toUpperCase();
        if (typeIdUpper === "CASUAL" && (lType === "HALF_DAY" || lType === "HOURLY")) return true;
        return lType === typeIdUpper;
      })
      .reduce((acc, l) => acc + (l.daysCount || 1), 0);

    const currentBalance = Math.max(0, parseFloat((quota - taken).toFixed(2)));
    const requestedDays = calculatedDays;
    const balanceAfter = Math.max(0, parseFloat((currentBalance - requestedDays).toFixed(2)));
    const isZeroBalance = isPaidType && currentBalance <= 0 && typeIdUpper !== "UNPAID";

    return {
      quota,
      taken: parseFloat(taken.toFixed(2)),
      currentBalance,
      requestedDays,
      balanceAfter,
      isPaidType,
      isZeroBalance,
      typeName: typeCfg?.name || applyType,
    };
  }, [applyUserId, currentUser, leaves, applyType, configuredLeaveTypes, calculatedDays, isAdmin]);

  // Dynamic leave types list for Apply Leave Form
  const availableTypeOptions = useMemo(() => {
    const list: { type: string; label: string; icon: any; isPaid: boolean }[] = [];

    if (configuredLeaveTypes && configuredLeaveTypes.length > 0) {
      configuredLeaveTypes.forEach((t) => {
        let icon = Palmtree;
        const upper = t.id.toUpperCase();
        if (upper === "CASUAL") icon = Coffee;
        else if (upper === "SICK") icon = HeartPulse;
        else if (upper === "UNPAID") icon = Calendar;
        else if (t.isPaid) icon = Palmtree;
        else icon = Calendar;

        list.push({
          type: t.id,
          label: t.name || t.id,
          icon,
          isPaid: t.isPaid !== false,
        });
      });
    } else {
      list.push(
        { type: "EARNED", label: "Earned Leave (EL)", icon: Palmtree, isPaid: true },
        { type: "CASUAL", label: "Casual Leave", icon: Coffee, isPaid: true },
        { type: "SICK", label: "Sick Leave", icon: HeartPulse, isPaid: true },
        { type: "UNPAID", label: "Unpaid Leave (LWP)", icon: Calendar, isPaid: false }
      );
    }

    // Always include Half Day and Hourly options
    list.push(
      { type: "HALF_DAY", label: "Half Day (4h)", icon: Sun, isPaid: true },
      { type: "HOURLY", label: "Hourly Leave (hrs)", icon: Clock, isPaid: true }
    );

    return list;
  }, [configuredLeaveTypes]);

  // Client-side text & type filter
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (filterType !== "ALL" && l.leaveType !== filterType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const userName = l.user?.name?.toLowerCase() || "";
        const userEmail = l.user?.email?.toLowerCase() || "";
        const reason = l.reason.toLowerCase();
        if (!userName.includes(q) && !userEmail.includes(q) && !reason.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [leaves, filterType, searchQuery]);

  // Pending leaves queue for Admin quick approval
  const pendingLeaves = useMemo(() => {
    return leaves.filter((l) => l.status === "PENDING");
  }, [leaves]);

  // Apply Leave Submit
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyReason.trim()) {
      setApplyError("Reason for leave is required.");
      return;
    }
    if (new Date(applyStartDate) > new Date(applyEndDate)) {
      setApplyError("Start date cannot be after end date.");
      return;
    }
    if (conflictingHoliday) {
      setApplyError(`Official Public Holiday on ${conflictingHoliday.date}: "${conflictingHoliday.name}". Leave cannot be applied on public holidays.`);
      return;
    }

    setApplySubmitting(true);
    setApplyError(null);

    try {
      const chosenType: LeaveType = isHourly ? "HOURLY" : applyType;
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: isAdmin ? applyUserId : currentUser?.id,
          leaveType: chosenType,
          startDate: applyStartDate,
          endDate: isHourly ? applyStartDate : applyEndDate,
          daysCount: calculatedDays,
          durationHours: isHourly ? durationHours : null,
          isHourly: isHourly,
          reason: applyReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit leave application.");
      }

      setIsApplyModalOpen(false);
      // Reset form
      setApplyReason("");
      setApplyType("CASUAL");
      setIsHourly(false);
      setDurationHours(4);
      setApplyStartDate(todayStr);
      setApplyEndDate(todayStr);
      await fetchLeaves();
      if (onLeaveUpdated) onLeaveUpdated();
      if (data.autoConvertedToUnpaid) {
        alert(data.message || "Notice: Your available paid leave balance was 0, so this request was automatically applied as Unpaid Leave (Leave Without Pay / LWP).");
      }
    } catch (err: any) {
      setApplyError(err.message);
    } finally {
      setApplySubmitting(false);
    }
  };

  // Admin Bulk Import Leaves Handler
  const handleBulkImportLeaves = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);

    const lines = importText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setImportError("Please provide at least one leave entry to import.");
      return;
    }

    const parsed: any[] = [];
    for (const line of lines) {
      // Allow comma, tab, or pipe separation
      const delimiter = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
      const parts = line.split(delimiter).map(p => p.trim());
      if (parts.length < 4) continue;
      // Format: Identifier (email/id), LeaveType, StartDate, EndDate, Reason
      const [empIdentifier, lType, sDate, eDate, ...reasonParts] = parts;
      if (empIdentifier.toLowerCase().includes("email") || sDate.toLowerCase().includes("start")) continue; // Skip header

      // Find matching employee
      const matched = allUsers.find(u =>
        u.email.toLowerCase() === empIdentifier.toLowerCase() ||
        u.name.toLowerCase() === empIdentifier.toLowerCase() ||
        u.id === empIdentifier ||
        u.userId?.toLowerCase() === empIdentifier.toLowerCase()
      );

      if (!matched) continue;

      let validLeaveType = "CASUAL";
      const upper = lType.toUpperCase();
      if (["CASUAL", "SICK", "EARNED", "UNPAID", "HALF_DAY", "HOURLY"].includes(upper)) {
        validLeaveType = upper;
      }

      parsed.push({
        userId: matched.id,
        leaveType: validLeaveType,
        startDate: sDate.slice(0, 10),
        endDate: (eDate || sDate).slice(0, 10),
        reason: reasonParts.join(" ").trim() || "Imported leave record",
        status: "APPROVED",
      });
    }

    if (parsed.length === 0) {
      setImportError("Could not recognize any valid employee leave records. Please check the format.");
      return;
    }

    setImportSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaves: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import leaves.");

      setImportSuccess(`Successfully imported ${data.count || parsed.length} leave record(s).`);
      setImportText("");
      await fetchLeaves();
      if (onLeaveUpdated) onLeaveUpdated();
      setTimeout(() => {
        setShowImportModal(false);
        setImportSuccess(null);
      }, 1500);
    } catch (err: any) {
      setImportError(err.message || "Failed to import leaves.");
    } finally {
      setImportSubmitting(false);
    }
  };

  // Open Review Dialog
  const handleOpenReview = (leave: LeaveRequest, action: "APPROVED" | "REJECTED") => {
    setReviewModalLeave(leave);
    setReviewAction(action);
    setReviewNotes(action === "APPROVED" ? "Approved as requested." : "Declined due to work requirements.");
  };

  // Submit Review (Approve / Reject)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalLeave || !currentUser) return;

    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/leaves/${reviewModalLeave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewAction,
          reviewNotes: reviewNotes.trim() || null,
          reviewerId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update leave status.");
        return;
      }

      setReviewModalLeave(null);
      await fetchLeaves();
      if (onLeaveUpdated) onLeaveUpdated();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Delete / Cancel Leave
  const handleDeleteLeave = async (leaveId: string) => {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to cancel/delete this leave application?")) return;

    try {
      const res = await fetch(
        `/api/leaves/${leaveId}?userId=${currentUser.id}&role=${currentUser.role}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to cancel leave request.");
        return;
      }
      await fetchLeaves();
      if (onLeaveUpdated) onLeaveUpdated();
    } catch (err: any) {
      alert("Error cancelling leave: " + err.message);
    }
  };

  // Badge helpers
  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case "CASUAL":
        return {
          label: "Casual Leave",
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: Coffee,
        };
      case "SICK":
        return {
          label: "Sick Leave",
          color: "bg-rose-100 text-rose-800 border-rose-200",
          icon: HeartPulse,
        };
      case "EARNED":
        return {
          label: "Earned / Paid",
          color: "bg-purple-100 text-purple-800 border-purple-200",
          icon: Palmtree,
        };
      case "UNPAID":
        return {
          label: "Unpaid Leave",
          color: "bg-slate-100 text-slate-700 border-slate-300",
          icon: Calendar,
        };
      case "HALF_DAY":
        return {
          label: "Half Day",
          color: "bg-amber-100 text-amber-800 border-amber-200",
          icon: Sun,
        };
      default:
        return {
          label: type,
          color: "bg-slate-100 text-slate-800 border-slate-200",
          icon: Calendar,
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Approved</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <X className="w-3.5 h-3.5 text-rose-600" />
            <span>Rejected</span>
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner with Stats */}
      <div className="bg-gradient-to-r from-rose-700 via-pink-700 to-amber-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <CalendarDays className="w-6 h-6 text-rose-100" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                {isAdmin ? "Leave Management & Staff Roster" : "My Leave Portal & Applications"}
              </h2>
              <p className="text-xs text-rose-100 mt-0.5">
                {isAdmin
                  ? "Approve employee leave applications, view leave reports, and track staff availability"
                  : "Apply for leave, track approval statuses, and review leave records"}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {isAdmin && (
            <button
              onClick={openLeaveSettings}
              className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md cursor-pointer"
              title="Configure Leave Types & Annual Quotas for employees"
            >
              <Settings className="w-4 h-4 text-blue-200" />
              <span>⚙️ Leave Settings (Types &amp; Quotas)</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setHolidayError(null);
                setHolidaySuccessMsg(null);
                setHolidayTab("list");
                setIsHolidayModalOpen(true);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/50 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md cursor-pointer"
              title="Official Public Holiday Calendar (View, Add, Excel/PDF import)"
            >
              <Calendar className="w-4 h-4 text-purple-200" />
              <span>🎉 Public Holiday Calendar</span>
              <span className="bg-white/25 text-white px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                {holidaysList.length}
              </span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setImportText("");
                setImportError(null);
                setImportSuccess(null);
                setShowImportModal(true);
              }}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              title="Bulk import leave records from Excel, CSV, or PDF text"
            >
              <Upload className="w-4 h-4" />
              <span>Import Leaves</span>
            </button>
          )}

          <button
            onClick={() => {
              setApplyUserId(currentUser?.id || "");
              setApplyType("CASUAL");
              setIsHourly(false);
              setDurationHours(4);
              setApplyStartDate(todayStr);
              setApplyEndDate(todayStr);
              setApplyReason("");
              setApplyError(null);
              setIsApplyModalOpen(true);
            }}
            className="bg-white hover:bg-rose-50 text-rose-900 px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-rose-600" />
            <span>{isAdmin ? "Apply Leave (Staff / Self)" : "Apply for Leave"}</span>
          </button>
        </div>
      </div>

      {/* Main View Switcher: Leave Applications vs Official Public Holiday Calendar */}
      <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-2xs space-x-1 text-xs font-bold">
        <button
          onClick={() => setActiveMainTab("leaves")}
          className={`flex-1 py-2.5 px-3 rounded-lg transition flex items-center justify-center space-x-2 cursor-pointer ${
            activeMainTab === "leaves"
              ? "bg-rose-50 text-rose-900 border border-rose-200 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <CalendarDays className="w-4 h-4 text-rose-600" />
          <span>Leave Applications</span>
          <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.2 rounded-full">
            {leaves.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("holidays")}
          className={`flex-1 py-2.5 px-3 rounded-lg transition flex items-center justify-center space-x-2 cursor-pointer ${
            activeMainTab === "holidays"
              ? "bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Calendar className="w-4 h-4 text-purple-600" />
          <span>🎉 Official Public Holiday Calendar</span>
          <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.2 rounded-full font-extrabold">
            {holidaysList.length} Holidays
          </span>
        </button>
      </div>

      {activeMainTab === "holidays" ? (
        /* Dedicated Public Holiday Calendar Panel */
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  🎉 Official Public Holidays Calendar ({holidaysList.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Recognized national &amp; festive holidays. Attendance marks employees as &ldquo;Public Holiday&rdquo; (paid non-working day), and employee leave cannot conflict with these dates.
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setHolidayError(null);
                    setHolidaySuccessMsg(null);
                    setHolidayTab("add");
                    setIsHolidayModalOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Public Holiday</span>
                </button>
                <button
                  onClick={() => {
                    setHolidayError(null);
                    setHolidaySuccessMsg(null);
                    setHolidayTab("import");
                    setIsHolidayModalOpen(true);
                  }}
                  className="bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                  <span>Import Excel / PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Holidays List */}
          {holidaysList.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">No Public Holidays added yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add national and festival holidays (Republic Day, Independence Day, Gandhi Jayanti, Diwali, etc.) or import your full annual calendar from Excel/PDF.
              </p>
              {isAdmin && (
                <button
                  onClick={() => {
                    setHolidayTab("add");
                    setIsHolidayModalOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Add First Public Holiday
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="py-3 px-4">Date &amp; Day</th>
                    <th className="py-3 px-4">Holiday Name</th>
                    <th className="py-3 px-4">Description / Notes</th>
                    <th className="py-3 px-4 text-center">Recognition</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {holidaysList.map((h: any) => {
                    const d = new Date(h.date);
                    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <div>{h.date}</div>
                          <div className="text-[10px] text-purple-700 font-sans font-semibold">{dayName}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {h.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500 italic">
                          {h.description || "Official recognized public holiday"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                            🌴 Official Paid Holiday
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteHoliday(h.id, h.name)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-lg transition cursor-pointer"
                              title="Delete Holiday"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Leave Applications Content */
        <>
          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center space-x-3.5">
          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending Review
            </div>
            <div className="text-2xl font-extrabold text-amber-700 mt-0.5">
              {stats?.pendingCount || 0}
            </div>
          </div>
        </div>

        {/* Card 2: Approved */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center space-x-3.5">
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Approved Leaves
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-0.5">
              {stats?.approvedCount || 0}
            </div>
          </div>
        </div>

        {/* Card 3: Rejected */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center space-x-3.5">
          <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Declined / Rejected
            </div>
            <div className="text-2xl font-extrabold text-rose-700 mt-0.5">
              {stats?.rejectedCount || 0}
            </div>
          </div>
        </div>

        {/* Card 4: Staff On Leave Today (Admin) or Total Applied (Employee) */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center space-x-3.5">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-600">
            {isAdmin ? <Users className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isAdmin ? "On Leave Today" : "Total Applications"}
            </div>
            <div className="text-2xl font-extrabold text-blue-700 mt-0.5">
              {isAdmin ? stats?.onLeaveTodayCount || 0 : stats?.totalLeaves || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Leave Summary Widget: Leave Available - Leave Taken - Balance */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-rose-100 rounded-lg text-rose-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Leave Balance Summary
              </h3>
              <p className="text-[11px] text-slate-500">
                Official quota allocation: <span className="font-semibold text-slate-700">Leave Available &minus; Leave Taken = Balance</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center space-x-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>
                Total Annual:{" "}
                {leaveSummary.find((i) => i.leaveType === "TOTAL")?.totalAvailable ?? 18} Days
                {leaveSummary.some((i) => i.leaveType === "EARNED") && (
                  <span className="text-slate-600 font-bold ml-1">
                    (Accruing {leaveSummary.find((i) => i.leaveType === "EARNED")?.accrualRate ?? 1.5}d/mo Earned)
                  </span>
                )}
              </span>
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={openLeaveSettings}
                className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer text-[11px] ml-1 flex items-center space-x-1"
                title="Configure leave types and quota days"
              >
                <span>⚙️ Configure Quotas</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Cards: Only shows leave types configured with quotas > 0 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
          {leaveSummary
            .filter((item) => item.totalAvailable > 0 || item.leaveType === "TOTAL" || (item.leaveType === "UNPAID" && item.taken > 0))
            .map((item) => {
              const isTotal = item.leaveType === "TOTAL";
              const isUnpaid = item.leaveType === "UNPAID";

              return (
                <div
                  key={item.leaveType}
                  className={`p-3.5 rounded-xl border transition ${
                    isTotal
                      ? "bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300 ring-1 ring-rose-200 shadow-xs"
                      : isUnpaid
                      ? "bg-slate-50 border-slate-200"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isTotal ? "text-rose-900" : "text-slate-700"}`}>
                      {item.label}
                    </span>
                    {isTotal && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
                        Total
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Available:</span>
                      <span className="font-bold text-slate-800">
                        {item.leaveType === "EARNED"
                          ? `${item.totalAvailable}d (${item.accrualRate || 1.5}d/mo)`
                          : item.totalAvailable > 0
                          ? `${item.totalAvailable}d`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Taken:</span>
                      <span className="font-bold text-rose-600">
                        {item.taken}d
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between font-bold">
                      <span className={isTotal ? "text-rose-900" : "text-slate-700"}>Balance:</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.balance > 0
                          ? "bg-emerald-100 text-emerald-800 font-extrabold"
                          : isUnpaid
                          ? "text-slate-500"
                          : "bg-rose-100 text-rose-800 font-extrabold"
                      }`}>
                        {item.totalAvailable > 0 ? `${item.balance}d` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Admin Quick Action: Pending Leaves Alert Queue */}
      {isAdmin && pendingLeaves.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h3 className="text-sm font-bold text-amber-950">
                Action Required: {pendingLeaves.length} Pending Leave Application(s)
              </h3>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
              Awaiting Admin Approval
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pendingLeaves.map((pl) => {
              const typeBadge = getLeaveTypeBadge(pl.leaveType);
              const TypeIcon = typeBadge.icon;
              return (
                <div
                  key={pl.id}
                  className="bg-white border border-amber-200/90 rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:shadow-xs transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">
                          {pl.user?.name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {pl.user?.designation || "Team Member"}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeBadge.color}`}
                      >
                        <TypeIcon className="w-3 h-3" />
                        <span>{typeBadge.label}</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="font-semibold text-slate-800">
                        📅 {pl.startDate} {pl.startDate !== pl.endDate ? `➔ ${pl.endDate}` : ""}
                        <span className="ml-1 text-slate-500 font-normal">
                          ({pl.leaveType === "HALF_DAY" ? "0.5 Day" : `${pl.daysCount} Day(s)`})
                        </span>
                      </div>
                      <p className="italic text-slate-600 mt-1 line-clamp-2">
                        "{pl.reason}"
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 mt-3">
                    <button
                      onClick={() => handleOpenReview(pl, "REJECTED")}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={() => handleOpenReview(pl, "APPROVED")}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filter Leave Records &amp; Report
            </h4>
          </div>

          {(filterEmployee !== "ALL" || filterStatus !== "ALL" || filterType !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setFilterEmployee("ALL");
                setFilterStatus("ALL");
                setFilterType("ALL");
                setSearchQuery("");
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
            {/* Employee Filter (Admin Only) */}
            {isAdmin && (
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none font-medium text-slate-700"
              >
                <option value="ALL">All Employees ({allUsers.filter((u) => u.role === "EMPLOYEE").length})</option>
                {allUsers
                  .filter((u) => u.role === "EMPLOYEE")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none font-medium text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Leave Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none font-medium text-slate-700"
            >
              <option value="ALL">All Leave Types</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="EARNED">Earned / Paid Leave</option>
              <option value="UNPAID">Unpaid Leave</option>
              <option value="HALF_DAY">Half Day</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none text-slate-700 focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Leave Report Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {isAdmin ? "Leave Report & Audit Log" : "My Leave History"} ({filteredLeaves.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                {isAdmin && <th className="py-3 px-4">Employee</th>}
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Duration &amp; Dates</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Review Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="py-12 text-center text-slate-400 text-xs font-medium"
                  >
                    Loading leave records...
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="py-12 text-center text-slate-400 text-xs font-medium"
                  >
                    No leave requests found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((l) => {
                  const typeBadge = getLeaveTypeBadge(l.leaveType);
                  const TypeIcon = typeBadge.icon;
                  const canCancel =
                    (!isAdmin && l.userId === currentUser?.id && l.status === "PENDING") ||
                    isAdmin;

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition group">
                      {/* Employee (Admin Only) */}
                      {isAdmin && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{l.user?.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {l.user?.designation || "Team Member"}
                          </div>
                        </td>
                      )}

                      {/* Leave Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${typeBadge.color}`}
                        >
                          <TypeIcon className="w-3 h-3" />
                          <span>{typeBadge.label}</span>
                        </span>
                      </td>

                      {/* Duration & Dates */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">
                          {l.startDate} {l.startDate !== l.endDate ? `➔ ${l.endDate}` : ""}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {l.leaveType === "HALF_DAY" ? "0.5 Day (Half Day)" : `${l.daysCount} Day(s)`}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                        <span className="line-clamp-2 bg-slate-50 px-2 py-1 rounded border border-slate-100 italic">
                          "{l.reason}"
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(l.status)}
                      </td>

                      {/* Review Remarks */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {l.reviewNotes ? (
                          <div>
                            <span className="text-slate-800 text-[11px] font-medium block">
                              {l.reviewNotes}
                            </span>
                            {l.reviewedBy && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Reviewed by {l.reviewedBy.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No review notes</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Admin Review buttons (if pending) */}
                          {isAdmin && l.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleOpenReview(l, "APPROVED")}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition border border-emerald-200"
                                title="Approve Leave"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenReview(l, "REJECTED")}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition border border-rose-200"
                                title="Decline Leave"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Admin Edit Leave Details */}
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenEditLeave(l)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition border border-blue-200"
                              title="Edit Leave Details (Admin)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel / Delete */}
                          {canCancel && (
                            <button
                              onClick={() => handleDeleteLeave(l.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-lg text-xs transition border border-slate-200"
                              title={isAdmin ? "Delete Leave Record" : "Withdraw / Cancel Application"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* MODAL 1: Apply for Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {isAdmin ? "Submit Leave Application" : "Apply for Leave"}
                </h3>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4 text-xs">
              {applyError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{applyError}</span>
                </div>
              )}

              {/* If Admin: can choose employee */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Employee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={applyUserId}
                    onChange={(e) => setApplyUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white font-medium"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === "ADMIN" ? "Admin" : u.designation || "Employee"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Leave Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Leave Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableTypeOptions.map((t) => {
                    const Icon = t.icon;
                    const isSelected = (t.type === "HOURLY" && isHourly) || (!isHourly && applyType === t.type);
                    return (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => {
                          if (t.type === "HOURLY") {
                            setIsHourly(true);
                            setApplyType("HOURLY");
                          } else {
                            setIsHourly(false);
                            setApplyType(t.type as LeaveType);
                          }
                        }}
                        className={`p-2 rounded-lg border text-left flex items-center space-x-2 transition cursor-pointer ${
                          isSelected
                            ? "bg-rose-50 border-rose-500 text-rose-900 font-bold ring-1 ring-rose-500"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-rose-600" : "text-slate-400"}`} />
                        <span className="text-[11px] truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Leave Balance & Availability Card */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                selectedEmployeeStats.isZeroBalance
                  ? "bg-amber-50/90 border-amber-300"
                  : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Pending Balance: {selectedEmployeeStats.typeName}
                  </span>
                  {selectedEmployeeStats.isPaidType && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      selectedEmployeeStats.currentBalance > 0
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}>
                      {selectedEmployeeStats.currentBalance > 0 ? "Paid Quota Available" : "0 Paid Balance (LWP Auto-Apply)"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Available Quota</span>
                    <span className={`font-extrabold text-sm ${selectedEmployeeStats.currentBalance > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {selectedEmployeeStats.isPaidType ? `${selectedEmployeeStats.currentBalance.toFixed(1)} d` : "Unpaid (LWP)"}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Days Requested</span>
                    <span className="font-extrabold text-sm text-blue-700">
                      {selectedEmployeeStats.requestedDays.toFixed(2)} d
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Balance After</span>
                    <span className="font-extrabold text-sm text-slate-800">
                      {selectedEmployeeStats.isPaidType ? `${selectedEmployeeStats.balanceAfter.toFixed(1)} d` : "0 d"}
                    </span>
                  </div>
                </div>

                {/* If Zero Balance: Show Warning */}
                {selectedEmployeeStats.isZeroBalance && (
                  <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Zero Balance: Automatically Applied as Unpaid Leave</span>
                      <span className="text-rose-700">
                        You currently have 0 remaining {selectedEmployeeStats.typeName} balance. Submitting this request will automatically record it as <strong>Unpaid Leave (Leave Without Pay / LWP)</strong>.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* If Hourly Leave Selected: Hours Input */}
              {isHourly && (
                <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-900">
                      Duration in Hours (1 &ndash; 8 hrs) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      {(durationHours / 8).toFixed(2)} Day(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={0.5}
                      value={durationHours}
                      onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0.5}
                      max={8}
                      step={0.5}
                      value={durationHours}
                      onChange={(e) => setDurationHours(Math.max(0.5, Math.min(8, parseFloat(e.target.value) || 1)))}
                      className="w-20 px-2.5 py-1 text-center font-bold border border-amber-300 rounded-lg bg-white"
                    />
                    <span className="text-xs font-semibold text-amber-800">Hours</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Calculated on standard company 8-hour workday basis: <span className="font-bold">{durationHours} hours &divide; 8 = {(durationHours / 8).toFixed(2)} days</span> deduction.
                  </p>
                </div>
              )}

              {/* Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {isHourly ? "Leave Date" : "Start Date"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={applyStartDate}
                    onChange={(e) => {
                      setApplyStartDate(e.target.value);
                      if (applyEndDate < e.target.value || isHourly) {
                        setApplyEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none font-medium"
                  />
                </div>

                {!isHourly && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      End Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={applyEndDate}
                      onChange={(e) => setApplyEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Public Holiday Conflict Warning Banner */}
              {conflictingHoliday && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-300 text-rose-800 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      Official Public Holiday: {conflictingHoliday.name} ({conflictingHoliday.date})
                    </div>
                    <p className="mt-0.5 text-[11px] text-rose-700">
                      Employees cannot apply for leave on an official holiday. Your attendance is already marked as a paid Public Holiday on this date.
                    </p>
                  </div>
                </div>
              )}

              {/* Total Duration Banner */}
              <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-semibold text-rose-900">
                <span>Calculated Total Duration:</span>
                <span className="font-extrabold text-rose-800 bg-white px-2 py-0.5 rounded border border-rose-200">
                  {isHourly
                    ? `${durationHours} Hour(s) = ${(durationHours / 8).toFixed(2)} Day`
                    : applyType === "HALF_DAY"
                    ? "0.5 Day (Half Day)"
                    : `${calculatedDays} Calendar Day(s)`}
                </span>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Reason for Leave / Work Handover Plan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain reason for absence, emergency details, or client handover notes..."
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applySubmitting || !!conflictingHoliday}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{applySubmitting ? "Submitting..." : "Submit Leave Application"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Admin Bulk Import Leaves (Excel/PDF) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Import Leave Records (Excel / CSV / PDF)
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImportLeaves} className="p-6 space-y-4 text-xs">
              {importError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Standard Data Format (Pipe, Comma, or Tab separated):</span>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = `Employee Email / Name | Leave Type | Start Date | End Date | Reason\n${allUsers[0]?.email || "employee@gmail.com"} | CASUAL | 2026-11-02 | 2026-11-03 | Family Function\n${allUsers[1]?.email || "employee2@gmail.com"} | SICK | 2026-11-05 | 2026-11-05 | Viral Fever`;
                      setImportText(sample);
                    }}
                    className="text-rose-600 hover:underline text-[11px] font-semibold"
                  >
                    Paste Sample Template
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                  Employee_Email | Leave_Type | Start_Date (YYYY-MM-DD) | End_Date | Reason
                </div>
                <p className="text-[11px] text-slate-500">
                  Supported Leave Types: <code className="bg-slate-200 px-1 rounded">CASUAL</code>, <code className="bg-slate-200 px-1 rounded">SICK</code>, <code className="bg-slate-200 px-1 rounded">EARNED</code>, <code className="bg-slate-200 px-1 rounded">UNPAID</code>, <code className="bg-slate-200 px-1 rounded">HALF_DAY</code>, <code className="bg-slate-200 px-1 rounded">HOURLY</code>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paste Leave Records or Data from PDF / Excel <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Paste table copied from Excel, Google Sheets, or extracted from PDF..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importSubmitting || !importText.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{importSubmitting ? "Importing Leaves..." : "Import Leaves to Database"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Admin Review (Approve / Reject) Modal */}
      {reviewModalLeave && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                {reviewAction === "APPROVED" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="text-sm font-bold text-slate-900">
                  {reviewAction === "APPROVED" ? "Approve Leave Request" : "Decline Leave Request"}
                </h3>
              </div>
              <button
                onClick={() => setReviewModalLeave(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 space-y-4 text-xs">
              {/* Summary Details */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 text-xs">
                  {reviewModalLeave.user?.name}
                </div>
                <div className="text-[11px] text-slate-600">
                  📅 {reviewModalLeave.startDate} ➔ {reviewModalLeave.endDate} ({reviewModalLeave.daysCount} day(s))
                </div>
                <div className="text-[11px] text-slate-500 italic mt-1">
                  "{reviewModalLeave.reason}"
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Admin Remarks / Feedback
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    reviewAction === "APPROVED"
                      ? "e.g. Approved. Please coordinate handover with Ananya."
                      : "e.g. Declined due to impending quarterly tax audit deadline."
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReviewModalLeave(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 ${
                    reviewAction === "APPROVED"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {reviewAction === "APPROVED" ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {reviewSubmitting
                      ? "Processing..."
                      : reviewAction === "APPROVED"
                      ? "Confirm Approval"
                      : "Confirm Rejection"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Admin Edit Leave Modal */}
      {editLeaveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Admin Edit Leave Record ({editLeaveModal.user?.name})
                </h3>
              </div>
              <button
                onClick={() => setEditLeaveModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLeave} className="p-6 space-y-4 text-xs">
              {editLeaveError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{editLeaveError}</span>
                </div>
              )}

              {/* Leave Type & Days Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Leave Type
                  </label>
                  <select
                    value={editLeaveType}
                    onChange={(e) => {
                      const newType = e.target.value as LeaveType;
                      setEditLeaveType(newType);
                      if (newType === "HALF_DAY") {
                        setEditLeaveDaysCount(0.5);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none font-semibold text-slate-800"
                  >
                    <option value="CASUAL">Casual Leave (General personal work)</option>
                    <option value="SICK">Sick Leave (Medical/Health recovery)</option>
                    <option value="EARNED">Earned / Privilege Leave</option>
                    <option value="UNPAID">Unpaid Leave (Loss of Pay)</option>
                    <option value="HALF_DAY">Half Day Leave (0.5 day)</option>
                    <option value="HOURLY">Hourly Short Leave</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Leave Count (Days) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-blue-600 font-bold">Admin Override</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="365"
                      required
                      value={editLeaveDaysCount}
                      onChange={(e) => setEditLeaveDaysCount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-2 rounded-lg border border-slate-200">
                      Day(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editLeaveStartDate}
                    onChange={(e) => setEditLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editLeaveEndDate}
                    onChange={(e) => setEditLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Status Override */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Leave Status
                </label>
                <select
                  value={editLeaveStatus}
                  onChange={(e) => setEditLeaveStatus(e.target.value as LeaveStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none font-semibold text-slate-800"
                >
                  <option value="PENDING">⏳ PENDING (Awaiting Review)</option>
                  <option value="APPROVED">✓ APPROVED (Will mark Attendance as On Leave)</option>
                  <option value="REJECTED">✕ REJECTED (Declined)</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Reason for Leave
                </label>
                <textarea
                  rows={2}
                  required
                  value={editLeaveReason}
                  onChange={(e) => setEditLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-slate-800 font-medium"
                />
              </div>

              {/* Admin Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Admin Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional review notes or adjustment rationale..."
                  value={editLeaveNotes}
                  onChange={(e) => setEditLeaveNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-slate-800 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditLeaveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLeaveSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{editLeaveSubmitting ? "Saving..." : "Save Leave Updates"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Admin Public Holiday Calendar Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Calendar className="w-5 h-5 text-purple-200" />
                <div>
                  <h3 className="font-extrabold text-base">🎉 Official Public Holiday Calendar</h3>
                  <p className="text-xs text-purple-100">
                    Recognized holidays show as &ldquo;Public Holiday&rdquo; (paid non-working day) and restrict leave requests.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 space-x-4 text-xs font-bold">
              <button
                onClick={() => {
                  setHolidayError(null);
                  setHolidaySuccessMsg(null);
                  setHolidayTab("list");
                }}
                className={`pb-2.5 px-1 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  holidayTab === "list"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Holidays List</span>
                <span className="bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full text-[10px]">
                  {holidaysList.length}
                </span>
              </button>
              <button
                onClick={() => {
                  setHolidayError(null);
                  setHolidaySuccessMsg(null);
                  setHolidayTab("add");
                }}
                className={`pb-2.5 px-1 border-b-2 transition flex items-center space-x-1 cursor-pointer ${
                  holidayTab === "add"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Single Holiday</span>
              </button>
              <button
                onClick={() => {
                  setHolidayError(null);
                  setHolidaySuccessMsg(null);
                  setHolidayTab("import");
                }}
                className={`pb-2.5 px-1 border-b-2 transition flex items-center space-x-1 cursor-pointer ${
                  holidayTab === "import"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import from Excel / PDF</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6">
              {holidayError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{holidayError}</span>
                </div>
              )}

              {holidaySuccessMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{holidaySuccessMsg}</span>
                </div>
              )}

              {holidayTab === "list" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Configured Official Holidays ({holidaysList.length})</span>
                    <button
                      onClick={() => setHolidayTab("add")}
                      className="text-purple-600 font-bold hover:underline cursor-pointer"
                    >
                      + Add New
                    </button>
                  </div>

                  {holidaysList.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <p className="font-semibold text-slate-600">No public holidays added yet.</p>
                      <p className="mt-1">Add individual holidays or import your annual calendar from Excel/PDF.</p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                      {holidaysList.map((h: any) => {
                        const d = new Date(h.date);
                        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                        return (
                          <div
                            key={h.id}
                            className="p-3 flex items-center justify-between hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg font-mono font-bold text-xs">
                                {h.date}
                              </div>
                              <div>
                                <h5 className="font-bold text-xs text-slate-900">{h.name}</h5>
                                <p className="text-[11px] text-slate-400">
                                  {dayName} {h.description ? `• ${h.description}` : ""}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteHoliday(h.id, h.name)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Holiday"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {holidayTab === "add" && (
                <form onSubmit={handleAddHoliday} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Holiday Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Holiday Name / Occasion <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Republic Day, Independence Day, Diwali, Eid..."
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Description / Regional Applicability (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. National Gazetted Holiday across all branches"
                      value={holidayDesc}
                      onChange={(e) => setHolidayDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setHolidayTab("list")}
                      className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={holidaySubmitting}
                      className="px-5 py-2 font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{holidaySubmitting ? "Adding..." : "Add to Calendar"}</span>
                    </button>
                  </div>
                </form>
              )}

              {holidayTab === "import" && (
                <form onSubmit={handleBulkImportHolidays} className="space-y-4 text-xs">
                  <div className="bg-purple-50/60 border border-purple-200 p-3.5 rounded-xl space-y-2">
                    <div className="font-bold text-purple-900 flex items-center justify-between">
                      <span>Import Format (YYYY-MM-DD | Holiday Name | Description):</span>
                      <button
                        type="button"
                        onClick={() => {
                          const sample = `2026-01-26 | Republic Day | National Gazetted Holiday\n2026-03-25 | Holi | Festival of Colors\n2026-08-15 | Independence Day | National Holiday\n2026-10-02 | Mahatma Gandhi Jayanti | Gazetted Holiday\n2026-10-20 | Dussehra (Vijayadashami) | Festival Holiday\n2026-11-08 | Diwali (Deepavali) | Festival of Lights\n2026-12-25 | Christmas Day | Gazetted Holiday`;
                          setHolidayImportText(sample);
                        }}
                        className="text-purple-700 hover:underline text-[11px] font-semibold cursor-pointer"
                      >
                        Paste Sample Holidays
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-purple-200">
                      2026-01-26 | Republic Day | National Holiday
                    </div>
                    <p className="text-[11px] text-slate-500">
                      You can paste data copied directly from Excel, CSV, Google Sheets, or PDF calendar lists.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Paste Holiday Calendar Rows <span className="text-purple-600">*</span>
                    </label>
                    <textarea
                      rows={6}
                      required
                      placeholder="Paste date and holiday name rows here..."
                      value={holidayImportText}
                      onChange={(e) => setHolidayImportText(e.target.value)}
                      className="w-full px-3 py-2 font-mono text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setHolidayTab("list")}
                      className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={holidayImportSubmitting || !holidayImportText.trim()}
                      className="px-5 py-2 font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{holidayImportSubmitting ? "Importing Holidays..." : "Import Holidays to Calendar"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Leave Settings Modal: Configure Leave Types & Quotas */}
      {isLeaveSettingsModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsLeaveSettingsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
              <div className="flex items-center space-x-2.5">
                <Settings className="w-5 h-5 text-blue-300" />
                <div>
                  <h3 className="text-sm font-bold tracking-wide">
                    Leave Types &amp; Annual Quota Settings
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Rename leave types, configure annual quotas, or create new custom leave types. Types with 0 days are excluded from cards.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLeaveSettingsModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveLeaveSettings} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {leaveSettingsMsg && (
                <div
                  className={`p-3 rounded-xl border flex items-center space-x-2 ${
                    leaveSettingsMsg.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {leaveSettingsMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span className="font-semibold">{leaveSettingsMsg.text}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                    Configured Leave Types ({leaveTypesConfigList.length})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Edit names, quotas, or accrual rates below
                  </span>
                </div>

                {leaveTypesConfigList.map((type, idx) => (
                  <div
                    key={type.id || idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          required
                          value={type.name}
                          onChange={(e) => handleUpdateLeaveTypeField(idx, { name: e.target.value })}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white text-xs w-full max-w-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Leave Type Name"
                        />
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          type.isPaid ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }`}>
                          {type.isPaid ? "Paid Leave" : "Unpaid / LWP"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={type.isPaid}
                            onChange={(e) => handleUpdateLeaveTypeField(idx, { isPaid: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span>Paid</span>
                        </label>

                        {!type.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomLeaveType(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                            title="Delete custom leave type"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200/80">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Annual Quota Days {type.annualDays === 0 && <span className="text-amber-600">(0d = Hidden)</span>}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={365}
                          step={0.5}
                          value={type.annualDays}
                          onChange={(e) =>
                            handleUpdateLeaveTypeField(idx, {
                              annualDays: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2.5 py-1 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Monthly Accrual (Days / Month)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          step={0.1}
                          value={type.accrualRate || 0}
                          onChange={(e) =>
                            handleUpdateLeaveTypeField(idx, {
                              accrualRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2.5 py-1 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Leave Type Box */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-3">
                <span className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Plus className="w-4 h-4 text-blue-700" /> + Add Custom Leave Type
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      New Leave Type Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maternity Leave, Comp-Off..."
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Annual Days
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      step={0.5}
                      value={newTypeDays}
                      onChange={(e) => setNewTypeDays(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddCustomLeaveType}
                      disabled={!newTypeName.trim()}
                      className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Type</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-600">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTypeIsPaid}
                      onChange={(e) => setNewTypeIsPaid(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Is Paid Leave</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span>Accrual (Days/Mo):</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={0.1}
                      value={newTypeAccrual}
                      onChange={(e) => setNewTypeAccrual(parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-xs bg-white text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Total Paid Quota Preview Pill */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">Total Configured Annual Paid Quota:</span>
                <span className="font-extrabold text-emerald-800 text-sm bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">
                  {leaveTypesConfigList
                    .filter((t) => t.isPaid)
                    .reduce((sum, t) => sum + (parseFloat(String(t.annualDays)) || 0), 0)}{" "}
                  Days / Year
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveSettingsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveSettingsLoading}
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{leaveSettingsLoading ? "Saving Changes..." : "Save Leave Quotas"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
