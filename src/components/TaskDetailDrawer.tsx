"use client";

import React, { useState, useEffect } from "react";
import { Task, User, TimeLog, Client, PriorityType, RecurrenceType, TaskProof, AttendanceRosterItem } from "@/types";
import {
  X,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  RotateCw,
  Calendar,
  ShieldCheck,
  Flame,
  User as UserIcon,
  Trash2,
  AlertTriangle,
  History,
  Check,
  RefreshCw,
  Building2,
  Edit3,
  Lock,
  Save,
  Maximize2,
  Plus,
  Users,
  Camera,
  UploadCloud,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { formatDuration } from "@/lib/formatters";

interface TaskDetailDrawerProps {
  task: Task | null;
  onClose: () => void;
  currentUser: User | null;
  allUsers: User[];
  clients?: Client[];
  userAttendance?: AttendanceRosterItem | null;
  onTimerAction: (taskId: string, action: "start" | "hold" | "resume" | "stop" | "complete") => Promise<void>;
  onAdminApprove: (taskId: string) => Promise<void>;
  onAdminRevision: (taskId: string) => Promise<void>;
  onTaskUpdated: () => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onEditTask?: (task: Task) => void;
}

export default function TaskDetailDrawer({
  task,
  onClose,
  currentUser,
  allUsers,
  clients = [],
  userAttendance,
  onTimerAction,
  onAdminApprove,
  onAdminRevision,
  onTaskUpdated,
  onDeleteTask,
  onEditTask,
}: TaskDetailDrawerProps) {
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Manual time log form state
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualDurationMinutes, setManualDurationMinutes] = useState("");
  const [manualLogNote, setManualLogNote] = useState("");
  const [manualLogDate, setManualLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualLogTargetUserId, setManualLogTargetUserId] = useState("");
  const [manualLogLoading, setManualLogLoading] = useState(false);
  const [manualLogError, setManualLogError] = useState<string | null>(null);

  // Admin Direct Time Override state
  const [showAdminTimeEdit, setShowAdminTimeEdit] = useState(false);
  const [adminTotalHours, setAdminTotalHours] = useState("");
  const [adminTotalMins, setAdminTotalMins] = useState("");
  const [adminTimeTargetUser, setAdminTimeTargetUser] = useState("");
  const [adminTimeNote, setAdminTimeNote] = useState("");
  const [adminTimeLoading, setAdminTimeLoading] = useState(false);
  const [adminTimeError, setAdminTimeError] = useState<string | null>(null);

  // Task Proofs & Screenshot state
  const [proofsList, setProofsList] = useState<TaskProof[]>([]);
  const [capturingScreen, setCapturingScreen] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [selectedProof, setSelectedProof] = useState<TaskProof | null>(null);

  const fetchProofs = async () => {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/proofs`);
      const data = await res.json();
      if (res.ok && data.proofs) {
        setProofsList(data.proofs);
      }
    } catch (e) {
      console.error("Error fetching proofs:", e);
    }
  };

  const handleCaptureScreen = async () => {
    if (!task) return;
    try {
      setCapturingScreen(true);
      // Request screen capture from browser
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

      // Stop all tracks immediately
      stream.getTracks().forEach((track) => track.stop());

      // Save to server
      const res = await fetch(`/api/tasks/${task.id}/proofs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          source: "WEB_CAPTURE",
          caption: `Screen proof • ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save screenshot");
      await fetchProofs();
      onTaskUpdated();
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        alert(err.message || "Screen capture canceled or error occurred");
      }
    } finally {
      setCapturingScreen(false);
    }
  };

  const handleUploadImageFile = async (file: File) => {
    if (!task) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }
    try {
      setUploadingProof(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawData = e.target?.result as string;
        if (!rawData) return;

        const img = new Image();
        img.onload = async () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedData = canvas.toDataURL("image/jpeg", 0.75);

          const res = await fetch(`/api/tasks/${task.id}/proofs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: compressedData,
              source: "MANUAL_UPLOAD",
              caption: file.name.slice(0, 50),
              userId: currentUser?.id,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to upload image");
          await fetchProofs();
          onTaskUpdated();
          setUploadingProof(false);
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || "Failed to process image");
      setUploadingProof(false);
    }
  };

  const handleDeleteProof = async (proofId: string) => {
    if (!task) return;
    if (!confirm("Are you sure you want to delete this screenshot proof?")) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/proofs?proofId=${proofId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchProofs();
        onTaskUpdated();
        if (selectedProof?.id === proofId) setSelectedProof(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Edit form fields
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<PriorityType>("MEDIUM");
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceType>("ONE_TIME");
  const [editMonthlyDay, setEditMonthlyDay] = useState<number>(1);
  const [editWeeklyDay, setEditWeeklyDay] = useState<string>("Monday");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignedToId, setEditAssignedToId] = useState("");
  const [editClientId, setEditClientId] = useState("");

  // Sync edit form fields when task changes
  useEffect(() => {
    if (task) {
      setEditTitle(task.title || "");
      setEditDescription(task.description || "");
      setEditPriority(task.priority || "MEDIUM");
      setEditRecurrence(task.recurrence || "ONE_TIME");
      setEditMonthlyDay(task.monthlyDay || 1);
      setEditWeeklyDay(task.weeklyDay || "Monday");
      setEditStartDate(task.startDate ? new Date(task.startDate).toISOString().slice(0, 16) : "");
      setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
      setEditAssignedToId(task.assignedToId || "");
      setEditClientId(task.clientId || "");
      setManualLogTargetUserId(task.assignedToId || currentUser?.id || "");
      const totalSecs = task.totalDurationSeconds || 0;
      setAdminTotalHours(Math.floor(totalSecs / 3600).toString());
      setAdminTotalMins(Math.floor((totalSecs % 3600) / 60).toString());
      setAdminTimeTargetUser(task.assignedToId || currentUser?.id || "");
      setShowAdminTimeEdit(false);
      setIsEditing(false);
      setEditError(null);
      if (task.proofs) {
        setProofsList(task.proofs);
      } else {
        fetchProofs();
      }
    }
  }, [task, currentUser]);

  // Live stopwatch counter
  useEffect(() => {
    if (!task) return;

    let baseSeconds = task.totalDurationSeconds || 0;

    if (task.isTimerRunning && task.currentTimerStartedAt) {
      const startTime = new Date(task.currentTimerStartedAt).getTime();

      const updateTicker = () => {
        const now = Date.now();
        const sessionDiff = Math.max(0, Math.floor((now - startTime) / 1000));
        setLiveSeconds(baseSeconds + sessionDiff);
      };

      updateTicker();
      const interval = setInterval(updateTicker, 1000);
      return () => clearInterval(interval);
    } else {
      setLiveSeconds(baseSeconds);
    }
  }, [task]);

  // Listen for Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!task) return null;

  const isAdmin = currentUser?.role === "ADMIN";
  const isEmployee = currentUser?.role === "EMPLOYEE";
  const isCreatedByAdmin = task.createdBy?.role === "ADMIN";
  const isCreatedByMe = task.createdById === currentUser?.id;
  const isAssignedToMe = task.assignedToId === currentUser?.id;
  const isFinalComplete = task.adminStatus === "FINAL_COMPLETED";
  const isCheckedIn = !userAttendance || isAdmin || (
    userAttendance.status === "PRESENT" ||
    (!!userAttendance.checkInTime && !userAttendance.checkOutTime && !userAttendance.isOnBreak && userAttendance.status !== "CHECKED_OUT")
  );

  // Permission policy:
  // Employees can edit tasks assigned to them OR created by them. Admins can edit any task.
  const canEditTaskDetails = isAdmin || isAssignedToMe || isCreatedByMe;

  // Employees can delete ONLY tasks they created themselves. Admins can delete any task.
  const canDelete = isAdmin || isCreatedByMe;

  const formatTimerClock = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleEmployeeStatusChange = async (newStatus: string) => {
    try {
      await fetch(`/api/tasks/${task.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          role: currentUser?.role,
          employeeStatus: newStatus,
        }),
      });
      onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError("Title is required");
      return;
    }

    setSaveLoading(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          role: currentUser?.role,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          priority: editPriority,
          recurrence: editRecurrence,
          monthlyDay: (editRecurrence === "MONTHLY" || editRecurrence === "QUARTERLY") ? editMonthlyDay : null,
          weeklyDay: editRecurrence === "WEEKLY" ? editWeeklyDay : null,
          startDate: editStartDate ? new Date(editStartDate) : null,
          dueDate: editDueDate ? new Date(editDueDate) : null,
          assignedToId: isEmployee ? (task.assignedToId || currentUser?.id) : (editAssignedToId || null),
          clientId: editClientId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update task");
      }

      setIsEditing(false);
      onTaskUpdated();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleManualLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseFloat(manualDurationMinutes);
    if (!mins || mins <= 0) {
      setManualLogError("Please enter a valid positive duration in minutes");
      return;
    }
    setManualLogLoading(true);
    setManualLogError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_log",
          durationMinutes: mins,
          note: manualLogNote.trim() || "Manual time entry",
          logDate: manualLogDate,
          userId: currentUser?.id,
          targetUserId: manualLogTargetUserId || task.assignedToId || currentUser?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log time");
      setManualDurationMinutes("");
      setManualLogNote("");
      setShowManualLog(false);
      onTaskUpdated();
    } catch (err: any) {
      setManualLogError(err.message);
    } finally {
      setManualLogLoading(false);
    }
  };

  const handleAdminSaveTotalTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(adminTotalHours || "0", 10);
    const m = parseInt(adminTotalMins || "0", 10);
    const totalSecs = Math.max(0, h * 3600 + m * 60);

    setAdminTimeLoading(true);
    setAdminTimeError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_set_time",
          totalDurationSeconds: totalSecs,
          targetUserId: adminTimeTargetUser || task.assignedToId || currentUser?.id,
          note: adminTimeNote.trim() || `Admin adjusted duration to ${h}h ${m}m`,
          userId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update duration");
      setShowAdminTimeEdit(false);
      onTaskUpdated();
    } catch (err: any) {
      setAdminTimeError(err.message);
    } finally {
      setAdminTimeLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-full sm:max-w-xl md:max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2 flex-wrap gap-1">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">
              TASK-{task.id.slice(-5).toUpperCase()}
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="bg-indigo-50 text-indigo-700 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200">
              <RotateCw className="w-3 h-3" />
              {task.recurrence === "MONTHLY" && task.monthlyDay ? `Monthly (Day ${task.monthlyDay})` : task.recurrence}
            </span>

            {/* Creator Badge */}
            {isCreatedByAdmin ? (
              <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-600" />
                Created by Admin
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                Created by {task.createdBy?.name || "Employee"}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Edit details button if permitted */}
            {canEditTaskDetails && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  if (onEditTask) {
                    onEditTask(task);
                  } else {
                    setIsEditing(true);
                  }
                }}
                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                title="Edit Task Details"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            {/* Delete button: Admins can delete any task; Employees can delete ONLY tasks they created themselves */}
            {canDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
                    onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                title={isAdmin ? "Delete Task (Admin)" : "Delete My Task"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <span
                className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded-md border border-slate-200"
                title="Tasks created by Admin can only be deleted by Admin."
              >
                🔒 Delete: Admin Only
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition border border-transparent hover:border-slate-300 cursor-pointer flex items-center justify-center"
              title="Close Window (Esc)"
              aria-label="Close Window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-20 space-y-5">
          {/* Permission Notice Banner for Users who do not have edit rights */}
          {!canEditTaskDetails && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="text-[11px] leading-relaxed">
                <strong>Read Only Task:</strong> You do not have permission to edit this task. You can still update your work status and track time below.
              </div>
            </div>
          )}

          {/* EDIT FORM (When Editing) */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="bg-slate-50 p-4 rounded-2xl border border-blue-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  Edit Task Details
                </span>
                <div className="flex items-center space-x-2">
                  {onEditTask && (
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                      title="Open full edit modal"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Full Modal</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {editError && (
                <div className="p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              {/* Client Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-cyan-600" />
                  Client
                </label>
                <select
                  value={editClientId}
                  onChange={(e) => setEditClientId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- No Client (Internal) --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.company} (${c.name})` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as PriorityType)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Recurrence
                  </label>
                  <select
                    value={editRecurrence}
                    onChange={(e) => setEditRecurrence(e.target.value as RecurrenceType)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ONE_TIME">One Time</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half Yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              {editRecurrence === "WEEKLY" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Day of the Week
                  </label>
                  <select
                    value={editWeeklyDay}
                    onChange={(e) => setEditWeeklyDay(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {(editRecurrence === "MONTHLY" || editRecurrence === "QUARTERLY") && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Date of the Month (1-31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={editMonthlyDay}
                    onChange={(e) => setEditMonthlyDay(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Assignee - Admin can reassign, employee is locked to self */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Assignee
                </label>
                {isAdmin ? (
                  <select
                    value={editAssignedToId}
                    onChange={(e) => setEditAssignedToId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Unassigned</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2 bg-slate-100 rounded text-xs text-slate-700 font-semibold border border-slate-200">
                    {currentUser?.name} (Locked to self)
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveLoading ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* VIEW MODE */
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {task.title}
                </h2>
              </div>

              {/* Client Info Pill (Supports Multiple Clients) */}
              {task.taskClients && task.taskClients.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {task.taskClients.map((tc) => (
                    <div
                      key={tc.id}
                      className="inline-flex items-center space-x-1.5 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-lg text-xs text-cyan-950 font-semibold shadow-2xs"
                    >
                      <Building2 className="w-3.5 h-3.5 text-cyan-700 flex-shrink-0" />
                      <span>{tc.client?.company ? `${tc.client.company} (${tc.client?.name || ""})` : tc.client?.name || "Client"}</span>
                    </div>
                  ))}
                </div>
              ) : task.client ? (
                <div className="mt-2 inline-flex items-center space-x-2 bg-cyan-50 border border-cyan-200 px-3 py-1.5 rounded-xl text-xs text-cyan-900 font-semibold shadow-2xs">
                  <Building2 className="w-4 h-4 text-cyan-700 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold">{task.client.company || task.client.name}</span>
                    {task.client.company && (
                      <span className="text-cyan-700 text-[11px] font-normal ml-1">
                        (Contact: {task.client.name})
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-2 inline-flex items-center space-x-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] text-slate-500 font-medium">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span>Internal / Practice Task</span>
                </div>
              )}

              {task.description && (
                <p className="text-xs text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {task.description}
                </p>
              )}
            </div>
          )}

          {/* TWO-TIER STATUS & APPROVAL WORKFLOW SECTION */}
          <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                  Dual-Tier Role Status &amp; Approvals
                </h3>
              </div>
              <span className="text-[10px] bg-white text-blue-800 font-semibold px-2 py-0.5 rounded border border-blue-200">
                Role-Gated
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* 1. Employee Task Status */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>1. Employee Task Status</span>
                  {task.employeeStatus === "COMPLETED" && (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Submitted
                    </span>
                  )}
                </div>

                <select
                  disabled={isFinalComplete}
                  value={task.employeeStatus}
                  onChange={(e) => handleEmployeeStatusChange(e.target.value)}
                  className="w-full mt-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="TODO">To Do (Pending)</option>
                  <option value="IN_PROGRESS">In Progress (Ongoing)</option>
                  <option value="ON_HOLD">On Hold (Paused)</option>
                  <option value="COMPLETED">Completed (Submit for Admin Approval)</option>
                </select>

                <p className="text-[10px] text-slate-500 mt-2">
                  When employee sets to <strong>Completed</strong>, task is submitted to Admin for final approval.
                </p>
              </div>

              {/* 2. Admin Task Status */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>2. Admin Final Status</span>
                  {isFinalComplete ? (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Finalized
                    </span>
                  ) : task.adminStatus === "PENDING_REVIEW" ? (
                    <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                      Pending Approval
                    </span>
                  ) : null}
                </div>

                {isAdmin ? (
                  <div className="mt-1.5 space-y-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onAdminApprove(task.id)}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs ${
                          isFinalComplete
                            ? "bg-emerald-700 text-white cursor-default"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isFinalComplete ? "Final Approved ✓" : "Approve & Complete"}</span>
                      </button>

                      <button
                        onClick={() => onAdminRevision(task.id)}
                        className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 transition"
                        title="Send back for revision"
                      >
                        Revise
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500">
                      Admin action completes the task permanently and locks the duration.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-slate-700 py-1 px-2.5 rounded bg-slate-50 border border-slate-200">
                      {task.adminStatus === "FINAL_COMPLETED"
                        ? "🎉 Final Approved by Admin"
                        : task.adminStatus === "PENDING_REVIEW"
                        ? "⏳ Awaiting Admin Sign-off"
                        : task.adminStatus === "REVISION_REQUESTED"
                        ? "⚠️ Revision Requested by Admin"
                        : "Not yet submitted to Admin"}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 italic">
                      * Only Admin has permission to mark a task as Final Completed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PER-TASK INTERACTIVE TIMER WIDGET */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Live Task Timer &amp; Duration
                  </span>
                  {task.isTimerRunning && (
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold px-2 py-0.2 rounded-full animate-pulse">
                      ● RUNNING
                    </span>
                  )}
                </div>

                <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white mt-1">
                  {formatTimerClock(liveSeconds)}
                </div>

                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Total cumulative logged time: {formatDuration(task.totalDurationSeconds)}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAdminTimeEdit(!showAdminTimeEdit)}
                      className="text-amber-400 hover:text-amber-300 font-bold underline text-[11px] cursor-pointer"
                    >
                      {showAdminTimeEdit ? "Close Adjustment" : "👑 Admin Adjust Duration"}
                    </button>
                  )}
                </p>
              </div>

              {/* Timer Action Buttons */}
              <div className="flex items-center space-x-2">
                {isFinalComplete ? (
                  <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Task Finalized (Timer Locked)</span>
                  </div>
                ) : task.isTimerRunning ? (
                  <>
                    <button
                      onClick={() => onTimerAction(task.id, "hold")}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Hold Timer</span>
                    </button>

                    <button
                      onClick={() => onTimerAction(task.id, "complete")}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Task</span>
                    </button>
                  </>
                ) : task.employeeStatus === "ON_HOLD" ? (
                  <button
                    disabled={!isCheckedIn}
                    onClick={() => {
                      if (!isCheckedIn) {
                        alert("You cannot resume task work without checking in. Please check in in the Attendance Register first.");
                        return;
                      }
                      onTimerAction(task.id, "resume");
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md ${
                      !isCheckedIn
                        ? "bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30 cursor-pointer"
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume Work</span>
                  </button>
                ) : (
                  <button
                    disabled={!isCheckedIn}
                    onClick={() => {
                      if (!isCheckedIn) {
                        alert("You cannot start task work without checking in. Please check in in the Attendance Register first.");
                        return;
                      }
                      onTimerAction(task.id, "start");
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md ${
                      !isCheckedIn
                        ? "bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30 cursor-pointer"
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Timer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Check-in requirement alert if user is employee and not checked in */}
            {!isCheckedIn && !isFinalComplete && (
              <div className="mt-2 p-2.5 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Check-in required: Please submit <strong>Check-In</strong> in the Attendance Register before starting a task timer.
                </span>
              </div>
            )}

            {/* Admin Direct Duration Override Form */}
            {showAdminTimeEdit && isAdmin && (
              <form
                onSubmit={handleAdminSaveTotalTime}
                className="mt-3 p-3.5 bg-amber-950/50 border border-amber-500/50 rounded-xl space-y-3"
              >
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Direct Duration Adjustment (If employee forgot to start timer)</span>
                </div>
                {adminTimeError && (
                  <div className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800">
                    {adminTimeError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">Hours</label>
                    <input
                      type="number"
                      min="0"
                      value={adminTotalHours}
                      onChange={(e) => setAdminTotalHours(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-amber-500/40 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={adminTotalMins}
                      onChange={(e) => setAdminTotalMins(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-amber-500/40 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">Attribute To</label>
                    <select
                      value={adminTimeTargetUser}
                      onChange={(e) => setAdminTimeTargetUser(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-amber-500/40 rounded-lg text-white"
                    >
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">Adjustment Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Employee forgot timer"
                      value={adminTimeNote}
                      onChange={(e) => setAdminTimeNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-amber-500/40 rounded-lg text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdminTimeEdit(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adminTimeLoading}
                    className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition cursor-pointer"
                  >
                    {adminTimeLoading ? "Saving..." : "Apply Duration Override"}
                  </button>
                </div>
              </form>
            )}

            {/* Quick Toggle: Log Time Manually */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Prefer entering hours manually?</span>
              <button
                type="button"
                onClick={() => setShowManualLog(!showManualLog)}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showManualLog ? "Hide Manual Entry" : "Log Time Manually"}</span>
              </button>
            </div>

            {/* Manual Time Entry Form */}
            {showManualLog && (
              <form
                onSubmit={handleManualLogTime}
                className="mt-3 p-3.5 bg-slate-800/90 rounded-xl border border-slate-700 space-y-3"
              >
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Manual Time Entry</span>
                </div>

                {manualLogError && (
                  <div className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800">
                    {manualLogError}
                  </div>
                )}

                {isAdmin && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Log on Behalf Of Employee:
                    </label>
                    <select
                      value={manualLogTargetUserId}
                      onChange={(e) => setManualLogTargetUserId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white outline-none font-medium"
                    >
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Duration (Minutes) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="e.g. 60"
                      value={manualDurationMinutes}
                      onChange={(e) => setManualDurationMinutes(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white outline-none font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Work Date
                    </label>
                    <input
                      type="date"
                      value={manualLogDate}
                      onChange={(e) => setManualLogDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Note / Description
                    </label>
                    <input
                      type="text"
                      placeholder="Work notes..."
                      value={manualLogNote}
                      onChange={(e) => setManualLogNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowManualLog(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={manualLogLoading}
                    className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {manualLogLoading ? "Logging..." : "Log Minutes"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* BILLABLE VS ACTUAL HOURS COMPARISON */}
          {task.billableHours !== undefined && task.billableHours !== null && task.billableHours > 0 && (() => {
            const actualHours = (task.totalDurationSeconds || 0) / 3600;
            const pct = Math.min(100, Math.round((actualHours / task.billableHours) * 100));
            const diff = actualHours - task.billableHours;
            const isOver = diff > 0.05;

            return (
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Billable vs. Actual Hours
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isOver
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : pct >= 90
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border-emerald-300"
                    }`}
                  >
                    {isOver ? `+${diff.toFixed(1)}h Over Budget` : `${(task.billableHours - actualHours).toFixed(1)}h Remaining`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Budgeted</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">{task.billableHours} hrs</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Actual Taken</div>
                    <div className="text-sm font-bold text-blue-700 font-mono mt-0.5">{actualHours.toFixed(2)} hrs</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Variance</div>
                    <div className={`text-sm font-bold font-mono mt-0.5 ${isOver ? "text-rose-600" : "text-emerald-600"}`}>
                      {diff > 0 ? `+${diff.toFixed(2)}h` : `${diff.toFixed(2)}h`}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-1">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isOver ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                    <span>0h</span>
                    <span>{pct}% of budget utilized</span>
                    <span>{task.billableHours}h</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Properties Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Priority</span>
              <div className="mt-1 font-semibold text-slate-800 flex items-center gap-1">
                {task.priority === "URGENT" ? (
                  <span className="text-rose-600 font-bold flex items-center gap-1"><Flame className="w-3 h-3" /> Urgent</span>
                ) : task.priority === "HIGH" ? (
                  <span className="text-amber-700 font-bold">High</span>
                ) : (
                  <span>{task.priority}</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Assignees</span>
              <div className="mt-1 font-medium text-slate-800 truncate" title={task.assignees && task.assignees.length > 0 ? task.assignees.map(a => a.user?.name || "").join(", ") : task.assignedTo?.name || "Unassigned"}>
                {task.assignees && task.assignees.length > 0
                  ? task.assignees.map((a) => a.user?.name || "").filter(Boolean).join(", ")
                  : task.assignedTo
                  ? task.assignedTo.name
                  : "Unassigned"}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Billable Est.</span>
              <div className="mt-1 font-medium text-slate-800">
                {task.billableHours ? `${task.billableHours} hrs` : "N/A"}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Start Date</span>
              <div className="mt-1 font-medium text-slate-700">
                {task.startDate ? new Date(task.startDate).toLocaleDateString([], { month: "short", day: "numeric" }) : "-"}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Deadline</span>
              <div className="mt-1 font-medium text-slate-700">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" }) : "-"}
              </div>
            </div>
          </div>

          {/* Time Tracking History / Sessions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                <History className="w-4 h-4 text-blue-600" />
                <span>Timer Work Sessions ({task.timeLogs?.length || 0})</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700">
                Total: {formatDuration(task.totalDurationSeconds)}
              </span>
            </div>

            {task.timeLogs && task.timeLogs.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {task.timeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {log.note || "Work session"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(log.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {log.endTime ? ` - ${new Date(log.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " (Currently Active)"}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                      {formatDuration(log.durationSeconds)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No timer sessions logged yet. Click "Start Timer" to begin tracking work.
              </div>
            )}
          </div>

          {/* Work Proofs & Screenshots Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                <Camera className="w-4 h-4 text-purple-600" />
                <span>Work Proofs & Screenshots ({proofsList.length})</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={capturingScreen}
                  onClick={handleCaptureScreen}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Capture live screen snapshot as proof of work"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{capturingScreen ? "Capturing..." : "Capture Screen"}</span>
                </button>

                <label
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                  title="Upload screenshot or work picture from file"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  <span>{uploadingProof ? "Uploading..." : "Upload Proof"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImageFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              💡 Tip: Click &ldquo;Capture Screen&rdquo; to take a live window snapshot, or upload screenshots from your computer.
            </p>

            {proofsList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {proofsList.map((proof) => (
                  <div
                    key={proof.id}
                    className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div
                      onClick={() => setSelectedProof(proof)}
                      className="aspect-video bg-slate-900 cursor-pointer overflow-hidden relative"
                    >
                      <img
                        src={proof.imageUrl}
                        alt={proof.caption || "Task proof"}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        <span>View Full</span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between text-xs space-y-1">
                      <div className="font-semibold text-slate-800 text-[11px] truncate" title={proof.caption || "Proof of Work"}>
                        {proof.caption || "Proof of Work"}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>{proof.user?.name || "Staff"}</span>
                        <span>{new Date(proof.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>

                    {/* Delete button (Admin or owner) */}
                    {(isAdmin || proof.userId === currentUser?.id) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProof(proof.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="Delete proof"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No screenshots or work proofs recorded for this task yet.
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Bar with explicit Close button */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono font-medium">
            TASK-{task.id.slice(-5).toUpperCase()}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close Window</span>
          </button>
        </div>
      </div>

      {/* Proof Lightbox Modal */}
      {selectedProof && (
        <div
          onClick={() => setSelectedProof(null)}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
          >
            <div className="p-3 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
              <div className="text-xs">
                <span className="font-bold">{selectedProof.caption || "Task Screen Proof"}</span>
                <span className="text-slate-400 ml-2">
                  Captured by {selectedProof.user?.name || "Staff"} on {new Date(selectedProof.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-auto flex items-center justify-center bg-black/90">
              <img
                src={selectedProof.imageUrl}
                alt={selectedProof.caption || "Full resolution proof"}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
