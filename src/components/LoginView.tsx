"use client";

import React, { useState } from "react";
import { User } from "@/types";
import {
  LogIn,
  Lock,
  User as UserIcon,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  KeyRound,
} from "lucide-react";

interface LoginViewProps {
  allUsers?: User[];
  onLogin: (user: User) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your User ID / Email and Password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-100/50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-7 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo Image */}
            <div className="bg-white p-3 rounded-2xl shadow-lg">
              <img
                src="/logo.png"
                alt="nacsconsulting"
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          </div>
        </div>

        {/* Unified Login Form (No Role Tabs) */}
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your User ID and password to access your designated workspace
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl text-xs bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User ID or Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                User ID / Email Address
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="admin or gaurav141@gmail.com or employee User ID"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 mt-5 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? "Verifying Credentials..." : "Sign In to Workspace"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          {/* Admin Credentials Guide */}
          <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70 text-[11px] text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin Access Credentials:</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5 font-mono text-[10px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-700">User ID / Email:</span>
                <span className="text-slate-800 font-bold">admin <span className="font-normal text-slate-500 font-sans">(or gaurav141@gmail.com)</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-700">Default Password:</span>
                <span className="text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">admin123</span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-100 font-sans">
                <span>Admin Gmail Account:</span>
                <span className="font-mono text-slate-700 font-medium">gaurav141@gmail.com</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              * Admin can change password anytime in Account Settings. Team members log in with credentials created by Admin.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
          Navkar Accounting &amp; Consultancy Services &bull; Secure Authentication
        </div>
      </div>
    </div>
  );
}
