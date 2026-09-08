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

  const [activeTab, setActiveTab] = useState<"password" | "gmail">("password");

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

  useEffect(() => {
    if (!isOpen) {
      setPasswordMessage(null);
      setGmailMessage(null);
      setTestEmailMessage(null);
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

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
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
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
              activeTab === "password"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("gmail")}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                activeTab === "gmail"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Gmail &amp; EOD Reports</span>
            </button>
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
                <li>Search or click <strong className="text-slate-800">App Passwords</strong>, name it <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">TaskManagement</code>, and paste the 16 letters above.</li>
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
      </div>
    </div>
  );
}
