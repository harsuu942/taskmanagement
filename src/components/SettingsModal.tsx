"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  CustomLeaveTypeConfig,
  SalaryComponentsConfig,
  SalaryEarningComponent,
  SalaryDeductionComponent,
} from "@/types";
import {
  X,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Key,
  Info,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  Send,
  Sparkles,
  Building2,
  Clock,
  Palmtree,
  Coins,
  Coffee,
  HeartPulse,
  Plus,
  Trash2,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
}: SettingsModalProps) {
  const isAdmin = currentUser?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"password" | "gmail" | "leave" | "salary" | "policy">("password");

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Gmail SMTP State
  const [adminEmail, setAdminEmail] = useState("");
  const [gmailUser, setGmailUser] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [gmailConfigured, setGmailConfigured] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailMessage, setGmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Leave Types & Quotas State (Dynamic)
  const [leaveTypesConfigList, setLeaveTypesConfigList] = useState<CustomLeaveTypeConfig[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDays, setNewTypeDays] = useState<number>(10);
  const [newTypeAccrual, setNewTypeAccrual] = useState<number>(0);
  const [newTypeIsPaid, setNewTypeIsPaid] = useState<boolean>(true);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Salary & Deduction Components State (Dynamic)
  const [salaryComponentsConfig, setSalaryComponentsConfig] = useState<SalaryComponentsConfig>({
    earnings: [
      { id: "basic", name: "Basic Salary", type: "PERCENT_CTC", value: 50, isDefault: true },
      { id: "hra", name: "House Rent Allowance (HRA)", type: "PERCENT_CTC", value: 30, isDefault: true },
      { id: "special", name: "Special Allowance", type: "PERCENT_CTC", value: 20, isDefault: true },
    ],
    deductions: [
      { id: "pf", name: "Provident Fund (PF)", type: "PERCENT_BASIC", value: 12, threshold: 15000, isDefault: true },
      { id: "pt", name: "Professional Tax (PT)", type: "FIXED", value: 200, threshold: 15000, isDefault: true },
    ],
    otMultiplier: 1.5,
  });
  const [newEarningName, setNewEarningName] = useState("");
  const [newEarningType, setNewEarningType] = useState<"PERCENT_CTC" | "FIXED">("PERCENT_CTC");
  const [newEarningValue, setNewEarningValue] = useState<number>(5);
  const [newDeductionName, setNewDeductionName] = useState("");
  const [newDeductionType, setNewDeductionType] = useState<"PERCENT_BASIC" | "PERCENT_CTC" | "FIXED">("FIXED");
  const [newDeductionValue, setNewDeductionValue] = useState<number>(200);
  const [newDeductionThreshold, setNewDeductionThreshold] = useState<number>(15000);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryMessage, setSalaryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Work Policy & Daily Hours State
  const [companyDailyHours, setCompanyDailyHours] = useState<number>(8);
  const [enableSundayOt, setEnableSundayOt] = useState<boolean>(true);
  const [standardWorkDays, setStandardWorkDays] = useState<number>(26);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyMessage, setPolicyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPasswordMessage(null);
      setGmailMessage(null);
      setTestEmailMessage(null);
      setLeaveMessage(null);
      setSalaryMessage(null);
      setPolicyMessage(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    // Default tab
    setActiveTab("password");

    // Fetch settings
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setAdminEmail(data.settings.adminEmail || "");
          setGmailUser(data.settings.gmailUser || "");
          setGmailAppPassword(data.settings.gmailAppPassword || "");
          setGmailConfigured(data.settings.gmailConfigured || false);
          if (data.settings.companyDailyHours !== undefined) setCompanyDailyHours(data.settings.companyDailyHours);
          if (data.settings.enableSundayOt !== undefined) setEnableSundayOt(data.settings.enableSundayOt);
          if (data.settings.standardWorkDays !== undefined) setStandardWorkDays(data.settings.standardWorkDays);

          if (data.settings.leaveTypesConfig && Array.isArray(data.settings.leaveTypesConfig)) {
            setLeaveTypesConfigList(data.settings.leaveTypesConfig);
          } else {
            setLeaveTypesConfigList([
              { id: "EARNED", name: "Earned Leave (EL)", annualDays: data.settings.earnedDays ?? 18, accrualRate: data.settings.earnedLeaveAccrual ?? 1.5, isPaid: true, isDefault: true },
              { id: "CASUAL", name: "Casual Leave (CL)", annualDays: data.settings.casualDays ?? 0, accrualRate: 0, isPaid: true, isDefault: true },
              { id: "SICK", name: "Sick Leave (SL)", annualDays: data.settings.sickDays ?? 0, accrualRate: 0, isPaid: true, isDefault: true },
              { id: "UNPAID", name: "Unpaid Leave (LWP)", annualDays: 0, accrualRate: 0, isPaid: false, isDefault: true },
            ]);
          }

          if (data.settings.salaryComponentsConfig) {
            setSalaryComponentsConfig(data.settings.salaryComponentsConfig);
          } else {
            setSalaryComponentsConfig({
              earnings: [
                { id: "basic", name: "Basic Salary", type: "PERCENT_CTC", value: data.settings.defaultBasicPercent ?? 50, isDefault: true },
                { id: "hra", name: "House Rent Allowance (HRA)", type: "PERCENT_CTC", value: data.settings.defaultHraPercent ?? 30, isDefault: true },
                { id: "special", name: "Special Allowance", type: "PERCENT_CTC", value: data.settings.defaultSpecialPercent ?? 20, isDefault: true },
              ],
              deductions: [
                { id: "pf", name: "Provident Fund (PF)", type: "PERCENT_BASIC", value: data.settings.defaultPfPercent ?? 12, threshold: 15000, isDefault: true },
                { id: "pt", name: "Professional Tax (PT)", type: "FIXED", value: data.settings.defaultPtAmount ?? 200, threshold: 15000, isDefault: true },
              ],
              otMultiplier: data.settings.defaultOtMultiplier ?? 1.5,
            });
          }
        }
      })
      .catch(console.error);
  }, [isOpen]);

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

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentUser?.id) {
      setPasswordMessage({
        type: "error",
        text: "You must be signed in to change your password.",
      });
      return;
    }

    if (!currentPassword) {
      setPasswordMessage({
        type: "error",
        text: "Please enter your current password.",
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "New password must be at least 6 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New password and confirmation do not match.",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setPasswordMessage({
        type: "success",
        text: "Your password has been changed successfully! Use your new password on your next login.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMessage({
        type: "error",
        text: err.message,
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Save Gmail Settings
  const handleSaveGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setGmailLoading(true);
    setGmailMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail,
          gmailUser,
          gmailAppPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setGmailMessage({ type: "success", text: data.message || "Settings saved successfully." });
      setGmailConfigured(!!(gmailUser && gmailAppPassword));
    } catch (e: any) {
      setGmailMessage({ type: "error", text: "Error: " + e.message });
    } finally {
      setGmailLoading(false);
    }
  };

  // Test Gmail SMTP Connection
  const handleTestEmail = async () => {
    setTestEmailLoading(true);
    setTestEmailMessage(null);
    try {
      // First save to make sure current credentials are used
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail,
          gmailUser,
          gmailAppPassword,
        }),
      });

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test-email",
          testRecipient: adminEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailMessage({
          type: "success",
          text: data.message || `Test email dispatched successfully to ${adminEmail}!`,
        });
        setGmailConfigured(true);
      } else {
        setTestEmailMessage({
          type: "error",
          text: data.message || "Failed to dispatch test email.",
        });
      }
    } catch (err: any) {
      setTestEmailMessage({
        type: "error",
        text: "Error: " + err.message,
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  // Handle Save Leave Types & Quotas
  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveLoading(true);
    setLeaveMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypesConfig: leaveTypesConfigList,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save leave quota settings.");
      setLeaveMessage({
        type: "success",
        text: "Leave types & annual quotas updated successfully! Staff summary cards updated.",
      });
    } catch (err: any) {
      setLeaveMessage({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setLeaveLoading(false);
    }
  };

  // Leave Types Helpers
  const handleUpdateLeaveTypeField = (index: number, patch: Partial<CustomLeaveTypeConfig>) => {
    setLeaveTypesConfigList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleAddCustomLeaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const cleanId = newTypeName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .slice(0, 16) + "_" + Math.floor(100 + Math.random() * 900);

    const newEntry: CustomLeaveTypeConfig = {
      id: cleanId,
      name: newTypeName.trim(),
      annualDays: Number(newTypeDays) || 0,
      accrualRate: Number(newTypeAccrual) || 0,
      isPaid: newTypeIsPaid,
      isDefault: false,
    };

    setLeaveTypesConfigList((prev) => [...prev, newEntry]);
    setNewTypeName("");
    setNewTypeDays(10);
    setNewTypeAccrual(0);
    setNewTypeIsPaid(true);
  };

  const handleDeleteCustomLeaveType = (index: number) => {
    setLeaveTypesConfigList((prev) => prev.filter((_, i) => i !== index));
  };

  // Salary Components Helpers
  const handleUpdateEarning = (index: number, patch: Partial<SalaryEarningComponent>) => {
    setSalaryComponentsConfig((prev) => {
      const earnings = [...prev.earnings];
      earnings[index] = { ...earnings[index], ...patch };
      return { ...prev, earnings };
    });
  };

  const handleAddEarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEarningName.trim()) return;
    const cleanId = newEarningName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 16) + "_" + Math.floor(100 + Math.random() * 900);

    const newComp: SalaryEarningComponent = {
      id: cleanId,
      name: newEarningName.trim(),
      type: newEarningType,
      value: Number(newEarningValue) || 0,
      isDefault: false,
    };

    setSalaryComponentsConfig((prev) => ({
      ...prev,
      earnings: [...prev.earnings, newComp],
    }));
    setNewEarningName("");
    setNewEarningValue(5);
  };

  const handleDeleteEarning = (index: number) => {
    setSalaryComponentsConfig((prev) => ({
      ...prev,
      earnings: prev.earnings.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateDeduction = (index: number, patch: Partial<SalaryDeductionComponent>) => {
    setSalaryComponentsConfig((prev) => {
      const deductions = [...prev.deductions];
      deductions[index] = { ...deductions[index], ...patch };
      return { ...prev, deductions };
    });
  };

  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeductionName.trim()) return;
    const cleanId = newDeductionName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 16) + "_" + Math.floor(100 + Math.random() * 900);

    const newComp: SalaryDeductionComponent = {
      id: cleanId,
      name: newDeductionName.trim(),
      type: newDeductionType,
      value: Number(newDeductionValue) || 0,
      threshold: Number(newDeductionThreshold) || undefined,
      isDefault: false,
    };

    setSalaryComponentsConfig((prev) => ({
      ...prev,
      deductions: [...prev.deductions, newComp],
    }));
    setNewDeductionName("");
    setNewDeductionValue(200);
  };

  const handleDeleteDeduction = (index: number) => {
    setSalaryComponentsConfig((prev) => ({
      ...prev,
      deductions: prev.deductions.filter((_, i) => i !== index),
    }));
  };

  // Handle Save Salary & Deduction Components
  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalaryLoading(true);
    setSalaryMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salaryComponentsConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save salary components.");
      setSalaryMessage({
        type: "success",
        text: "Earning & deduction components saved successfully! Applied across all employee payslips.",
      });
    } catch (err: any) {
      setSalaryMessage({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setSalaryLoading(false);
    }
  };

  // Handle Save Work Policy
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicyLoading(true);
    setPolicyMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyDailyHours,
          enableSundayOt,
          standardWorkDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save company policy.");
      setPolicyMessage({
        type: "success",
        text: "Company daily work hours and Sunday OT settings successfully updated!",
      });
    } catch (err: any) {
      setPolicyMessage({
        type: "error",
        text: err.message || "Failed to save settings.",
      });
    } finally {
      setPolicyLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Account &amp; System Settings
            </h3>
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

        {/* Setting Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeTab === "password"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Password</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("gmail")}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 whitespace-nowrap ${
                  activeTab === "gmail"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Gmail &amp; Reports</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("leave")}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 whitespace-nowrap ${
                  activeTab === "leave"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Palmtree className="w-3.5 h-3.5 text-blue-600" />
                <span>Leave Types &amp; Quotas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("salary")}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 whitespace-nowrap ${
                  activeTab === "salary"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-blue-600" />
                <span>Salary Components</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("policy")}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 whitespace-nowrap ${
                  activeTab === "policy"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Daily Hours &amp; OT</span>
              </button>
            </>
          )}
        </div>

        {/* TAB 1: CHANGE PASSWORD */}
        {activeTab === "password" && (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
            {/* Account Info Pill */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  Logged in as
                </span>
                <span className="font-bold text-slate-900 text-xs">{currentUser?.name}</span>
                <span className="text-slate-500 text-[11px] block">{currentUser?.email}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  User ID
                </span>
                <span className="font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 text-xs">
                  {currentUser?.userId || currentUser?.email.split("@")[0]}
                </span>
              </div>
            </div>

            {passwordMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border border-rose-200 text-rose-700"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>

            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3.5 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center justify-end space-x-2 z-10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{passwordLoading ? "Updating..." : "Update Password"}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: GMAIL SETTINGS (Admin Only) */}
        {activeTab === "gmail" && isAdmin && (
          <form onSubmit={handleSaveGmail} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
            {gmailMessage && (
              <div
                className={`p-3 rounded-lg font-medium flex items-center gap-2 ${
                  gmailMessage.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border border-rose-200 text-rose-800"
                }`}
              >
                {gmailMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{gmailMessage.text}</span>
              </div>
            )}

            {testEmailMessage && (
              <div
                className={`p-3 rounded-lg font-medium flex items-center gap-2 ${
                  testEmailMessage.type === "success"
                    ? "bg-blue-50 border border-blue-200 text-blue-800"
                    : "bg-rose-50 border border-rose-200 text-rose-800"
                }`}
              >
                {testEmailMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{testEmailMessage.text}</span>
              </div>
            )}

            {/* Admin Recipient Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Admin Recipient Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="e.g. gaurav141@gmail.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                All employee daily work reports and attendance digests are delivered to this address.
              </p>
            </div>

            {/* Sender Gmail Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Sender Gmail Address (Your Google Account)
              </label>
              <input
                type="email"
                value={gmailUser}
                onChange={(e) => setGmailUser(e.target.value)}
                placeholder="e.g. gaurav141@gmail.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The Gmail account used by the server to dispatch automated emails.
              </p>
            </div>

            {/* Gmail App Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Google App Password (16 Characters)
                </label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    gmailConfigured
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {gmailConfigured ? "Live SMTP Active" : "App Password Needed"}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showAppPassword ? "text" : "password"}
                  value={gmailAppPassword}
                  onChange={(e) => setGmailAppPassword(e.target.value)}
                  placeholder="e.g. abcd efgh ijkl mnop"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-wider pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowAppPassword(!showAppPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showAppPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Google App Password generated from your Google Account security settings.
              </p>
            </div>

            {/* App Password Instructions */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Key className="w-3.5 h-3.5 text-amber-600" /> How to generate a Google App Password (1 minute):
                </span>
              </div>
              <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200">
                <li>Go to <strong className="text-slate-800">myaccount.google.com/security</strong>.</li>
                <li>Ensure <strong className="text-slate-800">2-Step Verification</strong> is turned ON.</li>
                <li>Search or click <strong className="text-slate-800">App Passwords</strong>, name it <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">nacsconsulting</code>, and paste the 16 letters above.</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3.5 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 z-10">
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testEmailLoading || !gmailUser || !gmailAppPassword}
                className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition flex items-center gap-1.5 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testEmailLoading ? "Testing..." : "Send Test Email"}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={gmailLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{gmailLoading ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: LEAVE TYPES & QUOTAS */}
        {activeTab === "leave" && (
          <form onSubmit={handleSaveLeave} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
            {leaveMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                  leaveMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {leaveMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{leaveMessage.text}</span>
              </div>
            )}

            <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl space-y-1">
              <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                <Palmtree className="w-3.5 h-3.5 text-blue-700" /> Leave Types &amp; Number of Leaves Setting
              </span>
              <p className="text-[11px] text-blue-800">
                Rename leave types, configure annual quotas, or add new custom leave types. Any leave type set to <span className="font-bold">0 days</span> is automatically hidden and excluded from employee leave summary cards.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                  Configured Leave Types ({leaveTypesConfigList.length})
                </span>
                <span className="text-[10px] text-slate-500">
                  Edit names, quotas, or accrual rates below
                </span>
              </div>

              {leaveTypesConfigList.map((type, idx) => (
                <div
                  key={type.id || idx}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        required
                        value={type.name}
                        onChange={(e) => handleUpdateLeaveTypeField(idx, { name: e.target.value })}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white text-xs w-full max-w-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Leave Type Name"
                      />
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        type.isPaid ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                      }`}>
                        {type.isPaid ? "Paid Leave" : "Unpaid / LWP"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={type.isPaid}
                          onChange={(e) => handleUpdateLeaveTypeField(idx, { isPaid: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span>Paid</span>
                      </label>

                      {!type.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomLeaveType(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                          title="Delete custom leave type"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Annual Quota Days {type.annualDays === 0 && <span className="text-amber-600">(0d = Hidden)</span>}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        step={0.5}
                        value={type.annualDays}
                        onChange={(e) =>
                          handleUpdateLeaveTypeField(idx, {
                            annualDays: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2.5 py-1 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Monthly Accrual (Days / Month)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        step={0.1}
                        value={type.accrualRate || 0}
                        onChange={(e) =>
                          handleUpdateLeaveTypeField(idx, {
                            accrualRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2.5 py-1 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Leave Type Box */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-3">
              <span className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Plus className="w-4 h-4 text-blue-700" /> + Add Custom Leave Type
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    New Leave Type Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maternity Leave, Comp-Off..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Annual Days
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    step={0.5}
                    value={newTypeDays}
                    onChange={(e) => setNewTypeDays(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleAddCustomLeaveType}
                    disabled={!newTypeName.trim()}
                    className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Type</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-600">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTypeIsPaid}
                    onChange={(e) => setNewTypeIsPaid(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Is Paid Leave</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span>Accrual (Days/Mo):</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.1}
                    value={newTypeAccrual}
                    onChange={(e) => setNewTypeAccrual(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-xs bg-white text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Total Summary Pill */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">Total Configured Annual Paid Leave Quota:</span>
              <span className="font-extrabold text-emerald-800 text-sm bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">
                {leaveTypesConfigList
                  .filter((t) => t.isPaid)
                  .reduce((sum, t) => sum + (parseFloat(String(t.annualDays)) || 0), 0)}{" "}
                Days / Year
              </span>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3.5 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center justify-end space-x-2 z-10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={leaveLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{leaveLoading ? "Saving..." : "Save Leave Quotas"}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: SALARY & DEDUCTION COMPONENTS */}
        {activeTab === "salary" && (
          <form onSubmit={handleSaveSalary} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
            {salaryMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                  salaryMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {salaryMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{salaryMessage.text}</span>
              </div>
            )}

            <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl space-y-1">
              <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-700" /> Set Earning &amp; Deduction Components
              </span>
              <p className="text-[11px] text-emerald-800">
                Rename existing components or add new custom earnings &amp; deductions. When generating payslips, these components will be dynamically calculated and displayed.
              </p>
            </div>

            {/* 1. Earnings Components */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  1. Earning Components ({salaryComponentsConfig.earnings.length})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Total:{" "}
                  {salaryComponentsConfig.earnings
                    .filter((e) => e.type === "PERCENT_CTC")
                    .reduce((sum, e) => sum + (Number(e.value) || 0), 0)}
                  % CTC
                </span>
              </div>

              <div className="space-y-2.5">
                {salaryComponentsConfig.earnings.map((earning, idx) => (
                  <div
                    key={earning.id || idx}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        value={earning.name}
                        onChange={(e) => handleUpdateEarning(idx, { name: e.target.value })}
                        className="w-full px-2 py-1 font-bold text-slate-900 border border-slate-300 rounded text-xs bg-white"
                        placeholder="Component Name"
                      />
                    </div>

                    <div className="w-28">
                      <select
                        value={earning.type}
                        onChange={(e) =>
                          handleUpdateEarning(idx, {
                            type: e.target.value as "PERCENT_CTC" | "FIXED",
                          })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-medium"
                      >
                        <option value="PERCENT_CTC">% of CTC</option>
                        <option value="FIXED">Fixed (₹)</option>
                      </select>
                    </div>

                    <div className="w-24 flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step={earning.type === "PERCENT_CTC" ? 1 : 50}
                        value={earning.value}
                        onChange={(e) =>
                          handleUpdateEarning(idx, {
                            value: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold text-right"
                      />
                      <span className="text-xs font-semibold text-slate-600">
                        {earning.type === "PERCENT_CTC" ? "%" : "₹"}
                      </span>
                    </div>

                    {!earning.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEarning(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                        title="Delete component"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Earning Component */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 space-y-2">
                <span className="font-bold text-emerald-950 text-xs flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-emerald-700" /> Add Custom Earning Component
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Component Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Medical Allowance, Conveyance..."
                      value={newEarningName}
                      onChange={(e) => setNewEarningName(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Type
                    </label>
                    <select
                      value={newEarningType}
                      onChange={(e) =>
                        setNewEarningType(e.target.value as "PERCENT_CTC" | "FIXED")
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    >
                      <option value="PERCENT_CTC">% of CTC</option>
                      <option value="FIXED">Fixed (₹)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Value
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newEarningValue}
                        onChange={(e) => setNewEarningValue(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddEarning}
                      disabled={!newEarningName.trim()}
                      className="mt-4 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-bold transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Deductions Components & Overtime */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  2. Deduction Components ({salaryComponentsConfig.deductions.length})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600">OT Multiplier:</span>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    step={0.1}
                    value={salaryComponentsConfig.otMultiplier}
                    onChange={(e) =>
                      setSalaryComponentsConfig((prev) => ({
                        ...prev,
                        otMultiplier: parseFloat(e.target.value) || 1,
                      }))
                    }
                    className="w-16 px-1.5 py-0.5 border border-slate-300 rounded font-bold text-center bg-white"
                  />
                  <span className="text-xs font-bold text-slate-600">&times;</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {salaryComponentsConfig.deductions.map((deduction, idx) => (
                  <div
                    key={deduction.id || idx}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        value={deduction.name}
                        onChange={(e) => handleUpdateDeduction(idx, { name: e.target.value })}
                        className="w-full px-2 py-1 font-bold text-slate-900 border border-slate-300 rounded text-xs bg-white"
                        placeholder="Component Name"
                      />
                    </div>

                    <div className="w-32">
                      <select
                        value={deduction.type}
                        onChange={(e) =>
                          handleUpdateDeduction(idx, {
                            type: e.target.value as "PERCENT_BASIC" | "PERCENT_CTC" | "FIXED",
                          })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-medium"
                      >
                        <option value="PERCENT_BASIC">% of Basic</option>
                        <option value="PERCENT_CTC">% of CTC</option>
                        <option value="FIXED">Fixed (₹)</option>
                      </select>
                    </div>

                    <div className="w-24 flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step={deduction.type === "FIXED" ? 50 : 0.5}
                        value={deduction.value}
                        onChange={(e) =>
                          handleUpdateDeduction(idx, {
                            value: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold text-right"
                      />
                      <span className="text-xs font-semibold text-slate-600">
                        {deduction.type === "FIXED" ? "₹" : "%"}
                      </span>
                    </div>

                    <div className="w-28 flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">Min:</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        placeholder="Thresh"
                        value={deduction.threshold || ""}
                        onChange={(e) =>
                          handleUpdateDeduction(idx, {
                            threshold: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs bg-white text-right"
                      />
                    </div>

                    {!deduction.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDeduction(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                        title="Delete component"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Deduction Component */}
              <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-3 space-y-2">
                <span className="font-bold text-rose-950 text-xs flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-rose-700" /> Add Custom Deduction Component
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Component Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Health Insurance, TDS..."
                      value={newDeductionName}
                      onChange={(e) => setNewDeductionName(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Type
                    </label>
                    <select
                      value={newDeductionType}
                      onChange={(e) =>
                        setNewDeductionType(
                          e.target.value as "PERCENT_BASIC" | "PERCENT_CTC" | "FIXED"
                        )
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    >
                      <option value="PERCENT_BASIC">% of Basic</option>
                      <option value="PERCENT_CTC">% of CTC</option>
                      <option value="FIXED">Fixed (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Value
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newDeductionValue}
                      onChange={(e) => setNewDeductionValue(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddDeduction}
                      disabled={!newDeductionName.trim()}
                      className="w-full py-1 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded text-xs font-bold transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3.5 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center justify-end space-x-2 z-10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={salaryLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{salaryLoading ? "Saving..." : "Save Salary Components"}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 5: WORK POLICY & SUNDAY OT */}
        {activeTab === "policy" && (
          <form onSubmit={handleSavePolicy} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
            {policyMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                  policyMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {policyMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{policyMessage.text}</span>
              </div>
            )}

            <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl space-y-1">
              <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-700" /> Company Work Hours &amp; Overtime Rules
              </span>
              <p className="text-[11px] text-blue-800">
                Configure standard company shift duration and weekend overtime guidelines. These rules determine regular shift hours, calculate employee overtime (OT) in attendance, and generate accurate salary slips.
              </p>
            </div>

            {/* Standard Daily Work Hours */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Standard Daily Work Hours <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={4}
                  max={12}
                  step={0.5}
                  required
                  value={companyDailyHours}
                  onChange={(e) => setCompanyDailyHours(parseFloat(e.target.value) || 8)}
                  className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">Hours / Day (e.g. 8.0 or 9.0)</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Standard daily work requirement. Any attendance logged beyond this count is marked as Overtime (OT).
              </p>
            </div>

            {/* Sunday Overtime Policy Toggle */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSundayOt}
                  onChange={(e) => setEnableSundayOt(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-800 text-xs block">
                    Sunday Work as 100% Overtime (OT)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    When enabled, any work hours logged on Sundays are automatically credited as Overtime (OT) to ensure fair compensation on salary slips.
                  </span>
                </div>
              </label>
            </div>

            {/* Standard Working Days per Month */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Standard Working Days per Month
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={20}
                  max={31}
                  required
                  value={standardWorkDays}
                  onChange={(e) => setStandardWorkDays(parseInt(e.target.value) || 26)}
                  className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">Days / Month (Standard: 26)</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Used as the denominator for calculating per-day salary rate and leave loss of pay (LWP).
              </p>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3.5 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center justify-end space-x-2 z-10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={policyLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{policyLoading ? "Saving Policy..." : "Save Work Policy"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
