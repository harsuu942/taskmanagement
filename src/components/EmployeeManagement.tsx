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
  FileText,
  Phone,
  CreditCard,
  Building,
  DollarSign,
  Calendar,
  MapPin,
  Coins,
} from "lucide-react";
import SalarySlipModal from "./SalarySlipModal";

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

  // Salary Components Modal State (Admin: Default Earning & Deduction Components)
  const [showSalaryComponentsModal, setShowSalaryComponentsModal] = useState(false);
  const [compBasicPercent, setCompBasicPercent] = useState<number>(50);
  const [compHraPercent, setCompHraPercent] = useState<number>(30);
  const [compSpecialPercent, setCompSpecialPercent] = useState<number>(20);
  const [compPfPercent, setCompPfPercent] = useState<number>(12);
  const [compPtAmount, setCompPtAmount] = useState<number>(200);
  const [compOtMultiplier, setCompOtMultiplier] = useState<number>(1.5);
  const [compLoading, setCompLoading] = useState(false);
  const [compMessage, setCompMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const openSalaryComponentsModal = async () => {
    setCompMessage(null);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.settings) {
        if (data.settings.defaultBasicPercent !== undefined) setCompBasicPercent(data.settings.defaultBasicPercent);
        if (data.settings.defaultHraPercent !== undefined) setCompHraPercent(data.settings.defaultHraPercent);
        if (data.settings.defaultSpecialPercent !== undefined) setCompSpecialPercent(data.settings.defaultSpecialPercent);
        if (data.settings.defaultPfPercent !== undefined) setCompPfPercent(data.settings.defaultPfPercent);
        if (data.settings.defaultPtAmount !== undefined) setCompPtAmount(data.settings.defaultPtAmount);
        if (data.settings.defaultOtMultiplier !== undefined) setCompOtMultiplier(data.settings.defaultOtMultiplier);
      }
    } catch (e) {
      console.error(e);
    }
    setShowSalaryComponentsModal(true);
  };

  const handleSaveSalaryComponents = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompLoading(true);
    setCompMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultBasicPercent: compBasicPercent,
          defaultHraPercent: compHraPercent,
          defaultSpecialPercent: compSpecialPercent,
          defaultPfPercent: compPfPercent,
          defaultPtAmount: compPtAmount,
          defaultOtMultiplier: compOtMultiplier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save salary components.");
      setCompMessage({
        type: "success",
        text: "Salary & deduction components saved successfully! Applied across all employee payslips.",
      });
    } catch (err: any) {
      setCompMessage({ type: "error", text: err.message || "Failed to save components." });
    } finally {
      setCompLoading(false);
    }
  };

  // Add Form State
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("employee123");
  const [showPassword, setShowPassword] = useState(false);
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [phone, setPhone] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [address, setAddress] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [salary, setSalary] = useState<string>("");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");

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
  const [editPhone, setEditPhone] = useState("");
  const [editPanNumber, setEditPanNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editJoiningDate, setEditJoiningDate] = useState("");
  const [editSalary, setEditSalary] = useState<string>("");
  const [editHourlyRate, setEditHourlyRate] = useState<string>("");
  const [editBankAccountName, setEditBankAccountName] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editBankBranch, setEditBankBranch] = useState("");
  const [editBankAccountNumber, setEditBankAccountNumber] = useState("");
  const [editBankIfsc, setEditBankIfsc] = useState("");

  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Salary Slip Modal State
  const [salarySlipEmployee, setSalarySlipEmployee] = useState<any | null>(null);

  const openEditModal = (emp: any) => {
    setEditingEmployee(emp);
    setEditName(emp.name || "");
    setEditUserId(emp.userId || emp.email.split("@")[0] || "");
    setEditEmail(emp.email || "");
    setEditDesignation(emp.designation || "");
    setEditRole(emp.role || "EMPLOYEE");
    setEditPassword("");
    setShowEditPassword(false);
    setEditPhone(emp.phone || "");
    setEditPanNumber(emp.panNumber || "");
    setEditAddress(emp.address || "");
    setEditJoiningDate(emp.joiningDate || "");
    setEditSalary(emp.salary ? String(emp.salary) : "");
    setEditHourlyRate(emp.hourlyRate ? String(emp.hourlyRate) : "");
    setEditBankAccountName(emp.bankAccountName || emp.name || "");
    setEditBankName(emp.bankName || "");
    setEditBankBranch(emp.bankBranch || "");
    setEditBankAccountNumber(emp.bankAccountNumber || "");
    setEditBankIfsc(emp.bankIfsc || "");
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
          phone: phone.trim() || null,
          panNumber: panNumber.trim().toUpperCase() || null,
          address: address.trim() || null,
          joiningDate: joiningDate || null,
          salary: salary ? parseFloat(salary) : null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          bankAccountName: bankAccountName.trim() || null,
          bankName: bankName.trim() || null,
          bankBranch: bankBranch.trim() || null,
          bankAccountNumber: bankAccountNumber.trim() || null,
          bankIfsc: bankIfsc.trim().toUpperCase() || null,
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
      setPhone("");
      setPanNumber("");
      setAddress("");
      setJoiningDate("");
      setSalary("");
      setHourlyRate("");
      setBankAccountName("");
      setBankName("");
      setBankBranch("");
      setBankAccountNumber("");
      setBankIfsc("");
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
          phone: editPhone.trim() || null,
          panNumber: editPanNumber.trim().toUpperCase() || null,
          address: editAddress.trim() || null,
          joiningDate: editJoiningDate || null,
          salary: editSalary ? parseFloat(editSalary) : null,
          hourlyRate: editHourlyRate ? parseFloat(editHourlyRate) : null,
          bankAccountName: editBankAccountName.trim() || null,
          bankName: editBankName.trim() || null,
          bankBranch: editBankBranch.trim() || null,
          bankAccountNumber: editBankAccountNumber.trim() || null,
          bankIfsc: editBankIfsc.trim().toUpperCase() || null,
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
              Employee&apos;s list
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage staff profiles, contact numbers, PAN details, bank accounts, monthly salary, and generate salary slips.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={openSalaryComponentsModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition shadow-sm flex items-center space-x-1.5 flex-shrink-0 cursor-pointer"
            title="Configure standard earning and deduction component proportions"
          >
            <Coins className="w-4 h-4" />
            <span>💰 Set Earning &amp; Deduction Components</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition shadow-sm flex items-center space-x-1.5 flex-shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Employee Profile</span>
          </button>
        </div>
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
            title="Refresh employee list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">User ID &amp; Email</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Contact / Phone</th>
                <th className="py-3 px-4">PAN &amp; Joining</th>
                <th className="py-3 px-4">Salary / Rate</th>
                <th className="py-3 px-4 text-center">Role</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No employees registered yet. Click &quot;+ Add Employee Profile&quot; to onboard staff.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
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
                          <div>
                            <span className="block font-bold">{emp.name}</span>
                            {emp.bankAccountName && (
                              <span className="text-[10px] text-slate-400 block">
                                Bank: {emp.bankName || "Linked"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* User ID & Email */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-blue-700 text-[11px]">
                          {emp.userId || emp.email.split("@")[0]}
                        </div>
                        <div className="flex items-center space-x-1 text-slate-500 text-[11px] font-mono mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{emp.email}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {emp.designation || "Team Member"}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {emp.phone ? (
                          <div className="flex items-center space-x-1 font-semibold text-slate-800">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{emp.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-mono font-bold uppercase text-slate-800 text-[11px]">
                          {emp.panNumber || <span className="text-slate-400 font-normal italic">No PAN</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {emp.joiningDate ? `DOJ: ${emp.joiningDate}` : "DOJ: —"}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-emerald-700">
                          {emp.salary ? `₹${Number(emp.salary).toLocaleString("en-IN")}/mo` : "Not set"}
                        </div>
                        {emp.hourlyRate && (
                          <div className="text-[10px] text-slate-500">
                            ₹{emp.hourlyRate}/hr
                          </div>
                        )}
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

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Salary Slip Button */}
                          <button
                            onClick={() => setSalarySlipEmployee(emp)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition shadow-2xs cursor-pointer"
                            title="Generate & Email Salary Slip"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span>Salary Slip</span>
                          </button>

                          {/* Edit Button */}
                          {currentUser?.role === "ADMIN" && (
                            <button
                              onClick={() => openEditModal(emp)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition shadow-2xs cursor-pointer"
                              title="Edit employee details"
                            >
                              <Pencil className="w-3 h-3 text-blue-600" />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Add New Employee Profile</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4 text-xs overflow-y-auto">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section 1: Basic & Login Info */}
              <div>
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100">
                  1. Login &amp; Workspace Account
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Login User ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. maya.lin"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Gmail Account <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. maya.lin@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
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
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Tax Consultant"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Role Access
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-white"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact, Statutory & Compensation */}
              <div>
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100">
                  2. Contact &amp; Compensation Particulars
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ABCDE1234F"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Monthly Salary (₹ CTC)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 45000"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Hourly Rate (₹/hr for OT)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 250"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Residential Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 402, Lotus Towers, Andheri West, Mumbai"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Bank Details */}
              <div>
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100">
                  3. Bank Details (For Payslips &amp; Direct Deposit)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Emp Name as per Bank
                    </label>
                    <input
                      type="text"
                      placeholder="Exact name in bank account"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Name of Bank
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank / ICICI Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Bank Branch
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Connaught Place Branch"
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50100234567890"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                    />
                  </div>
                </div>
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
                  {formLoading ? "Creating..." : "Save & Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
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

            <form onSubmit={handleUpdateEmployee} className="p-6 space-y-4 text-xs overflow-y-auto">
              {editError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Section 1: Account Particulars */}
              <div>
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100">
                  1. Login &amp; Workspace Account
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Designation
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
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Reset Password <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        placeholder="Leave blank to keep existing"
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
                  </div>
                </div>
              </div>

              {/* Section 2: Contact, Statutory & Compensation */}
              <div>
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100">
                  2. Contact &amp; Compensation Particulars
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={editPanNumber}
                      onChange={(e) => setEditPanNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={editJoiningDate}
                      onChange={(e) => setEditJoiningDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Monthly Salary (₹ CTC)
                    </label>
                    <input
                      type="number"
                      value={editSalary}
                      onChange={(e) => setEditSalary(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Hourly Rate (₹/hr for OT)
                    </label>
                    <input
                      type="number"
                      value={editHourlyRate}
                      onChange={(e) => setEditHourlyRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Residential Address
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Bank Details */}
              <div>
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100">
                  3. Bank Details (For Payslips &amp; Direct Deposit)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Emp Name as per Bank
                    </label>
                    <input
                      type="text"
                      value={editBankAccountName}
                      onChange={(e) => setEditBankAccountName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Name of Bank
                    </label>
                    <input
                      type="text"
                      value={editBankName}
                      onChange={(e) => setEditBankName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Bank Branch
                    </label>
                    <input
                      type="text"
                      value={editBankBranch}
                      onChange={(e) => setEditBankBranch(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={editBankAccountNumber}
                      onChange={(e) => setEditBankAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={editBankIfsc}
                      onChange={(e) => setEditBankIfsc(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                    />
                  </div>
                </div>
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

      {/* Admin Salary Components Modal: Set Earning & Deduction Components */}
      {showSalaryComponentsModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowSalaryComponentsModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-800 to-teal-800 text-white">
              <div className="flex items-center space-x-2.5">
                <Coins className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-bold tracking-wide">
                    Set Earning &amp; Deduction Components
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Standard percentages &amp; statutory deductions for employee salary slips
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSalaryComponentsModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSalaryComponents} className="p-6 space-y-4 text-xs">
              {compMessage && (
                <div
                  className={`p-3 rounded-xl border flex items-center space-x-2 ${
                    compMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {compMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span className="font-semibold">{compMessage.text}</span>
                </div>
              )}

              <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-xl space-y-1">
                <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-700" /> Company-wide Standard CTC Breakdown
                </span>
                <p className="text-[11px] text-emerald-800">
                  When calculating employee salary slips, these percentages automatically partition gross CTC into Basic Pay, HRA, and Special Allowances.
                </p>
              </div>

              {/* Earnings Components */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                    Earnings Breakdown (% of CTC)
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    compBasicPercent + compHraPercent + compSpecialPercent === 100
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    Sum: {compBasicPercent + compHraPercent + compSpecialPercent}% CTC
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Basic Salary
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={10}
                        max={100}
                        step={1}
                        required
                        value={compBasicPercent}
                        onChange={(e) => setCompBasicPercent(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 50%</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      HRA
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        required
                        value={compHraPercent}
                        onChange={(e) => setCompHraPercent(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 30%</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Special Allowance
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        required
                        value={compSpecialPercent}
                        onChange={(e) => setCompSpecialPercent(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 20%</span>
                  </div>
                </div>
              </div>

              {/* Deductions Components */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block border-b border-slate-200 pb-2">
                  Overtime &amp; Statutory Deductions
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      OT Multiplier
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={3}
                        step={0.1}
                        required
                        value={compOtMultiplier}
                        onChange={(e) => setCompOtMultiplier(parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                      <span className="text-xs font-bold text-slate-600">&times;</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 1.5&times; rate</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Provident Fund (PF)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        required
                        value={compPfPercent}
                        onChange={(e) => setCompPfPercent(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">12% on Basic &ge; 15k</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Professional Tax (PT)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600">₹</span>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        step={10}
                        required
                        value={compPtAmount}
                        onChange={(e) => setCompPtAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: ₹200 / mo</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSalaryComponentsModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={compLoading}
                  className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{compLoading ? "Saving..." : "Save Salary Components"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {salarySlipEmployee && (
        <SalarySlipModal
          isOpen={!!salarySlipEmployee}
          onClose={() => setSalarySlipEmployee(null)}
          employee={salarySlipEmployee}
          allEmployees={employees}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
