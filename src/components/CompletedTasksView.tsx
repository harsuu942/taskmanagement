"use client";

import React, { useState } from "react";
import { Task, User, Client } from "@/types";
import {
  CheckCircle2,
  Clock,
  Calendar,
  RotateCw,
  Search,
  Flame,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Download,
  Filter,
  Building2,
  Lock,
} from "lucide-react";
import { formatDuration } from "@/lib/formatters";

interface CompletedTasksViewProps {
  tasks: Task[];
  currentUser: User | null;
  allUsers: User[];
  clients?: Client[];
  onSelectTask: (task: Task) => void;
}

export default function CompletedTasksView({
  tasks,
  currentUser,
  allUsers,
  clients = [],
  onSelectTask,
}: CompletedTasksViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("ALL");
  const [filterClient, setFilterClient] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterRecurrence, setFilterRecurrence] = useState("ALL");

  const isAdmin = currentUser?.role === "ADMIN";

  const isCompletedVisible = (t: Task) => {
    if (t.adminStatus !== "FINAL_COMPLETED") return false;
    if (isAdmin) return true;
    if (t.assignedToId === currentUser?.id) return true;
    if (t.assignees && t.assignees.some((a) => a.userId === currentUser?.id)) return true;
    if (t.createdById === currentUser?.id) return true;
    return false;
  };

  // Only show tasks that are finalized by Admin
  const completedTasks = tasks.filter(isCompletedVisible);

  const filteredTasks = completedTasks.filter((t) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchClient =
        t.client?.name?.toLowerCase().includes(q) ||
        t.client?.company?.toLowerCase().includes(q) ||
        t.taskClients?.some(
          (tc) =>
            tc.client?.name?.toLowerCase().includes(q) ||
            (tc.client?.company && tc.client.company.toLowerCase().includes(q))
        );
      if (!matchTitle && !matchDesc && !matchClient) return false;
    }
    if (isAdmin && filterAssignee !== "ALL") {
      const hasAssignee =
        t.assignedToId === filterAssignee ||
        (t.assignees && t.assignees.some((a) => a.userId === filterAssignee));
      if (!hasAssignee) return false;
    }
    if (filterClient !== "ALL") {
      const hasClient =
        t.clientId === filterClient ||
        (t.taskClients && t.taskClients.some((tc) => tc.clientId === filterClient));
      if (!hasClient) return false;
    }
    if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
    if (filterRecurrence !== "ALL" && t.recurrence !== filterRecurrence) return false;
    return true;
  });

  const totalTimeSeconds = completedTasks.reduce((acc, t) => acc + (t.totalDurationSeconds || 0), 0);

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterAssignee("ALL");
    setFilterClient("ALL");
    setFilterPriority("ALL");
    setFilterRecurrence("ALL");
  };

  const isFiltered =
    searchTerm.trim() !== "" ||
    filterAssignee !== "ALL" ||
    filterClient !== "ALL" ||
    filterPriority !== "ALL" ||
    filterRecurrence !== "ALL";

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner with Stats */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Completed &amp; Approved Tasks</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                {isAdmin
                  ? "Archived deliverables approved and finalized by Admin"
                  : `Your finalized and approved deliverables (${currentUser?.name})`}
              </p>
            </div>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-white/15 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20 text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">
              {isAdmin ? "Total Finalized" : "Your Completed"}
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">{completedTasks.length} tasks</div>
          </div>

          <div className="bg-white/15 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20 text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Total Time Logged</div>
            <div className="text-xl font-extrabold font-mono text-white mt-0.5">{formatDuration(totalTimeSeconds)}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden w-full">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isAdmin ? "Search completed tasks or clients..." : "Search your completed deliverables..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Client Filter */}
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="text-xs bg-white border border-cyan-300 rounded-lg px-3 py-2 text-cyan-950 font-semibold"
            >
              <option value="ALL">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company || c.name}
                </option>
              ))}
            </select>

            {/* Assignee Filter (Only Admin sees the whole team selector) */}
            {isAdmin ? (
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium"
              >
                <option value="ALL">All Assignees</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-800 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Your Completed Only</span>
              </div>
            )}

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={filterRecurrence}
              onChange={(e) => setFilterRecurrence(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium"
            >
              <option value="ALL">All Recurrence</option>
              <option value="ONE_TIME">One-time</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="HALF_YEARLY">Half Yearly</option>
              <option value="YEARLY">Yearly</option>
            </select>

            {isFiltered && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Table of Completed Tasks */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Task Name</th>
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3">Completed By</th>
                <th className="py-3 px-3">Recurrence</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Total Time Spent</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-4 text-right">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-slate-600">No completed tasks found</div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {!isAdmin
                        ? "You do not have any finalized tasks under this filter yet."
                        : "Once an Admin approves completed tasks, they will automatically appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="hover:bg-emerald-50/60 transition-all cursor-pointer bg-white border-l-4 border-l-emerald-600"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                          TASK-{task.id.slice(-4).toUpperCase()}
                        </span>
                        <span className="truncate group-hover:text-emerald-700 transition-colors">
                          {task.title}
                        </span>
                      </div>
                      {task.description && (
                        <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                          {task.description}
                        </div>
                      )}
                    </td>

                    {/* Client (Supports Multiple) */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {task.taskClients && task.taskClients.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {task.taskClients.map((tc) => (
                            <span
                              key={tc.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-900 border border-cyan-200 text-[10px] font-bold truncate max-w-[150px] shadow-2xs"
                              title={tc.client?.company ? `${tc.client.company} (${tc.client?.name || ""})` : tc.client?.name || ""}
                            >
                              <Building2 className="w-2.5 h-2.5 text-cyan-700 flex-shrink-0" />
                              <span className="truncate">{tc.client?.company || tc.client?.name || "Client"}</span>
                            </span>
                          ))}
                        </div>
                      ) : task.client ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-900 border border-cyan-200 text-[11px] font-bold truncate max-w-[150px] shadow-2xs">
                          <Building2 className="w-3 h-3 text-cyan-700 flex-shrink-0" />
                          <span className="truncate">{task.client.company || task.client.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* Completed By (Supports Multiple Assignees) */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {task.assignees && task.assignees.length > 0 ? (
                        <div
                          className="flex items-center space-x-1.5"
                          title={task.assignees.map((a) => `${a.user?.name || ""} (${a.user?.email || ""})`).join(", ")}
                        >
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {task.assignees.slice(0, 3).map((a) =>
                              a.user?.avatar ? (
                                <img
                                  key={a.id}
                                  src={a.user.avatar}
                                  alt={a.user?.name || ""}
                                  className="inline-block w-6 h-6 rounded-full ring-2 ring-white"
                                />
                              ) : (
                                <div
                                  key={a.id}
                                  className="inline-block w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center ring-2 ring-white"
                                >
                                  {a.user?.name ? a.user.name.slice(0, 1) : "?"}
                                </div>
                              )
                            )}
                          </div>
                          <span className="font-semibold text-slate-800 text-xs">
                            {task.assignees.length === 1
                              ? (task.assignees[0].user?.name || "1 member")
                              : `${task.assignees.length} members`}
                          </span>
                        </div>
                      ) : task.assignedTo ? (
                        <div className="flex items-center space-x-2">
                          {task.assignedTo.avatar ? (
                            <img
                              src={task.assignedTo.avatar}
                              alt={task.assignedTo.name}
                              className="w-6 h-6 rounded-full border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                              {task.assignedTo.name.slice(0, 1)}
                            </div>
                          )}
                          <span className="font-semibold text-slate-800">
                            {task.assignedTo.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-slate-200 flex items-center gap-1 w-max">
                        <RotateCw className="w-2.5 h-2.5 text-slate-500" />
                        {task.recurrence}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {task.priority}
                      </span>
                    </td>

                    {/* Total Time Spent & Billable Hours Comparison */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-mono font-bold text-emerald-700">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{formatDuration(task.totalDurationSeconds)}</span>
                      </div>
                      {task.billableHours !== undefined && task.billableHours !== null && task.billableHours > 0 && (() => {
                        const actualHours = (task.totalDurationSeconds || 0) / 3600;
                        const diff = actualHours - task.billableHours;
                        const isOver = diff > 0.05;
                        return (
                          <div className="mt-1 font-sans">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                isOver
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                              title={`Budgeted: ${task.billableHours}h | Actual: ${actualHours.toFixed(2)}h (${
                                isOver ? `+${diff.toFixed(1)}h over budget` : `${Math.abs(diff).toFixed(1)}h under budget`
                              })`}
                            >
                              Est: {task.billableHours}h {isOver ? `(+${diff.toFixed(1)}h)` : "✓ On Budget"}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">
                      {task.dueDate ? (
                        new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full text-[11px] border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Final Approved</span>
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
  );
}
