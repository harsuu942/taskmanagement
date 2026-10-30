"use client";

import React, { useState, useEffect } from "react";
import { User, AttendanceRosterItem, Task } from "@/types";
import {
  CheckCircle2,
  Clock,
  LogOut,
  LogIn,
  ListTodo,
  Calendar,
  FileSpreadsheet,
  Users,
  Play,
  Settings,
  ChevronDown,
  Plus,
  ShieldCheck,
  CheckCheck,
  Building2,
  CalendarDays,
  Coffee,
} from "lucide-react";

interface NavbarProps {
  currentUser: User | null;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userAttendance: AttendanceRosterItem | null;
  onCheckIn: () => Promise<void>;
  onCheckOut: () => Promise<void>;
  onTakeBreak?: () => Promise<void>;
  onResumeBreak?: () => Promise<void>;
  activeRunningTask?: Task | null;
  onOpenTaskModal: () => void;
  onOpenSettingsModal: () => void;
  completedTasksCount?: number;
}

export default function Navbar({
  currentUser,
  allUsers,
  onSelectUser,
  onLogout,
  activeTab,
  setActiveTab,
  userAttendance,
  onCheckIn,
  onCheckOut,
  onTakeBreak,
  onResumeBreak,
  activeRunningTask,
  onOpenTaskModal,
  onOpenSettingsModal,
  completedTasksCount = 0,
}: NavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [elapsedWorkSeconds, setElapsedWorkSeconds] = useState(0);
  const [elapsedBreakSeconds, setElapsedBreakSeconds] = useState(0);

  const isOnBreak = userAttendance?.status === "ON_BREAK" || !!userAttendance?.isOnBreak;
  const isCheckedIn = userAttendance?.status === "PRESENT" || (!userAttendance?.checkOutTime && !!userAttendance?.checkInTime && !isOnBreak && userAttendance?.status !== "CHECKED_OUT");
  const isCheckedOut = userAttendance?.status === "CHECKED_OUT";
  const isAdmin = currentUser?.role === "ADMIN";

  // Live timer for break
  useEffect(() => {
    if (!isOnBreak || !userAttendance?.currentBreakStartedAt) {
      setElapsedBreakSeconds(0);
      return;
    }

    const breakStart = new Date(userAttendance.currentBreakStartedAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - breakStart) / 1000));
      setElapsedBreakSeconds(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnBreak, userAttendance]);

  // Live timer for checked-in workday
  useEffect(() => {
    if (!userAttendance?.checkInTime || userAttendance.status === "CHECKED_OUT") {
      setElapsedWorkSeconds(userAttendance?.workDurationSeconds || 0);
      return;
    }

    const sessionStart = userAttendance.lastCheckInTime
      ? new Date(userAttendance.lastCheckInTime).getTime()
      : new Date(userAttendance.checkInTime).getTime();

    // If re-checked in after an earlier session, base is prior completed work duration
    const isResumedSession = !!userAttendance.lastCheckInTime && userAttendance.lastCheckInTime !== userAttendance.checkInTime;
    const basePriorWork = isResumedSession ? (userAttendance.workDurationSeconds || 0) : 0;
    const sessionBreaks = isResumedSession
      ? (userAttendance.sessionBreakDurationSeconds || 0)
      : (userAttendance.breakDurationSeconds || 0);

    const interval = setInterval(() => {
      if (isOnBreak && userAttendance.currentBreakStartedAt) {
        // Paused during break
        return;
      }
      const now = Date.now();
      const currentGross = Math.max(0, Math.floor((now - sessionStart) / 1000));
      const currentNet = Math.max(0, currentGross - sessionBreaks);
      setElapsedWorkSeconds(basePriorWork + currentNet);
    }, 1000);

    return () => clearInterval(interval);
  }, [userAttendance, isOnBreak]);

  const formatHoursMins = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Unified Cohesive Top Navigation Tabs Theme
  const allNavItems = [
    {
      id: "list",
      label: "Active Tasks",
      icon: ListTodo,
    },
    {
      id: "completed",
      label: "Completed Tasks",
      icon: CheckCheck,
      badge: completedTasksCount,
    },
    {
      id: "clients",
      label: "Clients",
      adminOnly: true, // Only visible to Admin
      icon: Building2,
    },
    {
      id: "recurring",
      label: isAdmin ? "Recurring Tasks" : "My Recurring Tasks",
      icon: Calendar,
    },
    {
      id: "attendance",
      label: isAdmin ? "Attendance Register" : "My Attendance",
      icon: Clock,
    },
    {
      id: "reports",
      label: "Reports",
      adminOnly: true, // Only visible to Admin
      icon: FileSpreadsheet,
    },
    {
      id: "employees",
      label: "Employee's list",
      adminOnly: true, // Only visible to Admin
      icon: Users,
    },
    {
      id: "leaves",
      label: "Leave Management",
      icon: CalendarDays,
    },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs w-full">
      {/* Brand & Action Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="flex items-center justify-between h-16 py-2 gap-3">
          {/* Official Logo from nacsconsulting.com */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="p-1 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center">
              <img
                src="/logo.png"
                alt="nacsconsulting"
                className="h-10 w-auto max-w-[180px] sm:max-w-[220px] object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  const fallback = document.getElementById("nacs-nav-fallback");
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div id="nacs-nav-fallback" style={{ display: "none" }} className="items-center space-x-2 px-2 py-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-blue-900 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  NACS
                </div>
                <span className="text-sm font-black tracking-tight text-slate-900">
                  <span className="text-emerald-600">NACS</span> <span className="text-blue-900">CONSULTING</span>
                </span>
              </div>
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-sm font-black tracking-tight text-slate-900 leading-tight">
                <span className="text-emerald-600">NACS</span> <span className="text-blue-900">CONSULTING</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                Navkar Accounting &amp; Consultancy Services
              </span>
            </div>
          </div>

          {/* Right Section: Running Timer, Attendance Widget, Create Task, Settings, User Switcher */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            {/* Active Running Task Indicator (if any) */}
            {activeRunningTask && (
              <div className="hidden xl:flex items-center space-x-2 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-900 shadow-xs animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <Play className="w-3.5 h-3.5 text-amber-600 fill-current" />
                <span className="font-bold truncate max-w-[130px] text-slate-900">
                  {activeRunningTask.title}
                </span>
                <span className="font-mono text-amber-900 font-bold bg-amber-200 px-1.5 py-0.2 rounded text-[10px]">
                  TIMER ON
                </span>
              </div>
            )}

            {/* Attendance Punch In/Out/Break Widget (Check in, Break, Check out with Enabled/Disabled States) */}
            <div className="flex items-center bg-slate-100/90 rounded-xl p-1 border border-slate-200/80 space-x-1.5 shadow-2xs">
              {/* Status & Timer Indicator */}
              <div className="flex items-center space-x-1.5 px-2 py-0.5">
                {isOnBreak ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] uppercase font-bold text-amber-700 leading-tight">On Break</span>
                      <span className="text-xs font-mono font-bold text-amber-900 leading-tight">
                        {formatHoursMins(elapsedBreakSeconds)}
                      </span>
                    </div>
                  </>
                ) : isCheckedIn ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] uppercase font-bold text-emerald-700 leading-tight">Active Shift</span>
                      <span className="text-xs font-mono font-bold text-slate-800 leading-tight">
                        {formatHoursMins(elapsedWorkSeconds)}
                      </span>
                    </div>
                  </>
                ) : isCheckedOut ? (
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] uppercase font-bold text-slate-500 leading-tight">Checked Out</span>
                    <span className="text-xs font-mono font-bold text-slate-700 leading-tight">
                      {formatHoursMins(elapsedWorkSeconds)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span className="text-[10px] uppercase font-bold text-rose-700 hidden sm:inline">
                      Not In
                    </span>
                  </div>
                )}
              </div>

              {/* Button 1: Check In */}
              <button
                onClick={onCheckIn}
                disabled={isCheckedIn || isOnBreak}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 ${
                  isCheckedIn || isOnBreak
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 opacity-60"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-emerald-600/20"
                }`}
                title={
                  isCheckedIn
                    ? "Already checked in"
                    : isOnBreak
                    ? "Currently on break"
                    : isCheckedOut
                    ? "Click to re-check in & resume shift"
                    : "Punch in for today's work"
                }
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isCheckedIn ? "Checked In" : "Check In"}</span>
              </button>

              {/* Button 2: Break / Resume */}
              <button
                onClick={isOnBreak ? onResumeBreak : onTakeBreak}
                disabled={(!isCheckedIn && !isOnBreak) || isCheckedOut}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 ${
                  (!isCheckedIn && !isOnBreak) || isCheckedOut
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 opacity-60"
                    : isOnBreak
                    ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer animate-pulse active:scale-95 shadow-amber-600/20"
                    : "bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:scale-95 shadow-amber-500/20"
                }`}
                title={
                  isOnBreak
                    ? "Click to resume work from break"
                    : isCheckedIn
                    ? "Click to take a break (pauses shift)"
                    : "Must check in before taking a break"
                }
              >
                {isOnBreak ? (
                  <Play className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Coffee className="w-3.5 h-3.5" />
                )}
                <span>{isOnBreak ? "Resume" : "Break"}</span>
              </button>

              {/* Button 3: Check Out */}
              <button
                onClick={onCheckOut}
                disabled={!isCheckedIn && !isOnBreak}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 ${
                  !isCheckedIn && !isOnBreak
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 opacity-60"
                    : "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95 shadow-rose-600/20"
                }`}
                title={
                  !isCheckedIn && !isOnBreak
                    ? "Not checked in"
                    : "Punch out and end work shift"
                }
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Check Out</span>
              </button>
            </div>

            {/* Quick Create Task Button */}
            <button
              onClick={onOpenTaskModal}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shadow-blue-500/25 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Task</span>
            </button>

            {/* Settings button */}
            <button
              onClick={onOpenSettingsModal}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100/90 rounded-xl transition border border-transparent hover:border-slate-200"
              title="Gmail & System Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile & Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100/90 transition border border-slate-200/80 shadow-2xs"
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full border border-slate-300 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    {currentUser?.name.slice(0, 2).toUpperCase() || "US"}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                    {currentUser?.name}
                  </div>
                  <div className="text-[10px] font-bold leading-tight">
                    <span
                      className={`px-1.5 py-0.2 rounded uppercase ${
                        currentUser?.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {currentUser?.role}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Signed In Account
                    </p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {currentUser?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {currentUser?.email}
                    </p>
                    {currentUser?.userId && (
                      <p className="text-[10px] text-blue-700 font-bold mt-1">
                        User ID: <span className="font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{currentUser.userId}</span>
                      </p>
                    )}
                  </div>

                  {/* Account Switcher - Only visible to Admins! Employees can NOT switch to Admin or other users */}
                  {currentUser?.role === "ADMIN" && (
                    <>
                      <div className="px-4 py-1.5 bg-purple-50/50 border-b border-slate-100">
                        <p className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                          Admin Quick Switcher
                        </p>
                      </div>
                      <div className="max-h-52 overflow-y-auto py-1 divide-y divide-slate-50">
                        {allUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              onSelectUser(user);
                              setShowUserMenu(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs flex items-center space-x-2.5 transition hover:bg-slate-50 ${
                              user.id === currentUser?.id ? "bg-purple-50/80 text-purple-950 font-bold" : "text-slate-700"
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                              {user.name.slice(0, 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold truncate text-[11px]">{user.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{user.role} &bull; {user.userId || user.email}</div>
                            </div>
                            {user.id === currentUser?.id && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* LOGOUT OPTION (Returns to Admin / Employee Login Screen) */}
                  <div className="pt-2 px-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition flex items-center justify-center space-x-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out &amp; Switch Login Portal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TOP TABBING WITH COLOR CODING & DEDICATED "COMPLETED TASKS" TAB */}
      <div className="w-full px-4 sm:px-6 lg:px-8 bg-slate-50 border-b border-slate-200 overflow-x-auto">
        <nav className="flex space-x-2 py-2 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 border cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-bold"
                    : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200 shadow-2xs"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
