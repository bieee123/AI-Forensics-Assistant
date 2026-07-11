"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, User, Mail, Briefcase, Building, Lock, Eye, EyeOff,
  Calendar, LogOut, Check, X, Clock, RefreshCw, Edit3,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { getLang, t, Lang } from "@/lib/i18n";

export default function ProfilePage() {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>("en");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => { setLangState(getLang()); }, []);

  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  const handleLogout = () => {
    document.cookie = "dfa-authed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/login");
  };

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Profile Hero */}
        <div
          className="rounded-xl border p-5 mb-6 flex items-center gap-5 relative"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-[22px] font-bold flex-shrink-0 border-2"
            style={{
              background: "var(--accent-bg)",
              color: "var(--accent)",
              borderColor: "var(--accent)",
            }}
          >
            A1
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold m-0" style={{ color: "var(--text-primary)" }}>analyst01</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              analyst01@lti-internal.id &nbsp;·&nbsp; Forensic Analyst
            </p>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span className="w-[6px] h-[6px] rounded-full inline-block" style={{ background: "var(--severity-low)", boxShadow: "0 0 5px var(--severity-low)" }} />
                Session active
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                <Clock size={11} />
                Last login: 2026-07-05 17:12:03
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-all"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                borderColor: "var(--border-subtle)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
            >
              <Edit3 size={13} />
              Edit profile
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-all"
              style={{
                background: "rgba(255,77,106,0.08)",
                color: "var(--critical)",
                borderColor: "rgba(255,77,106,0.25)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,77,106,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,77,106,0.08)"; }}
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Sessions", value: "47", sub: "Since: 2026-01-12" },
            { label: "Logs Uploaded", value: "213", sub: "~8.6 GB total" },
            { label: "Reports Generated", value: "31", sub: "Last: Jul 05, 2026" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border p-4"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </div>
              <div className="font-mono text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {stat.value}
              </div>
              <div className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-2 gap-5 mb-6">
          {/* Account Information */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                <div className="w-[2px] h-[13px]" style={{ background: "var(--accent)" }} />
                Account information
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide block mb-1" style={{ color: "var(--text-secondary)" }}>
                  Full name <span style={{ color: "var(--critical)" }}>*</span>
                </label>
                <input
                  type="text"
                  value="Ahmad Analyst"
                  disabled
                  className="w-full rounded-md px-3 py-2 text-[13px] font-sans"
                  style={{
                    background: "var(--bg-base)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    opacity: 0.6,
                    cursor: "not-allowed",
                  }}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide block mb-1" style={{ color: "var(--text-secondary)" }}>
                  Username <span style={{ color: "var(--critical)" }}>*</span>
                </label>
                <input
                  type="text"
                  value="analyst01"
                  disabled
                  className="w-full rounded-md px-3 py-2 text-[13px] font-sans"
                  style={{
                    background: "var(--bg-base)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    opacity: 0.6,
                    cursor: "not-allowed",
                  }}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide block mb-1" style={{ color: "var(--text-secondary)" }}>
                  Email <span style={{ color: "var(--critical)" }}>*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value="analyst01@lti-internal.id"
                    className="w-full rounded-md px-3 py-2 text-[13px] font-sans pr-9"
                    style={{
                      background: "var(--bg-base)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  />
                  <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                </div>
                <span className="font-mono text-[10px] mt-1 block" style={{ color: "var(--text-muted)" }}>
                  Used for OTP authentication and notifications
                </span>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide block mb-1" style={{ color: "var(--text-secondary)" }}>
                  Role
                </label>
                <input
                  type="text"
                  value="Forensic Analyst"
                  disabled
                  className="w-full rounded-md px-3 py-2 text-[13px] font-sans"
                  style={{
                    background: "var(--bg-base)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    opacity: 0.6,
                    cursor: "not-allowed",
                  }}
                />
                <span className="font-mono text-[10px] mt-1 block" style={{ color: "var(--text-muted)" }}>
                  Contact admin to change role
                </span>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide block mb-1" style={{ color: "var(--text-secondary)" }}>
                  Organization
                </label>
                <input
                  type="text"
                  value="PT Teknologi Nasional Indonesia Siber (LTI)"
                  disabled
                  className="w-full rounded-md px-3 py-2 text-[13px] font-sans"
                  style={{
                    background: "var(--bg-base)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    opacity: 0.6,
                    cursor: "not-allowed",
                  }}
                />
              </div>
            </div>
            <div
              className="flex justify-end gap-2.5 px-5 py-3 border-t"
              style={{
                background: "var(--bg-base)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <button
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold border cursor-pointer font-sans"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  borderColor: "var(--border-subtle)",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
              >
                Cancel
              </button>
              <button
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer border-none font-sans"
                style={{ background: "var(--accent)", color: "#fff" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)"; }}
              >
                Save changes
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                <div className="w-[2px] h-[13px]" style={{ background: "var(--accent)" }} />
                Change password
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide block mb-1" style={{ color: "var(--text-secondary)" }}>
                  Current password <span style={{ color: "var(--critical)" }}>*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    placeholder="••••••••••"
                    className="w-full rounded-md px-3 py-2 text-[13px] font-sans pr-9"
                    style={{
                      background: "var(--bg-base)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  />
                  <button
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 border-none bg-none cursor-pointer p-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide block mb-1" style={{ color: "var(--text-secondary)" }}>
                  New password <span style={{ color: "var(--critical)" }}>*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-md px-3 py-2 text-[13px] font-sans pr-9"
                    style={{
                      background: "var(--bg-base)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  />
                  <button
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 border-none bg-none cursor-pointer p-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="mt-2">
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-[3px] rounded-full"
                        style={{ background: i <= 2 ? "var(--severity-medium)" : "var(--border-subtle)" }}
                      />
                    ))}
                    <div
                      className="flex-1 h-[3px] rounded-full"
                      style={{ background: "var(--border-subtle)" }}
                    />
                  </div>
                  <div className="font-mono text-[10px]" style={{ color: "var(--severity-medium-text)" }}>
                    Medium &mdash; add a symbol to strengthen
                  </div>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {[
                    { text: "Minimum 8 characters", pass: true },
                    { text: "Contains uppercase letter (A-Z)", pass: true },
                    { text: "Contains number (0-9)", pass: true },
                    { text: "Contains symbol (!@#$%^&*)", pass: false },
                  ].map((req) => (
                    <div key={req.text} className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: req.pass ? "var(--severity-low)" : "var(--text-muted)" }}>
                      <div
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: req.pass ? "rgba(6,214,160,0.12)" : "transparent",
                          border: `1px solid ${req.pass ? "rgba(6,214,160,0.3)" : "var(--border-subtle)"}`,
                        }}
                      >
                        {req.pass ? <Check size={7} style={{ color: "var(--severity-low)" }} /> : <X size={7} />}
                      </div>
                      {req.text}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide block mb-1" style={{ color: "var(--text-secondary)" }}>
                  Confirm new password <span style={{ color: "var(--critical)" }}>*</span>
                </label>
                <input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Re-enter new password"
                  className="w-full rounded-md px-3 py-2 text-[13px] font-sans"
                  style={{
                    background: "var(--bg-base)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                />
              </div>
            </div>
            <div
              className="flex justify-end px-5 py-3 border-t"
              style={{
                background: "var(--bg-base)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <button
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer border-none font-sans"
                style={{ background: "var(--accent)", color: "#fff" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)"; }}
              >
                Update password
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                <div className="w-[2px] h-[13px]" style={{ background: "var(--accent)" }} />
                Recent activity
              </div>
              <span
                className="text-[11px] cursor-pointer font-sans"
                style={{ color: "var(--accent)" }}
              >
                View all &rarr;
              </span>
            </div>
            <div className="p-5">
              {[
                { dot: "var(--severity-low)", ts: "2026-07-05 17:12:03", msg: 'Login successful &mdash; OTP verified via <strong>analyst01@lti-internal.id</strong>' },
                { dot: "var(--accent)", ts: "2026-07-05 17:14:22", msg: 'Uploaded log: <strong>sample_auth.log</strong> (4 entries)' },
                { dot: "var(--accent)", ts: "2026-07-05 17:25:09", msg: 'AI analysis triggered on <strong>sample_auth.log</strong> &mdash; Severity: HIGH' },
                { dot: "var(--severity-medium)", ts: "2026-07-04 09:03:17", msg: "Failed login attempt &mdash; OTP was not submitted within 5 minutes" },
                { dot: "var(--severity-low)", ts: "2026-07-04 09:08:42", msg: "Password changed successfully" },
              ].map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 py-2.5 border-b last:border-b-0"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <div
                    className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-1"
                    style={{ background: activity.dot }}
                  />
                  <span className="font-mono text-[10px] whitespace-nowrap flex-shrink-0 min-w-[120px]" style={{ color: "var(--text-muted)" }}>
                    {activity.ts}
                  </span>
                  <span
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                    dangerouslySetInnerHTML={{ __html: activity.msg }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Security settings */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                <div className="w-[2px] h-[13px]" style={{ background: "var(--accent)" }} />
                Security settings
              </div>
            </div>
            <div className="p-5">
              <div
                className="rounded-lg p-4 mb-4"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-2.5" style={{ color: "var(--text-primary)" }}>
                  <Lock size={13} style={{ color: "var(--accent)" }} />
                  Password policy
                </div>
                <div className="space-y-1">
                  {[
                    { key: "Minimum length", val: "8 characters" },
                    { key: "Require uppercase", val: "Enabled", green: true },
                    { key: "Require number", val: "Enabled", green: true },
                    { key: "Require symbol", val: "Enabled", green: true },
                    { key: "OTP on login", val: "Enabled", green: true },
                    { key: "OTP delivery", val: "Email" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-1 border-b last:border-b-0"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{item.key}</span>
                      <span
                        className="font-mono text-[11px]"
                        style={{ color: item.green ? "var(--severity-low)" : "var(--text-primary)" }}
                      >
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="font-mono text-[10px] m-0" style={{ color: "var(--text-muted)" }}>
                Policy configured by system administrator in Settings. Contact admin to modify.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
