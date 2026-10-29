"use client";

import React, { useState, useEffect } from "react";
import { Task, User } from "@/types";
import {
  RotateCw,
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";

interface RecurringTasksViewProps {
  currentUser: User | null;
  onOpenCreateModal: () => void;
}

export default function RecurringTasksView({
  currentUser,
  onOpenCreateModal,
}: RecurringTasksViewProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<any | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scheduler");
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const triggerSchedulerCycle = async () => {
    setRunningScheduler(true);
    setScheduleResult(null);
    try {
      const res = await fetch("/api/scheduler", {
        method: "POST",
      });
      const data = await res.json();
      setScheduleResult(data);
      fetchTemplates();
    } catch (e: any) {
      setScheduleResult({ success: false, error: e.message });
    } finally {
      setRunningScheduler(false);
    }
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTemplates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTemplates.map((t) => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected recurring template(s)?`)) return;

    setBulkDeleting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds: Array.from(selectedIds),
          userId: currentUser?.id,
          role: currentUser?.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to delete templates");
      setSelectedIds(new Set());
      await fetchTemplates();
    } catch (e: any) {
      alert(e.message || "Failed to delete templates");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the recurring template "${title}"? Future automatic task generation for this schedule will be stopped.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${templateId}?userId=${currentUser?.id}&role=${currentUser?.role}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete recurring template");
        return;
      }
      fetchTemplates();
    } catch (e: any) {
      alert(e.message || "Error deleting recurring template");
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";

  // For employees, strictly isolate to only their own assigned recurring tasks
  const userTemplates = templates.filter((tpl) => {
    if (!isAdmin) {
      const isDirectAssignee = tpl.assignedToId === currentUser?.id || tpl.assignedTo?.id === currentUser?.id;
      const isMultiAssignee = tpl.assignees && tpl.assignees.some((a: any) => a.userId === currentUser?.id);
      const isCreator = tpl.createdById === currentUser?.id;
      return isDirectAssignee || isMultiAssignee || isCreator;
    }
    return true;
  });

  const filteredTemplates = userTemplates.filter((tpl) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = tpl.title.toLowerCase().includes(term);
      const matchDesc = tpl.description?.toLowerCase().includes(term);
      const matchUser = tpl.assignedTo?.name?.toLowerCase().includes(term);
      const matchClient = tpl.client?.company?.toLowerCase().includes(term) || tpl.client?.name?.toLowerCase().includes(term);
      if (!matchTitle && !matchDesc && !matchUser && !matchClient) return false;
    }

    if (frequencyFilter !== "ALL" && tpl.recurrence !== frequencyFilter) {
      return false;
    }

    if (priorityFilter !== "ALL" && tpl.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  const dailyCount = userTemplates.filter((t) => t.recurrence === "DAILY").length;
  const monthlyCount = userTemplates.filter((t) => t.recurrence === "MONTHLY").length;
  const extendedCount = userTemplates.filter((t) =>
    ["WEEKLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"].includes(t.recurrence)
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
              <RotateCw className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {isAdmin ? "Recurring Task Schedule Engine" : "My Recurring Tasks & Automations"}
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                {isAdmin
                  ? "Automated morning dispatch at 7:00 AM, day-specific monthly schedules, and compliance cycles"
                  : "Your personal recurring tasks automatically spawned into your task list every morning at 7:00 AM"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <button
            disabled={runningScheduler}
            onClick={triggerSchedulerCycle}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-md flex items-center space-x-1.5 cursor-pointer"
            title="Spawns all pending recurring tasks for today into your task list immediately"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{runningScheduler ? "Generating..." : "⚡ Generate Today's Tasks Now"}</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="bg-white hover:bg-slate-100 text-slate-900 font-extrabold px-4 py-2.5 rounded-xl text-xs transition shadow-md flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Add Task</span>
          </button>
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Templates</span>
            <RotateCw className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{templates.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active automations</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Daily 7:00 AM</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{dailyCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Morning list spawns</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Monthly Day-Based</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{monthlyCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Assigned on chosen day</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Extended</span>
            <RotateCw className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">{extendedCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Weekly, Quarterly, Yearly</div>
        </div>
      </div>

      {/* Scheduler Result Notice */}
      {scheduleResult && (
        <div className="p-4 rounded-xl text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">{scheduleResult.message}</div>
              <div className="text-[11px] text-indigo-700 mt-0.5">
                Tasks generated: {scheduleResult.taskResults?.generatedCount || 0} | Absent check: {scheduleResult.absentResults?.flaggedAbsentCount || 0} flagged
              </div>
            </div>
          </div>
          <button
            onClick={() => setScheduleResult(null)}
            className="text-xs font-bold underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Recurring Templates List / Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-bold text-slate-800">
              {isAdmin ? "Recurring Task Templates" : "My Recurring Task Schedules"} ({filteredTemplates.length})
            </h4>
            <button
              onClick={fetchTemplates}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
              title="Refresh templates"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="Search templates by title, employee, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none font-medium text-slate-700"
              >
                <option value="ALL">All Frequencies</option>
                <option value="DAILY">Daily (7:00 AM)</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="HALF_YEARLY">Half-Yearly</option>
                <option value="YEARLY">Yearly</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none font-medium text-slate-700"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {(searchTerm || frequencyFilter !== "ALL" || priorityFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFrequencyFilter("ALL");
                    setPriorityFilter("ALL");
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Templates Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredTemplates.length > 0 && selectedIds.size === filteredTemplates.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    title="Select / deselect all templates"
                  />
                </th>
                <th className="py-3 px-4">Template Title & Client</th>
                <th className="py-3 px-4">Frequency</th>
                <th className="py-3 px-4">Schedule / Rule</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assigned Staff</th>
                <th className="py-3 px-4 text-center">Last Generated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    {isAdmin
                      ? "No recurring templates match your search filter. Click \"+ Add Schedule\" to configure one."
                      : "No recurring task schedules found for you. Click \"+ Add Schedule\" to create a recurring task."}
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((tpl) => (
                  <tr key={tpl.id} className={`hover:bg-slate-50 transition ${selectedIds.has(tpl.id) ? "bg-purple-50/50" : ""}`}>
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tpl.id)}
                        onChange={() => toggleSelect(tpl.id)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="font-extrabold text-slate-900 text-xs">{tpl.title}</div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        {tpl.client && (
                          <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                            🏢 {tpl.client.company || tpl.client.name}
                          </span>
                        )}
                        {tpl.description && (
                          <span className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                            {tpl.description}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {tpl.recurrence === "DAILY" ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-emerald-200">
                          ● Daily (7:00 AM)
                        </span>
                      ) : tpl.recurrence === "MONTHLY" ? (
                        <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-blue-200">
                          ● Monthly (Day {tpl.monthlyDay || 1})
                        </span>
                      ) : tpl.recurrence === "WEEKLY" ? (
                        <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-purple-200">
                          ● Weekly ({tpl.weeklyDay || "Monday"})
                        </span>
                      ) : tpl.recurrence === "QUARTERLY" ? (
                        <span className="bg-cyan-100 text-cyan-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-cyan-200">
                          ● Quarterly (Day {tpl.monthlyDay || 1})
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-amber-200">
                          ● {tpl.recurrence}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {tpl.recurrence === "MONTHLY" && tpl.monthlyDay ? (
                        <span>Day {tpl.monthlyDay} of every month</span>
                      ) : tpl.recurrence === "DAILY" ? (
                        <span>Every morning at 7:00 AM</span>
                      ) : tpl.recurrence === "WEEKLY" ? (
                        <span>Every week on {tpl.weeklyDay || "Monday"}</span>
                      ) : tpl.recurrence === "QUARTERLY" ? (
                        <span>Every 3 months on Day {tpl.monthlyDay || 1}</span>
                      ) : tpl.recurrence === "HALF_YEARLY" ? (
                        <span>Every 6 months</span>
                      ) : tpl.recurrence === "YEARLY" ? (
                        <span>Annually on start date</span>
                      ) : (
                        <span>Scheduled cycle</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          tpl.priority === "URGENT"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : tpl.priority === "HIGH"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : tpl.priority === "MEDIUM"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {tpl.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {tpl.assignedTo ? (
                        <div className="flex items-center space-x-2">
                          {tpl.assignedTo.avatar ? (
                            <img
                              src={tpl.assignedTo.avatar}
                              alt={tpl.assignedTo.name}
                              className="w-6 h-6 rounded-full border border-slate-200"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                              {tpl.assignedTo.name?.slice(0, 1) || "E"}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-800">{tpl.assignedTo.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {tpl.assignedTo.designation || "Team Member"}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                      {tpl.lastGeneratedDate ? (
                        <div>
                          <div className="font-semibold text-slate-800">
                            {new Date(tpl.lastGeneratedDate).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(tpl.lastGeneratedDate).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pending First Cycle</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.title)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                        title="Delete recurring template"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-4 animate-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-bold text-slate-200">
            ✓ {selectedIds.size} recurring template{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <button
            disabled={bulkDeleting}
            onClick={handleBulkDelete}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{bulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}</span>
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

