"use client";

import React, { useState } from "react";
import { Task, User, Client } from "@/types";
import {
  Clock,
  Play,
  Pause,
  CheckCircle2,
  Calendar,
  RotateCw,
  Search,
  Filter,
  Flame,
  ShieldCheck,
  Check,
  X,
  RotateCcw,
  Tag,
  Building2,
  Lock,
  Edit3,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { formatDuration } from "@/lib/formatters";

interface TaskListViewProps {
  tasks: Task[];
  currentUser: User | null;
  allUsers: User[];
  clients?: Client[];
  onSelectTask: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onTimerAction: (taskId: string, action: "start" | "hold" | "resume" | "stop" | "complete") => Promise<void>;
  onAdminApprove: (taskId: string) => Promise<void>;
  onAdminRevision: (taskId: string) => Promise<void>;
}

export default function TaskListView({
  tasks,
  currentUser,
  allUsers,
  clients = [],
  onSelectTask,
  onEditTask,
  onDeleteTask,
  onTimerAction,
  onAdminApprove,
  onAdminRevision,
}: TaskListViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("ALL");
  const [filterClient, setFilterClient] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterRecurrence, setFilterRecurrence] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const isAdmin = currentUser?.role === "ADMIN";

  // Helper to check if task is overdue
  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate) return false;
    if (task.adminStatus === "FINAL_COMPLETED" || task.employeeStatus === "COMPLETED") return false;
    return new Date(task.dueDate).getTime() < Date.now();
  };

  // Base visible tasks for this user
  const visibleBaseTasks = tasks
    .filter((t) => t.adminStatus !== "FINAL_COMPLETED")
    .filter((t) => isAdmin || t.assignedToId === currentUser?.id);

  const overdueTasksCount = visibleBaseTasks.filter(isTaskOverdue).length;

  // Check if any filter is active
  const isFiltered =
    searchTerm.trim() !== "" ||
    filterAssignee !== "ALL" ||
    filterClient !== "ALL" ||
    filterPriority !== "ALL" ||
    filterRecurrence !== "ALL" ||
    filterStatus !== "ALL";

  // Dedicated Clear Filters function
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterAssignee("ALL");
    setFilterClient("ALL");
    setFilterPriority("ALL");
    setFilterRecurrence("ALL");
    setFilterStatus("ALL");
  };

  // Tasks in the active list view exclude FINAL_COMPLETED (they move to the Completed Tasks tab)
  const filteredTasks = tasks
    .filter((t) => t.adminStatus !== "FINAL_COMPLETED")
    .filter((t) => {
      // Strict Rule 1: Employees can see his/her tasks only
      if (!isAdmin && t.assignedToId !== currentUser?.id) {
        return false;
      }

      if (searchTerm) {
        const matchTitle = t.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchDesc = t.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchClient = t.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.client?.company?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchTitle && !matchDesc && !matchClient) return false;
      }

      if (isAdmin && filterAssignee !== "ALL" && t.assignedToId !== filterAssignee) return false;
      if (filterClient !== "ALL" && t.clientId !== filterClient) return false;
      if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
      if (filterRecurrence !== "ALL" && t.recurrence !== filterRecurrence) return false;
      if (filterStatus !== "ALL") {
        if (filterStatus === "OVERDUE") return isTaskOverdue(t);
        if (filterStatus === "PENDING_REVIEW" && t.adminStatus !== "PENDING_REVIEW") return false;
        if (filterStatus === "IN_PROGRESS" && t.employeeStatus !== "IN_PROGRESS") return false;
        if (filterStatus === "ON_HOLD" && t.employeeStatus !== "ON_HOLD") return false;
        if (filterStatus === "TODO" && t.employeeStatus !== "TODO") return false;
      }
      return true;
    });

  // Dynamic row background & border based on employee status
  const getRowStyle = (task: Task) => {
    if (task.adminStatus === "FINAL_COMPLETED") {
      return "bg-emerald-50/90 hover:bg-emerald-100/90 border-l-4 border-l-emerald-600 text-emerald-950";
    }

    if (isTaskOverdue(task)) {
      return "bg-rose-50/70 hover:bg-rose-100/80 border-l-4 border-l-rose-600 text-rose-950";
    }

    switch (task.employeeStatus) {
      case "IN_PROGRESS":
        return "bg-blue-50/80 hover:bg-blue-100/80 border-l-4 border-l-blue-600 text-blue-950";
      case "ON_HOLD":
        return "bg-amber-50/80 hover:bg-amber-100/80 border-l-4 border-l-amber-500 text-amber-950";
      case "COMPLETED":
        return "bg-purple-50/80 hover:bg-purple-100/80 border-l-4 border-l-purple-600 text-purple-950";
      case "TODO":
      default:
        return "bg-white hover:bg-slate-50 border-l-4 border-l-slate-300 text-slate-900";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden w-full">
      {/* Search & Filter Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        {/* Search with inline clear */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={!isAdmin ? "Search your tasks or client names..." : "Search tasks by title, description, or client..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Client Filter */}
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="text-xs bg-white border border-cyan-300 rounded-lg px-3 py-2 text-cyan-950 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold shadow-2xs"
          >
            <option value="ALL">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || c.name}
              </option>
            ))}
          </select>

          {/* Assignee Filter (Only Admin sees the full team selector) */}
          {isAdmin ? (
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium shadow-2xs"
            >
              <option value="ALL">All Assignees</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-800 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-blue-600" />
              <span>Your Tasks Only</span>
            </div>
          )}

          {/* Recurrence */}
          <select
            value={filterRecurrence}
            onChange={(e) => setFilterRecurrence(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium shadow-2xs"
          >
            <option value="ALL">All Recurrence</option>
            <option value="ONE_TIME">One-time</option>
            <option value="DAILY">Daily (7:00 AM)</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="HALF_YEARLY">Half Yearly</option>
            <option value="YEARLY">Yearly</option>
          </select>

          {/* Priority */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium shadow-2xs"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status Filter (Overdue option available on both sides) */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium shadow-2xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="OVERDUE">⚠️ Overdue Tasks ({overdueTasksCount})</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="PENDING_REVIEW">Awaiting Admin Review</option>
          </select>

          {/* Quick Overdue Filter Button on Both Sides */}
          {overdueTasksCount > 0 && (
            <button
              onClick={() => setFilterStatus(filterStatus === "OVERDUE" ? "ALL" : "OVERDUE")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs ${
                filterStatus === "OVERDUE"
                  ? "bg-rose-600 text-white border border-rose-700 shadow-rose-500/20"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              }`}
              title="Filter by Overdue tasks"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overdue ({overdueTasksCount})</span>
            </button>
          )}

          {/* Prominent Clear Filters Button */}
          <button
            onClick={handleClearFilters}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs ${
              isFiltered
                ? "bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200"
                : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
            }`}
            title="Reset all filters and search keyword"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
            {isFiltered && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Row Color Status Legend */}
      <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-200 text-[11px] text-slate-600 flex items-center gap-4 flex-wrap">
        <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Tag className="w-3 h-3" /> Status Row Color Code:
        </span>
        <span className="flex items-center gap-1 font-semibold text-slate-700">
          <span className="w-3 h-3 rounded-sm bg-white border-2 border-slate-300 inline-block"></span> To Do (White/Gray)
        </span>
        <span className="flex items-center gap-1 font-semibold text-blue-700">
          <span className="w-3 h-3 rounded-sm bg-blue-100 border-2 border-blue-500 inline-block"></span> In Progress (Blue)
        </span>
        <span className="flex items-center gap-1 font-semibold text-amber-700">
          <span className="w-3 h-3 rounded-sm bg-amber-100 border-2 border-amber-500 inline-block"></span> On Hold (Amber)
        </span>
        <span className="flex items-center gap-1 font-semibold text-purple-700">
          <span className="w-3 h-3 rounded-sm bg-purple-100 border-2 border-purple-500 inline-block"></span> Completed / Review (Purple)
        </span>
        <span className="flex items-center gap-1 font-semibold text-emerald-700">
          <span className="w-3 h-3 rounded-sm bg-emerald-100 border-2 border-emerald-500 inline-block"></span> Final Approved (Green)
        </span>
      </div>

      {/* Task Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Task Name</th>
              <th className="py-3 px-3">Client</th>
              <th className="py-3 px-3">Assignee</th>
              <th className="py-3 px-3">Recurrence</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Due Date</th>
              <th className="py-3 px-3">Timer Logged</th>
              <th className="py-3 px-3">Employee Status</th>
              <th className="py-3 px-3">Admin Status</th>
              <th className="py-3 px-4 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-14 text-center text-slate-400">
                  <div className="text-sm font-semibold text-slate-600">No tasks found</div>
                  <p className="text-xs text-slate-400 mt-1">
                    {!isAdmin ? "You currently have no tasks matching this filter." : "Try resetting search filters or create a new task."}
                  </p>
                  {isFiltered && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-3 px-4 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className={`transition-all cursor-pointer group ${getRowStyle(task)}`}
                >
                  {/* Task Name */}
                  <td className="py-3.5 px-4 font-bold max-w-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                        TASK-{task.id.slice(-4).toUpperCase()}
                      </span>
                      <span className="truncate group-hover:text-blue-700 transition-colors">
                        {task.title}
                      </span>
                    </div>
                    {task.description && (
                      <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                        {task.description}
                      </div>
                    )}
                  </td>

                  {/* Client Column */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {task.client ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-900 border border-cyan-200 text-[11px] font-bold truncate max-w-[150px] shadow-2xs">
                        <Building2 className="w-3 h-3 text-cyan-700 flex-shrink-0" />
                        <span className="truncate">{task.client.company || task.client.name}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">-</span>
                    )}
                  </td>

                  {/* Assignee */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {task.assignedTo ? (
                      <div className="flex items-center space-x-2" title={`${task.assignedTo.name} (${task.assignedTo.email})`}>
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
                        <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                          {task.assignedTo.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Recurrence */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="bg-white/80 text-indigo-700 font-bold px-2.5 py-1 rounded-full text-[10px] border border-indigo-200 flex items-center gap-1.5 w-max shadow-2xs">
                      <RotateCw className="w-3 h-3 text-indigo-500" />
                      {task.recurrence === "WEEKLY" && task.weeklyDay
                        ? `Weekly (${task.weeklyDay})`
                        : task.recurrence === "MONTHLY" && task.monthlyDay
                        ? `Monthly (${task.monthlyDay}th)`
                        : task.recurrence === "QUARTERLY" && task.monthlyDay
                        ? `Quarterly (Day ${task.monthlyDay})`
                        : task.recurrence === "DAILY"
                        ? "Daily (7:00 AM)"
                        : task.recurrence}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                        task.priority === "URGENT"
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : task.priority === "HIGH"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : task.priority === "MEDIUM"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {task.priority === "URGENT" && <Flame className="w-2.5 h-2.5 text-rose-600" />}
                      {task.priority}
                    </span>
                  </td>

                  {/* Due Date & Overdue Badge */}
                  <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">
                    {task.dueDate ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className={isTaskOverdue(task) ? "text-rose-700 font-bold" : ""}>
                            {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        {isTaskOverdue(task) && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300 w-max animate-pulse">
                            ⚠️ OVERDUE
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Timer Logged */}
                  <td className="py-3.5 px-3 whitespace-nowrap font-mono font-semibold">
                    <div className="flex items-center space-x-1 text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDuration(task.totalDurationSeconds)}</span>
                    </div>
                  </td>

                  {/* Employee Status */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        task.employeeStatus === "COMPLETED"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : task.employeeStatus === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : task.employeeStatus === "ON_HOLD"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {task.employeeStatus}
                    </span>
                  </td>

                  {/* Admin Status */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {task.adminStatus === "FINAL_COMPLETED" ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Approved
                      </span>
                    ) : task.adminStatus === "PENDING_REVIEW" ? (
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 animate-pulse">
                        Awaiting Review
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Normal</span>
                    )}
                  </td>

                  {/* Quick Actions Column: Edit, Delete, Timer, Approve */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* Edit Task Action */}
                      {onEditTask && (isAdmin || task.assignedToId === currentUser?.id || task.createdById === currentUser?.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTask(task);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-semibold transition border border-slate-200"
                          title="Edit Task Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Task Action (Admin or Task Creator) */}
                      {onDeleteTask && (isAdmin || task.createdById === currentUser?.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${task.title}"? This cannot be undone.`)) {
                              onDeleteTask(task.id);
                            }
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-lg text-xs font-semibold transition border border-slate-200"
                          title={isAdmin ? "Delete Task (Admin)" : "Delete My Task"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Timer controls */}
                      {task.adminStatus !== "FINAL_COMPLETED" && (
                        <>
                          {task.isTimerRunning ? (
                            <button
                              onClick={() => onTimerAction(task.id, "hold")}
                              className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold transition"
                              title="Hold Timer"
                            >
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : task.employeeStatus === "ON_HOLD" ? (
                            <button
                              onClick={() => onTimerAction(task.id, "resume")}
                              className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-xs font-semibold transition"
                              title="Resume Timer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onTimerAction(task.id, "start")}
                              className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition"
                              title="Start Timer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                        </>
                      )}

                      {/* Admin Quick Approve if pending */}
                      {isAdmin && task.adminStatus === "PENDING_REVIEW" && (
                        <button
                          onClick={() => onAdminApprove(task.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                          title="Approve & Finalize Task"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
