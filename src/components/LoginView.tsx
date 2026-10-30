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
  ShieldCheck,
  Sparkles,
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
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-50/70">
      {/* Ambient background glow */}
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-400/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10">
        {/* Brand Header */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/15 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo Image */}
            <div className="bg-white p-3 rounded-2xl shadow-xl ring-1 ring-white/20 mb-3.5 transition-transform hover:scale-105 duration-200">
              <img
                src="/logo.png"
                alt="nacsconsulting"
                className="h-14 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  const fb = document.getElementById("nacs-login-fallback");
                  if (fb) fb.style.display = "flex";
                }}
              />
              <div id="nacs-login-fallback" style={{ display: "none" }} className="items-center space-x-2 px-3 py-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-blue-900 text-white font-black text-sm flex items-center justify-center shadow-md">
                  NACS
                </div>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-blue-200 mb-2">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Enterprise Task &amp; Workspace Portal</span>
            </div>

            <h1 className="text-xl font-black tracking-tight text-white">
              <span className="text-emerald-400">NACS</span> CONSULTING
            </h1>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Navkar Accounting &amp; Consultancy Services
            </p>
          </div>
        </div>

        {/* Unified Login Form */}
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access your designated workspace
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl text-xs bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User ID or Email */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                User ID / Email Address
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. EMP001 or admin@nacs.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50/80 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50/80 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md transition"
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
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 mt-6 disabled:opacity-50 disabled:pointer-events-none"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? "Verifying Credentials..." : "Sign In to Workspace"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Navkar Accounting &amp; Consultancy Services &bull; Secure Authentication</span>
        </div>
      </div>
    </div>
  );
}
