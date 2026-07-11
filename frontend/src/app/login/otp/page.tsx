"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Shield, Sun, Moon, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { getLang, setLang, Lang } from "@/lib/i18n";

export default function LoginOtpPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [lang, setLangState] = useState<Lang>("en");
  const [mounted, setMounted] = useState(false);

  // Step 1: credentials
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");

  // Step 2: OTP
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(300);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { setMounted(true); setLangState(getLang()); }, []);

  useEffect(() => {
    if (step === 2 && otpTimer > 0) {
      const t = setInterval(() => setOtpTimer((p) => p - 1), 1000);
      return () => clearInterval(t);
    }
  }, [step, otpTimer]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setInterval(() => setResendTimer((p) => p - 1), 1000);
      return () => clearInterval(t);
    }
  }, [resendTimer]);

  const toggleLang = () => {
    const next = lang === "en" ? "id" : "en";
    setLang(next);
    setLangState(next);
    window.dispatchEvent(new Event("lang-change"));
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }
    if (username.toLowerCase() === "wrong") {
      setError("Invalid credentials. Please try again.");
      return;
    }
    setStep(2);
    setResendTimer(60);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    document.cookie = "dfa-authed=true; path=/";
    router.push("/dashboard");
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setOtpTimer(300);
    setResendTimer(60);
    inputRefs.current[0]?.focus();
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (!mounted) return null;

  return (
    <div
      className="flex items-center justify-center h-screen"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-[400px] border rounded-xl p-8"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Logo */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
        >
          <Shield size={22} />
        </div>

        {step === 1 ? (
          <>
            <h1 className="text-center text-lg font-bold m-0 mb-0.5" style={{ color: "var(--text-primary)" }}>
              Secure Login
            </h1>
            <p className="text-center text-xs mb-6" style={{ color: "var(--text-muted)" }}>
              Forensic Triage &mdash; Powered by Local AI
            </p>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
              <div className="flex-1 max-w-[48px] h-px" style={{ background: "var(--border-subtle)" }} />
              <div className="w-2 h-2 rounded-full" style={{ border: "1px solid var(--border-subtle)", background: "transparent" }} />
            </div>

            <form onSubmit={handleCredentialsSubmit}>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Username
              </label>
              <input
                type="text"
                placeholder="analyst01"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                className="w-full mb-4"
                style={{
                  fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none",
                }}
              />

              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Password
              </label>
              <div className="relative mb-5">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  className="w-full pr-10"
                  style={{
                    fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 border-none bg-none cursor-pointer p-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-center mb-3" style={{ color: "var(--critical)" }}>{error}</p>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium cursor-pointer border-none"
                style={{ background: "var(--accent)", color: "#fff" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
              >
                Continue &mdash; send OTP
              </button>
            </form>

            <div
              className="text-center text-xs mt-3.5 cursor-pointer"
              style={{ color: "var(--accent)" }}
              onClick={() => router.push("/forgot-password")}
            >
              Forgot password?
            </div>
          </>
        ) : (
          <>
            <h1 className="text-center text-lg font-bold m-0 mb-0.5" style={{ color: "var(--text-primary)" }}>
              Verify your email
            </h1>
            <p className="text-center text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Enter the 6-digit code sent to
            </p>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
              <div className="flex-1 max-w-[48px] h-px" style={{ background: "var(--accent)" }} />
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
            </div>

            {/* Info box */}
            <div
              className="rounded-lg p-3 mb-4 text-xs leading-relaxed"
              style={{
                background: "var(--bg-base)",
                borderLeft: "2px solid var(--accent)",
              }}
            >
              <strong className="block mb-0.5 text-xs" style={{ color: "var(--text-primary)" }}>
                {username || "analyst01"}@lti-internal.id
              </strong>
              <span style={{ color: "var(--text-secondary)" }}>
                A 6-digit code was sent to this address. Check your inbox and enter it below. Expires in 5 minutes.
              </span>
            </div>

            {/* OTP inputs */}
            <div className="flex gap-2 justify-center mb-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-[44px] h-[52px] rounded-lg text-center text-xl font-bold font-mono"
                  style={{
                    background: "var(--bg-base)",
                    color: digit ? "var(--accent)" : "var(--text-primary)",
                    border: `2px solid ${digit ? "var(--accent)" : "var(--border-subtle)"}`,
                    outline: "none",
                  }}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {/* Timer */}
            <div className="font-mono text-[11px] text-center mb-5" style={{ color: "var(--text-muted)" }}>
              Expires in <span style={{ color: "var(--accent)" }}>{fmtTime(otpTimer)}</span>
            </div>

            {error && (
              <p className="text-xs text-center mb-3" style={{ color: "var(--critical)" }}>{error}</p>
            )}

            <button
              onClick={handleOtpSubmit}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium cursor-pointer border-none"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
            >
              Verify &amp; sign in
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            </div>

            <button
              onClick={handleResend}
              disabled={resendTimer > 0}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold border cursor-pointer disabled:opacity-50 font-sans"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                borderColor: "var(--border-subtle)",
              }}
              onMouseEnter={e => { if (resendTimer === 0) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
            >
              Resend code {resendTimer > 0 ? `(wait ${resendTimer}s)` : ""}
            </button>

            <div
              className="flex items-center justify-center gap-1 text-xs mt-2.5 cursor-pointer"
              style={{ color: "var(--text-muted)" }}
              onClick={() => { setStep(1); setOtp(["", "", "", "", "", ""]); setError(""); setOtpTimer(300); }}
            >
              <ArrowLeft size={12} />
              Back to login
            </div>
          </>
        )}

        {/* Bottom bar */}
        <div className="flex justify-between mt-5">
          <button
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border-none cursor-pointer bg-transparent"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span className="font-mono text-[11px]">{lang === "en" ? "EN → ID" : "ID → EN"}</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border-none cursor-pointer bg-transparent"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {mounted && theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            <span>Theme</span>
          </button>
        </div>
      </div>
    </div>
  );
}
