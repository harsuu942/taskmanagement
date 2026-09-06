"use client";

import React from "react";
import { Task, User } from "@/types";
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  RotateCw,
  Flame,
  ShieldCheck,
  Check,
  Plus,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import { formatDuration } from "@/lib/formatters";

interface KanbanBoardProps {
  tasks: Task[];
  currentUser: User | null;
  onSelectTask: (task: Task) => void;
  onTimerAction: (taskId: string, action: "start" | "hold" | "resume" | "stop" | "complete") => Promise<void>;
  onAdminApprove: (taskId: string) => Promise<void>;
  onAdminRevision: (taskId: string) => Promise<void>;
  onOpenCreateModal: () => void;
}

export default function KanbanBoard({
  tasks,
  currentUser,
  onSelectTask,
  onTimerAction,
  onAdminApprove,
  onAdminRevision,
  onOpenCreateModal,
}: KanbanBoardProps) {
  const isAdmin = currentUser?.role === "ADMIN";

  // Filter tasks into 5 columns
  const todoTasks = tasks.filter(
    (t) => t.employeeStatus === "TODO" && t.adminStatus !== "FINAL_COMPLETED"
  );
  const inProgressTasks = tasks.filter(
    (t) => t.employeeStatus === "IN_PROGRESS" && t.adminStatus !== "FINAL_COMPLETED"
  );
  const onHoldTasks = tasks.filter(
    (t) => t.employeeStatus === "ON_HOLD" && t.adminStatus !== "FINAL_COMPLETED"
  );
  const underReviewTasks = tasks.filter(
    (t) =>
      t.employeeStatus === "COMPLETED" &&
      (t.adminStatus === "PENDING_REVIEW" || t.adminStatus === "NOT_SUBMITTED")
  );
  const finalCompletedTasks = tasks.filter(
    (t) => t.adminStatus === "FINAL_COMPLETED"
  );

  const columns = [
    {
      id: "todo",
      title: "To Do",
      count: todoTasks.length,
      tasks: todoTasks,
      headerBorder: "border-slate-400",
      bgBadge: "bg-slate-200 text-slate-700",
      description: "Ready for work",
    },
    {
      id: "inprogress",
      title: "In Progress",
      count: inProgressTasks.length,
      tasks: inProgressTasks,
      headerBorder: "border-blue-500",
      bgBadge: "bg-blue-100 text-blue-800 font-bold",
      description: "Active work with timer",
    },
    {
      id: "onhold",
      title: "On Hold",
      count: onHoldTasks.length,
      tasks: onHoldTasks,
      headerBorder: "border-amber-400",
      bgBadge: "bg-amber-100 text-amber-800 font-bold",
      description: "Paused sessions",
    },
    {
      id: "review",
      title: "Under Review",
      count: underReviewTasks.length,
      tasks: underReviewTasks,
      headerBorder: "border-purple-500",
      bgBadge: "bg-purple-100 text-purple-800 font-bold",
      description: "Employee Completed &bull; Needs Admin Sign-off",
    },
    {
      id: "completed",
      title: "Final Completed",
      count: finalCompletedTasks.length,
      tasks: finalCompletedTasks,
      headerBorder: "border-emerald-500",
      bgBadge: "bg-emerald-100 text-emerald-800 font-bold",
      description: "Admin Approved & Locked",
    },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-600" /> URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-200">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
            LOW
          </span>
        );
    }
  };

  const getRecurrenceBadge = (task: Task) => {
    if (task.recurrence === "ONE_TIME") return null;
    return (
      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200 max-w-[150px] truncate">
        <RotateCw className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="truncate">
          {task.recurrence === "MONTHLY" && task.monthlyDay ? `Monthly (${task.monthlyDay}th)` : task.recurrence}
        </span>
      </span>
    );
  };

  return (
    <div className="w-full">
      {/* Board Columns Container with Smooth Horizontal Scroll and Generous Widths */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 w-full min-h-[calc(100vh-210px)] items-start">
        {columns.map((col) => (
          <div
            key={col.id}
            className="w-[310px] min-w-[310px] max-w-[310px] flex-shrink-0 bg-slate-100/90 rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col max-h-[calc(100vh-210px)]"
          >
            {/* Column Header */}
            <div className={`pb-2.5 mb-3 border-b-2 ${col.headerBorder} flex items-center justify-between`}>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {col.title}
                  </span>
                  <span className={`text-[11px] px-2 py-0.2 rounded-full ${col.bgBadge}`}>
                    {col.count}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {col.description}
                </div>
              </div>

              {col.id === "todo" && (
                <button
                  onClick={onOpenCreateModal}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition"
                  title="Create new task"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Column Tasks Scrollable Area */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {col.tasks.length === 0 ? (
                <div className="h-32 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                  <span>No tasks in this column</span>
                </div>
              ) : (
                col.tasks.map((task) => {
                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group relative flex flex-col justify-between space-y-3"
                    >
                      {/* Top Row: Task Key & Badges */}
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">
                            TASK-{task.id.slice(-4).toUpperCase()}
                          </span>
                          {getPriorityBadge(task.priority)}
                          {getRecurrenceBadge(task)}
                        </div>

                        {/* Live Timer Pill */}
                        {task.isTimerRunning && (
                          <div className="flex items-center space-x-1 bg-amber-50 border border-amber-300 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            <span>TIMER ON</span>
                          </div>
                        )}
                      </div>

                      {/* Task Title (clear and never cut off) */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-relaxed">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Due Date & Time Spent */}
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span className="font-mono font-bold text-slate-800">
                            {formatDuration(task.totalDurationSeconds)}
                          </span>
                        </div>

                        {task.dueDate && (
                          <div className="flex items-center space-x-1 text-slate-500">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Assignee & Status Badges */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center space-x-1.5">
                          {task.assignedTo ? (
                            <div className="flex items-center space-x-1.5" title={`${task.assignedTo.name} (${task.assignedTo.email})`}>
                              {task.assignedTo.avatar ? (
                                <img
                                  src={task.assignedTo.avatar}
                                  alt={task.assignedTo.name}
                                  className="w-5 h-5 rounded-full border border-slate-200 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                  {task.assignedTo.name.slice(0, 1)}
                                </div>
                              )}
                              <span className="text-[11px] text-slate-700 font-medium truncate max-w-[110px]">
                                {task.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                          )}
                        </div>

                        {task.adminStatus === "PENDING_REVIEW" && (
                          <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                            Admin Review
                          </span>
                        )}
                        {task.adminStatus === "FINAL_COMPLETED" && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Approved
                          </span>
                        )}
                      </div>

                      {/* Action Bar on Card (spacious and clear) */}
                      <div
                        className="pt-2 border-t border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {col.id === "todo" && (
                          <button
                            onClick={() => onTimerAction(task.id, "start")}
                            className="w-full bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 border border-blue-200"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start Work & Timer</span>
                          </button>
                        )}

                        {col.id === "inprogress" && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onTimerAction(task.id, "hold")}
                              className="flex-1 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-900 text-xs font-bold py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 border border-amber-300"
                              title="Pause work and timer"
                            >
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Hold</span>
                            </button>
                            <button
                              onClick={() => onTimerAction(task.id, "complete")}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 shadow-xs"
                              title="Mark complete and submit for Admin sign-off"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Complete</span>
                            </button>
                          </div>
                        )}

                        {col.id === "onhold" && (
                          <button
                            onClick={() => onTimerAction(task.id, "resume")}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Resume Timer</span>
                          </button>
                        )}

                        {col.id === "review" && (
                          <div className="space-y-1.5">
                            {isAdmin ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => onAdminApprove(task.id)}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1 shadow-xs"
                                  title="Approve as Final Completed"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => onAdminRevision(task.id)}
                                  className="flex-1 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold py-1.5 px-2 rounded-lg transition border border-slate-300"
                                  title="Request revision"
                                >
                                  <span>Revise</span>
                                </button>
                              </div>
                            ) : (
                              <div className="text-center text-[11px] text-purple-700 font-bold bg-purple-50 py-1 px-2 rounded-lg border border-purple-200">
                                ⏳ Submitted &bull; Awaiting Admin Approval
                              </div>
                            )}
                          </div>
                        )}

                        {col.id === "completed" && (
                          <div className="flex items-center justify-between text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Final Approved
                            </span>
                            <span className="font-mono text-[11px] text-emerald-900">
                              {formatDuration(task.totalDurationSeconds)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
