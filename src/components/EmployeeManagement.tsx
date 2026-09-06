"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/types";
import {
  Users,
  UserPlus,
  Mail,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  Clock,
  RefreshCw,
  X,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  Pencil,
} from "lucide-react";

interface EmployeeManagementProps {
  currentUser: User | null;
  onRefresh: () => void;
}

export default function EmployeeManagement({
  currentUser,
  onRefresh,
}: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("employee123");
  const [showPassword, setShowPassword] = useState(false);
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Employee State
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editUserId, setEditUserId] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editDesignation, setEditDesignation] = useState("");
  const [editRole, setEditRole] = useState("EMPLOYEE");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (emp: any) => {
    setEditingEmployee(emp);
    setEditName(emp.name || "");
    setEditUserId(emp.userId || emp.email.split("@")[0] || "");
    setEditEmail(emp.email || "");
    setEditDesignation(emp.designation || "");
    setEditRole(emp.role || "EMPLOYEE");
    setEditPassword("");
    setShowEditPassword(false);
    setEditError(null);
  };


  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError("Name and Gmail address are required.");
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          userId: userId.trim() || undefined,
          email: email.trim(),
          password: password || "employee123",
          designation: designation.trim() || "Team Member",
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create employee");
      }

      setShowAddModal(false);
      setName("");
      setUserId("");
      setEmail("");
      setPassword("employee123");
      setDesignation("");
      fetchEmployees();
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    if (!editName.trim() || !editEmail.trim()) {
      setEditError("Name and Gmail address are required.");
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEmployee.id,
          name: editName.trim(),
          userId: editUserId.trim() || undefined,
          email: editEmail.trim(),
          password: editPassword.trim() || undefined,
          designation: editDesignation.trim() || "Team Member",
          role: editRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update employee details");
      }

      setEditingEmployee(null);
      fetchEmployees();
      onRefresh();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Team Directory &amp; Employee Management
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Register new team members with their unique User ID and password to grant workspace access and manage task assignments.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition shadow-sm flex items-center space-x-1.5 flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Employee with User ID &amp; Password</span>
        </button>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800">
            Registered Employees ({employees.length})
          </h4>
          <button
            onClick={fetchEmployees}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
            title="Refresh team list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Login User ID</th>
                <th className="py-3 px-4">Gmail Account</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Assigned Tasks</th>
                <th className="py-3 px-4">Completed Tasks</th>
                <th className="py-3 px-4 text-center">Role</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No employees registered yet. Click "+ Add Employee" to onboard staff.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const completedCount = emp.assignedTasks?.filter(
                    (t: any) => t.employeeStatus === "COMPLETED" || t.adminStatus === "FINAL_COMPLETED"
                  ).length || 0;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div className="flex items-center space-x-2.5">
                          {emp.avatar ? (
                            <img
                              src={emp.avatar}
                              alt={emp.name}
                              className="w-7 h-7 rounded-full border border-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                              {emp.name.slice(0, 1)}
                            </div>
                          )}
                          <span>{emp.name}</span>
                        </div>
                      </td>

                      {/* User ID Column */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 text-xs">
                        <span className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {emp.userId || emp.email.split("@")[0]}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-mono text-[11px]">
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.email}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {emp.designation || "Team Member"}
                      </td>

                      <td className="py-3 px-4 font-bold text-blue-700">
                        {emp.assignedTasks?.length || 0} tasks
                      </td>

                      <td className="py-3 px-4 font-bold text-emerald-600">
                        {completedCount} completed
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                          emp.role === "ADMIN"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {emp.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {currentUser?.role === "ADMIN" && (
                          <button
                            onClick={() => openEditModal(emp)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition shadow-2xs"
                            title="Edit employee details"
                          >
                            <Pencil className="w-3 h-3 text-blue-600" />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Add New Employee</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-3.5">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!userId) {
                      setUserId(e.target.value.toLowerCase().replace(/\s+/g, "."));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Login User ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. maya.lin or EMP-104"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Used for signing in.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="e.g. employee123"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-8 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Employee can change later.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Gmail Account <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maya.lin.eng@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Daily reports and automated summaries are dispatched to this address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Tax Auditor / Financial Analyst"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm disabled:opacity-50"
                >
                  {formLoading ? "Creating..." : "Create Employee Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Employee Details</h3>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="p-6 space-y-3.5">
              {editError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Login User ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editUserId}
                    onChange={(e) => setEditUserId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Used for login.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Role Access
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-white"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">Workspace permission level.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Gmail Account <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Daily reports and automated summaries are dispatched to this address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Reset Password <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    placeholder="Leave blank to keep existing password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-8 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Only enter a value if you want to set a new password for this employee.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm disabled:opacity-50"
                >
                  {editLoading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

