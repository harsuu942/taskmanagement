"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/types";
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

  // Leave Types & Quotas State
  const [earnedDays, setEarnedDays] = useState<number>(18);
  const [earnedLeaveAccrual, setEarnedLeaveAccrual] = useState<number>(1.5);
  const [casualDays, setCasualDays] = useState<number>(0);
  const [sickDays, setSickDays] = useState<number>(0);
  const [unpaidEnabled, setUnpaidEnabled] = useState<boolean>(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Salary & Deduction Components State
  const [defaultBasicPercent, setDefaultBasicPercent] = useState<number>(50);
  const [defaultHraPercent, setDefaultHraPercent] = useState<number>(30);
  const [defaultSpecialPercent, setDefaultSpecialPercent] = useState<number>(20);
  const [defaultPfPercent, setDefaultPfPercent] = useState<number>(12);
  const [defaultPtAmount, setDefaultPtAmount] = useState<number>(200);
  const [defaultOtMultiplier, setDefaultOtMultiplier] = useState<number>(1.5);
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
          if (data.settings.earnedDays !== undefined) setEarnedDays(data.settings.earnedDays);
          if (data.settings.earnedLeaveAccrual !== undefined) setEarnedLeaveAccrual(data.settings.earnedLeaveAccrual);
          if (data.settings.casualDays !== undefined) setCasualDays(data.settings.casualDays);
          if (data.settings.sickDays !== undefined) setSickDays(data.settings.sickDays);
          if (data.settings.unpaidEnabled !== undefined) setUnpaidEnabled(data.settings.unpaidEnabled);
          if (data.settings.defaultBasicPercent !== undefined) setDefaultBasicPercent(data.settings.defaultBasicPercent);
          if (data.settings.defaultHraPercent !== undefined) setDefaultHraPercent(data.settings.defaultHraPercent);
          if (data.settings.defaultSpecialPercent !== undefined) setDefaultSpecialPercent(data.settings.defaultSpecialPercent);
          if (data.settings.defaultPfPercent !== undefined) setDefaultPfPercent(data.settings.defaultPfPercent);
          if (data.settings.defaultPtAmount !== undefined) setDefaultPtAmount(data.settings.defaultPtAmount);
          if (data.settings.defaultOtMultiplier !== undefined) setDefaultOtMultiplier(data.settings.defaultOtMultiplier);
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
          earnedDays,
          earnedLeaveAccrual,
          casualDays,
          sickDays,
          unpaidEnabled,
          annualLeaveQuota: earnedDays + casualDays + sickDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save leave quota settings.");
      setLeaveMessage({
        type: "success",
        text: "Leave types & annual quotas updated successfully! Types with 0 days are removed from cards.",
      });
    } catch (err: any) {
      setLeaveMessage({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setLeaveLoading(false);
    }
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
          defaultBasicPercent,
          defaultHraPercent,
          defaultSpecialPercent,
          defaultPfPercent,
          defaultPtAmount,
          defaultOtMultiplier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save salary components.");
      setSalaryMessage({
        type: "success",
        text: "Earning & deduction components saved successfully! Applied to payslip generator.",
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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
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
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1 overflow-x-auto">
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
                <span>🌴 Leave Types &amp; Quotas</span>
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
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>💰 Salary Components</span>
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
          <form onSubmit={handleChangePassword} className="p-6 space-y-4 text-xs">
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
          <form onSubmit={handleSaveGmail} className="p-6 space-y-4 text-xs">
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
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
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
          <form onSubmit={handleSaveLeave} className="p-6 space-y-4 text-xs">
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
                Configure annual leave quotas for staff. Any leave type set to <span className="font-bold">0 days</span> is automatically hidden and excluded from employee leave summary cards.
              </p>
            </div>

            {/* Earned Leave */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Palmtree className="w-4 h-4 text-blue-700" />
                  <span className="font-bold text-blue-950 text-xs uppercase tracking-wider">
                    Earned Leave (EL) &bull; Standard Paid Leave
                  </span>
                </div>
                <span className="bg-blue-200 text-blue-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  Primary
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Annual Quota Days <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    step={0.5}
                    required
                    value={earnedDays}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEarnedDays(val);
                      setEarnedLeaveAccrual(parseFloat((val / 12).toFixed(2)));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 18 days/year</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Monthly Accrual (Days / Month)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.1}
                    required
                    value={earnedLeaveAccrual}
                    onChange={(e) => setEarnedLeaveAccrual(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 1.5 days accrued / month</span>
                </div>
              </div>
            </div>

            {/* Casual Leave */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coffee className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Casual Leave (CL)
                  </span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${casualDays > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"}`}>
                  {casualDays > 0 ? `${casualDays}d Configured` : "Removed / Disabled (0d)"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={60}
                  step={0.5}
                  value={casualDays}
                  onChange={(e) => setCasualDays(parseFloat(e.target.value) || 0)}
                  className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  Leave as <span className="font-bold text-slate-700">0</span> if Casual Leave is not offered. It will not show on employee cards.
                </p>
              </div>
            </div>

            {/* Sick Leave */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HeartPulse className="w-4 h-4 text-rose-700" />
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Sick Leave (SL)
                  </span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${sickDays > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-600"}`}>
                  {sickDays > 0 ? `${sickDays}d Configured` : "Removed / Disabled (0d)"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={60}
                  step={0.5}
                  value={sickDays}
                  onChange={(e) => setSickDays(parseFloat(e.target.value) || 0)}
                  className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  Leave as <span className="font-bold text-slate-700">0</span> if Sick Leave is not offered. It will not show on employee cards.
                </p>
              </div>
            </div>

            {/* Unpaid / LWP Toggle */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block text-xs">
                  Unpaid Leave / Leave Without Pay (LWP) Card
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Show LWP card in leave balance summary widget
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={unpaidEnabled}
                  onChange={(e) => setUnpaidEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Total Summary Pill */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">Total Configured Annual Paid Leave Quota:</span>
              <span className="font-extrabold text-emerald-800 text-sm bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">
                {earnedDays + casualDays + sickDays} Days / Year
              </span>
            </div>

            {/* Actions */}
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
                disabled={leaveLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{leaveLoading ? "Saving..." : "Save Leave Quotas"}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: SALARY & DEDUCTION COMPONENTS */}
        {activeTab === "salary" && (
          <form onSubmit={handleSaveSalary} className="p-6 space-y-4 text-xs">
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
                Configure company-wide standard component proportions for salary slip generation. When creating payslips, these percentages divide employee monthly CTC into basic pay, allowances, and statutory deductions.
              </p>
            </div>

            {/* Earnings Breakdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  1. Earnings Components (% of CTC)
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  defaultBasicPercent + defaultHraPercent + defaultSpecialPercent === 100
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  Total: {defaultBasicPercent + defaultHraPercent + defaultSpecialPercent}% CTC
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Basic Salary (% CTC)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      step={1}
                      required
                      value={defaultBasicPercent}
                      onChange={(e) => setDefaultBasicPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                    />
                    <span className="text-xs font-bold text-slate-600">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 50%</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    HRA (% CTC)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      required
                      value={defaultHraPercent}
                      onChange={(e) => setDefaultHraPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                    />
                    <span className="text-xs font-bold text-slate-600">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 30%</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Special / Conveyance (% CTC)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      required
                      value={defaultSpecialPercent}
                      onChange={(e) => setDefaultSpecialPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                    />
                    <span className="text-xs font-bold text-slate-600">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 20%</span>
                </div>
              </div>
            </div>

            {/* Overtime & Statutory Deductions */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block border-b border-slate-200 pb-2">
                2. Overtime &amp; Deduction Components
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Overtime Hourly Multiplier
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={3}
                      step={0.1}
                      required
                      value={defaultOtMultiplier}
                      onChange={(e) => setDefaultOtMultiplier(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                    />
                    <span className="text-xs font-bold text-slate-600">&times;</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 1.5&times; rate</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Provident Fund (PF) (% Basic)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      required
                      value={defaultPfPercent}
                      onChange={(e) => setDefaultPfPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                    />
                    <span className="text-xs font-bold text-slate-600">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 12% on Basic</span>
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
                      value={defaultPtAmount}
                      onChange={(e) => setDefaultPtAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: ₹200 / month</span>
                </div>
              </div>
            </div>

            {/* Actions */}
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
                disabled={salaryLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{salaryLoading ? "Saving..." : "Save Salary Components"}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 5: WORK POLICY & SUNDAY OT */}
        {activeTab === "policy" && (
          <form onSubmit={handleSavePolicy} className="p-6 space-y-4 text-xs">
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
