"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, LeaveRequest, LeaveStats, LeaveType, LeaveStatus } from "@/types";
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
  const [applyReason, setApplyReason] = useState("");
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Fetch Leaves & Stats
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

  // Calculated day count for form
  const calculatedDays = useMemo(() => {
    if (applyType === "HALF_DAY") return 0.5;
    if (!applyStartDate || !applyEndDate) return 1;
    const start = new Date(applyStartDate).getTime();
    const end = new Date(applyEndDate).getTime();
    if (end < start) return 0;
    return Math.round((end - start) / (1000 * 3600 * 24)) + 1;
  }, [applyStartDate, applyEndDate, applyType]);

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

    setApplySubmitting(true);
    setApplyError(null);

    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: isAdmin ? applyUserId : currentUser?.id,
          leaveType: applyType,
          startDate: applyStartDate,
          endDate: applyEndDate,
          daysCount: applyType === "HALF_DAY" ? 1 : calculatedDays,
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
      setApplyStartDate(todayStr);
      setApplyEndDate(todayStr);
      await fetchLeaves();
      if (onLeaveUpdated) onLeaveUpdated();
    } catch (err: any) {
      setApplyError(err.message);
    } finally {
      setApplySubmitting(false);
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

        {/* Action button */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              setApplyUserId(currentUser?.id || "");
              setApplyType("CASUAL");
              setApplyStartDate(todayStr);
              setApplyEndDate(todayStr);
              setApplyReason("");
              setApplyError(null);
              setIsApplyModalOpen(true);
            }}
            className="bg-white hover:bg-rose-50 text-rose-900 px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4 text-rose-600" />
            <span>{isAdmin ? "Apply Leave (Staff / Self)" : "Apply for Leave"}</span>
          </button>
        </div>
      </div>

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
                  {[
                    { type: "CASUAL", label: "Casual Leave", icon: Coffee },
                    { type: "SICK", label: "Sick Leave", icon: HeartPulse },
                    { type: "EARNED", label: "Earned / Paid", icon: Palmtree },
                    { type: "UNPAID", label: "Unpaid Leave", icon: Calendar },
                    { type: "HALF_DAY", label: "Half Day", icon: Sun },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = applyType === t.type;
                    return (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => setApplyType(t.type as LeaveType)}
                        className={`p-2 rounded-lg border text-left flex items-center space-x-2 transition ${
                          isSelected
                            ? "bg-rose-50 border-rose-500 text-rose-900 font-bold ring-1 ring-rose-500"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-rose-600" : "text-slate-400"}`} />
                        <span className="text-[11px]">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={applyStartDate}
                    onChange={(e) => {
                      setApplyStartDate(e.target.value);
                      if (applyEndDate < e.target.value) {
                        setApplyEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none font-medium"
                  />
                </div>

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
              </div>

              {/* Total Duration Banner */}
              <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-semibold text-rose-900">
                <span>Calculated Total Duration:</span>
                <span className="font-extrabold text-rose-800 bg-white px-2 py-0.5 rounded border border-rose-200">
                  {applyType === "HALF_DAY" ? "0.5 Day (Half Day)" : `${calculatedDays} Calendar Day(s)`}
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
                  disabled={applySubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{applySubmitting ? "Submitting..." : "Submit Leave Application"}</span>
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
    </div>
  );
}
