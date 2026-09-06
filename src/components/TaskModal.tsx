"use client";

import React, { useState, useEffect } from "react";
import { Task, User, RecurrenceType, PriorityType, Client } from "@/types";
import {
  X,
  Calendar,
  RotateCw,
  Flag,
  User as UserIcon,
  Clock,
  AlertCircle,
  Building2,
  Plus,
  Lock,
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
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
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
      setAssignedToId(taskToEdit.assignedToId || "");
      setClientId(taskToEdit.clientId || "");
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
      setClientId(initialClientId || "");
      setAssignedToId(isEmployee && currentUser ? currentUser.id : "");
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
      setClientId(data.client.id);
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
    const finalAssignedToId = isEmployee ? currentUser?.id : (assignedToId || null);

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
        assignedToId: finalAssignedToId,
        clientId: clientId || null,
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

          {/* Client Selector with Quick Add Button */}
          <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-cyan-950 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-700" />
                <span>Select Client Name</span>
              </label>
              <button
                type="button"
                onClick={() => setShowQuickAddClient(!showQuickAddClient)}
                className="text-[11px] text-cyan-700 hover:text-cyan-900 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Quick Add Client</span>
              </button>
            </div>

            {/* Quick Add Form Inline */}
            {showQuickAddClient && (
              <div className="mb-3 p-3 bg-white rounded-lg border border-cyan-300 shadow-2xs space-y-2">
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
                    className="px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={quickClientLoading}
                    onClick={handleQuickAddClient}
                    className="px-3 py-1 text-[11px] bg-cyan-600 text-white font-bold rounded hover:bg-cyan-700"
                  >
                    {quickClientLoading ? "Adding..." : "Add & Select"}
                  </button>
                </div>
              </div>
            )}

            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-cyan-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none font-medium text-slate-800"
            >
              <option value="">-- No Client (Internal Practice Deliverable) --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company ? `${c.company} — Contact: ${c.name}` : c.name}
                </option>
              ))}
            </select>
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

          {/* Assignee & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Assignee Section */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Assignee
              </label>

              {isEmployee ? (
                /* Locked to self for employees */
                <div className="p-2 bg-slate-100 border border-slate-300 rounded-lg text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <UserIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="font-bold text-slate-900 truncate">
                      {currentUser?.name} <span className="text-blue-700">(You)</span>
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 flex-shrink-0">
                    <Lock className="w-2.5 h-2.5" /> Self Only
                  </span>
                </div>
              ) : (
                /* Admin can assign to any employee */
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Employee...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) - {u.email}
                    </option>
                  ))}
                </select>
              )}

              {isEmployee && (
                <p className="text-[10px] text-slate-500 mt-1">
                  * Employees can create tasks for themselves only.
                </p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Priority Level
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
