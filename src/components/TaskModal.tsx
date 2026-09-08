"use client";

import React, { useState, useEffect } from "react";
import { Task, User, RecurrenceType, PriorityType, Client } from "@/types";
import {
  X,
  Calendar,
  RotateCw,
  Flag,
  User as UserIcon,
  Users,
  Clock,
  AlertCircle,
  Building2,
  Plus,
  Lock,
  Check,
  Search,
} from "lucide-react";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  allUsers: User[];
  clients?: Client[];
  initialClientId?: string;
  taskToEdit?: Task | null;
  onTaskCreated: () => void;
  onRefreshClients?: () => void;
}

export default function TaskModal({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  clients = [],
  initialClientId = "",
  taskToEdit = null,
  onTaskCreated,
  onRefreshClients,
}: TaskModalProps) {
  const isEmployee = currentUser?.role === "EMPLOYEE";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("ONE_TIME");
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [weeklyDay, setWeeklyDay] = useState<string>("Monday");
  const [priority, setPriority] = useState<PriorityType>("MEDIUM");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [billableHours, setBillableHours] = useState<string>("0");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Inline Client Add State
  const [showQuickAddClient, setShowQuickAddClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientCompany, setQuickClientCompany] = useState("");
  const [quickClientEmail, setQuickClientEmail] = useState("");
  const [quickClientLoading, setQuickClientLoading] = useState(false);
  const [quickClientError, setQuickClientError] = useState<string | null>(null);

  // Sync form state based on create vs edit mode
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || "");
      setDescription(taskToEdit.description || "");
      setRecurrence(taskToEdit.recurrence || "ONE_TIME");
      setMonthlyDay(taskToEdit.monthlyDay || 1);
      setWeeklyDay(taskToEdit.weeklyDay || "Monday");
      setPriority(taskToEdit.priority || "MEDIUM");

      // Multi-assignees
      const aIds = taskToEdit.assignees?.map((a) => a.userId) || [];
      if (taskToEdit.assignedToId && !aIds.includes(taskToEdit.assignedToId)) {
        aIds.push(taskToEdit.assignedToId);
      }
      setSelectedAssigneeIds(aIds);

      // Multi-clients
      const cIds = taskToEdit.taskClients?.map((c) => c.clientId) || [];
      if (taskToEdit.clientId && !cIds.includes(taskToEdit.clientId)) {
        cIds.push(taskToEdit.clientId);
      }
      setSelectedClientIds(cIds);

      setBillableHours(
        taskToEdit.billableHours !== undefined && taskToEdit.billableHours !== null
          ? String(taskToEdit.billableHours)
          : "0"
      );

      setStartDate(
        taskToEdit.startDate
          ? new Date(taskToEdit.startDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16)
      );
      setDueDate(
        taskToEdit.dueDate
          ? new Date(taskToEdit.dueDate).toISOString().slice(0, 16)
          : new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 16)
      );
      setError(null);
    } else {
      setSelectedClientIds(initialClientId ? [initialClientId] : []);
      setSelectedAssigneeIds(isEmployee && currentUser ? [currentUser.id] : []);
      setBillableHours("0");
      setTitle("");
      setDescription("");
      setRecurrence("ONE_TIME");
      setMonthlyDay(1);
      setWeeklyDay("Monday");
      setPriority("MEDIUM");
      setStartDate(new Date().toISOString().slice(0, 16));
      setDueDate(new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 16));
      setError(null);
    }
  }, [taskToEdit, initialClientId, isEmployee, currentUser, isOpen]);

  // Listen for Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleToggleAssignee = (id: string) => {
    if (isEmployee) return;
    setSelectedAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim()) {
      setQuickClientError("Contact name is required");
      return;
    }
    setQuickClientLoading(true);
    setQuickClientError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickClientName.trim(),
          company: quickClientCompany.trim() || null,
          email: quickClientEmail.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add client");

      if (onRefreshClients) {
        onRefreshClients();
      }
      setSelectedClientIds((prev) => [...prev, data.client.id]);
      setShowQuickAddClient(false);
      setQuickClientName("");
      setQuickClientCompany("");
      setQuickClientEmail("");
    } catch (err: any) {
      setQuickClientError(err.message);
    } finally {
      setQuickClientLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setLoading(true);
    setError(null);

    // Rule: Employee can only create/edit tasks for themselves
    const finalAssigneeIds = isEmployee
      ? (currentUser ? [currentUser.id] : [])
      : selectedAssigneeIds;
    const primaryAssignedToId = finalAssigneeIds.length > 0 ? finalAssigneeIds[0] : null;

    try {
      const isEditing = !!taskToEdit;
      const url = isEditing ? `/api/tasks/${taskToEdit.id}` : "/api/tasks";
      const method = isEditing ? "PUT" : "POST";

      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        recurrence,
        monthlyDay: (recurrence === "MONTHLY" || recurrence === "QUARTERLY") ? monthlyDay : null,
        weeklyDay: recurrence === "WEEKLY" ? weeklyDay : null,
        priority,
        assignedToId: primaryAssignedToId,
        assigneeIds: finalAssigneeIds,
        clientId: selectedClientIds.length > 0 ? selectedClientIds[0] : null,
        clientIds: selectedClientIds,
        billableHours: parseFloat(billableHours) || 0,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      };

      if (isEditing) {
        payload.userId = currentUser?.id;
        payload.role = currentUser?.role;
      } else {
        payload.createdById = currentUser?.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isEditing ? "Failed to update task" : "Failed to create task"));
      }

      onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {taskToEdit ? `Edit Task: ${taskToEdit.title}` : "Create New Task"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {taskToEdit
                ? "Update task details, schedule, priority, and assignments"
                : isEmployee
                ? "Create a task for yourself with schedule, recurrence, and client"
                : "Specify schedule, recurrence, assignee, client, and priority"}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GST Audit Q3 Filing / Corporate Tax Return Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Multiple Clients Selection */}
          <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-cyan-950 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-700" />
                <span>Select Clients {selectedClientIds.length > 0 && `(${selectedClientIds.length} selected)`}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowQuickAddClient(!showQuickAddClient)}
                className="text-[11px] text-cyan-700 hover:text-cyan-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Quick Add Client</span>
              </button>
            </div>

            {/* Quick Add Form Inline */}
            {showQuickAddClient && (
              <div className="mb-2 p-3 bg-white rounded-lg border border-cyan-300 shadow-2xs space-y-2">
                <div className="text-[11px] font-bold text-slate-800">Add Client on the Fly</div>
                {quickClientError && (
                  <div className="text-[10px] text-rose-600 font-medium">{quickClientError}</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Contact Name *"
                    value={quickClientName}
                    onChange={(e) => setQuickClientName(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={quickClientCompany}
                    onChange={(e) => setQuickClientCompany(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={quickClientEmail}
                    onChange={(e) => setQuickClientEmail(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded outline-none"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQuickAddClient(false)}
                    className="px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={quickClientLoading}
                    onClick={handleQuickAddClient}
                    className="px-3 py-1 text-[11px] bg-cyan-600 text-white font-bold rounded hover:bg-cyan-700 cursor-pointer"
                  >
                    {quickClientLoading ? "Adding..." : "Add & Select"}
                  </button>
                </div>
              </div>
            )}

            {/* Selected Clients Pills */}
            {selectedClientIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedClientIds.map((cid) => {
                  const clientObj = clients.find((c) => c.id === cid);
                  return (
                    <span
                      key={cid}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-cyan-100 text-cyan-900 px-2 py-0.5 rounded-md border border-cyan-300"
                    >
                      <span>{clientObj?.company ? `${clientObj.company} (${clientObj.name})` : clientObj?.name || cid}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleClient(cid)}
                        className="hover:text-rose-600 cursor-pointer ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Client Search & Multi-select list */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clients to select..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-cyan-200 rounded-lg outline-none font-medium text-slate-800"
                />
              </div>

              <div className="max-h-28 overflow-y-auto border border-cyan-200 bg-white rounded-lg p-1.5 divide-y divide-slate-100 space-y-0.5">
                {clients
                  .filter((c) => {
                    if (!clientSearchQuery.trim()) return true;
                    const q = clientSearchQuery.toLowerCase();
                    return (
                      c.name.toLowerCase().includes(q) ||
                      (c.company && c.company.toLowerCase().includes(q))
                    );
                  })
                  .map((c) => {
                    const isSelected = selectedClientIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleClient(c.id)}
                        className={`px-2 py-1 text-xs rounded cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? "bg-cyan-100 text-cyan-950 font-bold"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="truncate">
                          {c.company ? `${c.company} — ${c.name}` : c.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-700 flex-shrink-0" />}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Description / Instructions
            </label>
            <textarea
              rows={2}
              placeholder="Provide context, acceptance criteria, ledger references, or deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Recurrence & Scheduling */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
              <RotateCw className="w-4 h-4 text-indigo-600" />
              <span>Recurrence &amp; Automation Schedule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Recurrence Frequency
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ONE_TIME">One-time Task</option>
                  <option value="DAILY">Daily (Auto-appears at 7:00 AM)</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly (Specific Day of Month)</option>
                  <option value="QUARTERLY">Quarterly (Every 3 Months)</option>
                  <option value="HALF_YEARLY">Half Yearly (Every 6 Months)</option>
                  <option value="YEARLY">Yearly (Annual)</option>
                </select>
              </div>

              {/* Day of Week Selector for Weekly Recurrence */}
              {recurrence === "WEEKLY" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Repeat Day of Week
                  </label>
                  <select
                    value={weeklyDay}
                    onChange={(e) => setWeeklyDay(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    <option value="Monday">Every Monday</option>
                    <option value="Tuesday">Every Tuesday</option>
                    <option value="Wednesday">Every Wednesday</option>
                    <option value="Thursday">Every Thursday</option>
                    <option value="Friday">Every Friday</option>
                    <option value="Saturday">Every Saturday</option>
                    <option value="Sunday">Every Sunday</option>
                  </select>
                </div>
              )}

              {/* Day of Month Selector for Monthly Recurrence */}
              {recurrence === "MONTHLY" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Day of Month (1 - 31)
                  </label>
                  <select
                    value={monthlyDay}
                    onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}
                        {day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of every month
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Day of Month Selector for Quarterly Recurrence */}
              {recurrence === "QUARTERLY" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Quarterly Start Day (1 - 31)
                  </label>
                  <select
                    value={monthlyDay}
                    onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        Day {day} of the quarter
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {recurrence === "DAILY" && (
              <p className="text-[11px] text-blue-700 bg-blue-50/70 p-2 rounded border border-blue-100">
                ✨ <strong>Daily Automation:</strong> This task will automatically appear on the assigned employee's task list every morning at 7:00 AM.
              </p>
            )}

            {recurrence === "WEEKLY" && (
              <p className="text-[11px] text-indigo-700 bg-indigo-50/70 p-2 rounded border border-indigo-100">
                ✨ <strong>Weekly Automation:</strong> Automatically repeats and appears on the assigned employee board every <strong>{weeklyDay}</strong>.
              </p>
            )}

            {recurrence === "MONTHLY" && (
              <p className="text-[11px] text-purple-700 bg-purple-50/70 p-2 rounded border border-purple-100">
                ✨ <strong>Monthly Automation:</strong> Automatically triggers on the {monthlyDay}th of each month and notifies assigned employees.
              </p>
            )}

            {recurrence === "QUARTERLY" && (
              <p className="text-[11px] text-cyan-800 bg-cyan-50/70 p-2 rounded border border-cyan-100">
                ✨ <strong>Quarterly Automation:</strong> Repeats every 3 months starting on <strong>Day {monthlyDay}</strong> of the quarter.
              </p>
            )}
          </div>

          {/* Assignees (Multi-assignee for Admin, Locked for Employee) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {isEmployee
                    ? "Task Assignee"
                    : `Assigned Team Members ${selectedAssigneeIds.length > 0 ? `(${selectedAssigneeIds.length} allocated)` : ""}`}
                </span>
              </label>
              {!isEmployee && (
                <span className="text-[10px] text-slate-400 font-medium">
                  Allocate to 1, 2, or multiple employees
                </span>
              )}
            </div>

            {isEmployee ? (
              /* Locked to self for employees */
              <div className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  <UserIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="font-bold text-slate-900 truncate">
                    {currentUser?.name} <span className="text-blue-700">(You)</span>
                  </span>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium flex items-center gap-1 flex-shrink-0 border border-slate-200">
                  <Lock className="w-2.5 h-2.5" /> Self Assigned
                </span>
              </div>
            ) : (
              /* Admin can multi-select employees */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200 bg-white rounded-lg">
                {allUsers.map((u) => {
                  const isSelected = selectedAssigneeIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleToggleAssignee(u.id)}
                      className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? "bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="truncate">
                        <div>{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate">
                          {u.role} &bull; {u.email}
                        </div>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-1" />
                      ) : (
                        <div className="w-4 h-4 rounded border border-slate-300 flex-shrink-0 ml-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Billable Hours & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Billable Hours */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Billable / Budgeted Hours</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="e.g. 5.0"
                  value={billableHours}
                  onChange={(e) => setBillableHours(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">
                  hours
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Will be compared with actual timer hours upon completion.
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-amber-500" />
                <span>Priority Level</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityType)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent (Immediate attention)</option>
              </select>
            </div>
          </div>

          {/* Start Date & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Deadline / Due Date
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm disabled:opacity-50"
            >
              {loading ? (taskToEdit ? "Saving Changes..." : "Creating Task...") : (taskToEdit ? "Save Changes" : "Create Task")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
