"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { User, Task, AttendanceRosterItem, Client } from "@/types";
import Navbar from "@/components/Navbar";
import TaskListView from "@/components/TaskListView";
import CompletedTasksView from "@/components/CompletedTasksView";
import RecurringTasksView from "@/components/RecurringTasksView";
import AttendanceView from "@/components/AttendanceView";
import ReportsView from "@/components/ReportsView";
import EmployeeManagement from "@/components/EmployeeManagement";
import ClientsView from "@/components/ClientsView";
import LeavesView from "@/components/LeavesView";
import TaskModal from "@/components/TaskModal";
import TaskDetailDrawer from "@/components/TaskDetailDrawer";
import SettingsModal from "@/components/SettingsModal";
import LoginView from "@/components/LoginView";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [userAttendance, setUserAttendance] = useState<AttendanceRosterItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>("list");
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskModalInitialClientId, setTaskModalInitialClientId] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const selectedTaskIdRef = useRef<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const handleSelectTask = useCallback((task: Task) => {
    selectedTaskIdRef.current = task.id;
    setSelectedTask(task);
  }, []);

  const handleCloseTaskDrawer = useCallback(() => {
    selectedTaskIdRef.current = null;
    setSelectedTask(null);
  }, []);

  // Fetch initial users and load saved session
  const fetchAuth = async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (res.ok) {
        setAllUsers(data.allUsers || []);

        const savedUserId = typeof window !== "undefined" ? localStorage.getItem("nacs_user_id") : null;

        if (savedUserId) {
          const matched = data.allUsers?.find((u: User) => u.id === savedUserId);
          if (matched) {
            setCurrentUser(matched);
            setIsLoggedIn(true);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all clients
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (res.ok) {
        setClients(data.clients || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Login handler
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("nacs_user_id", user.id);
    }
  };

  // Logout handler (returns to Admin / Employee Login portal)
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("nacs_user_id");
    }
  };

  // Fetch all tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (res.ok) {
        const list: Task[] = data.tasks || [];
        setTasks(list);
        if (selectedTaskIdRef.current) {
          const updated = list.find((t) => t.id === selectedTaskIdRef.current);
          if (updated) {
            setSelectedTask(updated);
          } else {
            selectedTaskIdRef.current = null;
            setSelectedTask(null);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch today's attendance for current user
  const fetchAttendance = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/attendance?userId=${currentUser.id}`);
      const data = await res.json();
      if (res.ok) {
        setUserAttendance(data.currentUserAttendance || null);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAuth();
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (currentUser && isLoggedIn) {
      fetchTasks();
      fetchAttendance();
      fetchClients();

      // Guard: Employees cannot access admin-only tabs (clients, reports, employees)
      if (currentUser.role !== "ADMIN" && ["clients", "reports", "employees"].includes(activeTab)) {
        setActiveTab("list");
      }
    }
  }, [currentUser, isLoggedIn, activeTab, fetchTasks, fetchAttendance, fetchClients]);


  // Check In handler
  const handleCheckIn = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, action: "check-in" }),
      });
      if (res.ok) {
        fetchAttendance();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Check Out handler
  const handleCheckOut = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, action: "check-out" }),
      });
      if (res.ok) {
        fetchAttendance();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Take Break handler
  const handleTakeBreak = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, action: "break" }),
      });
      if (res.ok) {
        fetchAttendance();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Resume Break handler
  const handleResumeBreak = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, action: "resume-break" }),
      });
      if (res.ok) {
        fetchAttendance();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Timer Action handler (start, hold, resume, stop, complete)
  const handleTimerAction = async (
    taskId: string,
    action: "start" | "hold" | "resume" | "stop" | "complete"
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: currentUser?.id,
        }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin Approve handler (Final Completed - moves task into Completed Tasks tab!)
  const handleAdminApprove = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          role: currentUser?.role,
          adminStatus: "FINAL_COMPLETED",
        }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin Revision handler
  const handleAdminRevision = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          role: currentUser?.role,
          adminStatus: "REVISION_REQUESTED",
        }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Task: Enforces role permission
  // Admins can delete any task. Employees can only delete tasks they created themselves.
  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    const isAdmin = currentUser?.role === "ADMIN";
    const isCreator = !!(taskToDelete && taskToDelete.createdById === currentUser?.id);

    if (!isAdmin && !isCreator) {
      alert("Permission Denied: You can only delete tasks that you created yourself. Tasks created by Admin can only be deleted by Admin.");
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}?userId=${currentUser.id}&role=${currentUser.role}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete task");
        return;
      }
      selectedTaskIdRef.current = null;
      setSelectedTask(null);
      await fetchTasks();
    } catch (e: any) {
      alert(e.message || "Error deleting task");
    }
  };

  // Find active running task for current user (or any running task for admin)
  const activeRunningTask = tasks.find(
    (t) =>
      t.isTimerRunning &&
      (currentUser?.role === "ADMIN" || t.assignedToId === currentUser?.id)
  );

  // Completed tasks count: for admin, total finalized; for employee, their finalized tasks
  const completedTasksCount = tasks.filter(
    (t) =>
      t.adminStatus === "FINAL_COMPLETED" &&
      (currentUser?.role === "ADMIN" || t.assignedToId === currentUser?.id)
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="font-semibold text-sm">Loading Task Management portal...</span>
      </div>
    );
  }

  // If not logged in, show dedicated 1) Admin Login and 2) Employee Login screen
  if (!isLoggedIn || !currentUser) {
    return (
      <LoginView
        allUsers={allUsers}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      {/* Portal Header Navigation with Logo & Completed Tasks tab */}
      <Navbar
        currentUser={currentUser}
        allUsers={allUsers}
        onSelectUser={(u) => handleLogin(u)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userAttendance={userAttendance}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onTakeBreak={handleTakeBreak}
        onResumeBreak={handleResumeBreak}
        activeRunningTask={activeRunningTask}
        onOpenTaskModal={() => {
          setTaskToEdit(null);
          setTaskModalInitialClientId("");
          setIsTaskModalOpen(true);
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        completedTasksCount={completedTasksCount}
      />

      {/* Role Context & Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2.5 w-full">
        <div className="w-full flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-2.5">
            <span className="font-bold text-slate-500">Active Workspace:</span>
            <span
              className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[11px] ${
                currentUser?.role === "ADMIN"
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : "bg-blue-100 text-blue-800 border border-blue-300"
              }`}
            >
              {currentUser?.role === "ADMIN" ? "👑 Admin Portal" : "💼 Employee Portal"}
            </span>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <span className="text-slate-600 hidden sm:inline font-medium">
              Signed in as <strong className="text-slate-900">{currentUser?.name}</strong> ({currentUser?.email})
            </span>
            {currentUser?.role === "EMPLOYEE" && (
              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-200">
                🔒 Personal Task Isolation Active
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 text-slate-500 text-[11px]">
            <button
              onClick={handleLogout}
              className="text-rose-600 hover:text-rose-700 font-bold hover:underline"
            >
              Log Out / Switch Login
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* 1. Active Task List View */}
        {activeTab === "list" && (
          <TaskListView
            tasks={tasks}
            currentUser={currentUser}
            allUsers={allUsers}
            clients={clients}
            onSelectTask={handleSelectTask}
            onAddNewTask={() => {
              setTaskToEdit(null);
              setTaskModalInitialClientId("");
              setIsTaskModalOpen(true);
            }}
            onEditTask={(task) => {
              setTaskToEdit(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onTimerAction={handleTimerAction}
            onAdminApprove={handleAdminApprove}
            onAdminRevision={handleAdminRevision}
          />
        )}

        {/* 2. Dedicated Completed Tasks Tab (Approved by Admin) */}
        {activeTab === "completed" && (
          <CompletedTasksView
            tasks={tasks}
            currentUser={currentUser}
            allUsers={allUsers}
            clients={clients}
            onSelectTask={handleSelectTask}
          />
        )}

        {/* 3. Dedicated Clients Directory & Account Management (Admin Only) */}
        {activeTab === "clients" && currentUser?.role === "ADMIN" && (
          <ClientsView
            clients={clients}
            currentUser={currentUser}
            onClientCreated={() => {
              fetchClients();
              fetchTasks();
            }}
            onOpenCreateTaskForClient={(clientId) => {
              setTaskToEdit(null);
              setTaskModalInitialClientId(clientId);
              setIsTaskModalOpen(true);
            }}
          />
        )}

        {/* 4. Recurring Tasks */}
        {activeTab === "recurring" && (
          <RecurringTasksView
            currentUser={currentUser}
            onOpenCreateModal={() => {
              setTaskToEdit(null);
              setTaskModalInitialClientId("");
              setIsTaskModalOpen(true);
            }}
          />
        )}

        {/* 5. Attendance */}
        {activeTab === "attendance" && (
          <AttendanceView
            currentUser={currentUser}
            onRefresh={() => fetchAttendance()}
          />
        )}

        {/* 6. EOD Reports & Gmail (Admin Only) */}
        {activeTab === "reports" && currentUser?.role === "ADMIN" && (
          <ReportsView
            currentUser={currentUser}
            allUsers={allUsers}
          />
        )}

        {/* 7. Team Directory (Admin Only) */}
        {activeTab === "employees" && currentUser?.role === "ADMIN" && (
          <EmployeeManagement
            currentUser={currentUser}
            onRefresh={() => {
              fetchAuth();
              fetchTasks();
            }}
          />
        )}

        {/* 8. Leave Management & Reports (Admin & Employee) */}
        {activeTab === "leaves" && (
          <LeavesView
            currentUser={currentUser}
            allUsers={allUsers}
            onLeaveUpdated={() => {
              fetchAttendance();
            }}
          />
        )}
      </main>

      {/* Task Creation / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        taskToEdit={taskToEdit}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
          setTaskModalInitialClientId("");
        }}
        currentUser={currentUser}
        allUsers={allUsers}
        clients={clients}
        initialClientId={taskModalInitialClientId}
        onTaskCreated={() => {
          setTaskToEdit(null);
          fetchTasks();
          fetchClients();
        }}
        onRefreshClients={() => fetchClients()}
      />

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        onClose={handleCloseTaskDrawer}
        currentUser={currentUser}
        allUsers={allUsers}
        clients={clients}
        onTimerAction={handleTimerAction}
        onAdminApprove={handleAdminApprove}
        onAdminRevision={handleAdminRevision}
        onTaskUpdated={() => {
          fetchTasks();
          fetchClients();
        }}
        onDeleteTask={handleDeleteTask}
        onEditTask={(task) => {
          setTaskToEdit(task);
          setIsTaskModalOpen(true);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
