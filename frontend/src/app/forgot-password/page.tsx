"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Shield, Sun, Moon, Eye, EyeOff, ArrowLeft, Mail, Lock, Check, X, KeyRound } from "lucide-react";
import { getLang, setLang, Lang } from "@/lib/i18n";
import { api } from "@/lib/api";

type Step = 1 | 2 | 3;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [lang, setLangState] = useState<Lang>("en");
  const [mounted, setMounted] = useState(false);

  // Step 1: email
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 2: OTP
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(300);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: new password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [resetToken, setResetToken] = useState("");

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email address is required");
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setStep(2);
      setResendTimer(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
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

  const handleOtpSubmit = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.verifyOtp(email.trim(), code);
      setResetToken(res.reset_token);
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setOtpTimer(300);
    setResendTimer(60);
    try {
      await api.forgotPassword(email.trim());
      inputRefs.current[0]?.focus();
    } catch {
      // silent
    }
  };

  const handleSetPassword = async () => {
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(email.trim(), otp.join(""), newPassword);
      document.cookie = "dfa-authed=true; path=/";
      router.push("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const pwChecks = [
    { text: "Minimum 8 characters", pass: newPassword.length >= 8 },
    { text: "Contains uppercase letter (A-Z)", pass: /[A-Z]/.test(newPassword) },
    { text: "Contains number (0-9)", pass: /[0-9]/.test(newPassword) },
    { text: "Contains symbol (!@#$%^&*)", pass: /[!@#$%^&*]/.test(newPassword) },
  ];
  const passedCount = pwChecks.filter((c) => c.pass).length;
  const pwStrength = passedCount <= 1 ? "weak" : passedCount <= 2 ? "medium" : passedCount <= 3 ? "good" : "strong";
  const pwColor =
    pwStrength === "weak" ? "var(--critical)" :
    pwStrength === "medium" ? "var(--severity-medium-text)" :
    pwStrength === "good" ? "var(--severity-low)" : "var(--severity-low)";

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
          <KeyRound size={22} />
        </div>

        {step === 1 && (
          <>
            <h1 className="text-center text-lg font-bold m-0 mb-0.5" style={{ color: "var(--text-primary)" }}>
              Reset password
            </h1>
            <p className="text-center text-xs mb-6" style={{ color: "var(--text-muted)" }}>
              Enter your registered email and we&apos;ll send a verification code
            </p>

            {/* Step indicator (3 steps) */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
              <div className="flex-1 max-w-[48px] h-px" style={{ background: "var(--border-subtle)" }} />
              <div className="w-2 h-2 rounded-full" style={{ border: "1px solid var(--border-subtle)" }} />
              <div className="flex-1 max-w-[48px] h-px" style={{ background: "var(--border-subtle)" }} />
              <div className="w-2 h-2 rounded-full" style={{ border: "1px solid var(--border-subtle)" }} />
            </div>

            <form onSubmit={handleEmailSubmit}>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Email address
              </label>
              <div className="relative mb-5">
                <input
                  type="email"
                  placeholder="analyst01@lti-internal.id"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  className="w-full pr-10"
                  style={{
                    fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none",
                  }}
                />
                <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              </div>
              <span className="font-mono text-[10px] block mb-4" style={{ color: "var(--text-muted)" }}>
                Must match the email registered to your account
              </span>

              {error && (
                <p className="text-xs text-center mb-3" style={{ color: "var(--critical)" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium cursor-pointer border-none disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff" }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "var(--accent-hover)"; }}
                onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
              >
                {loading ? "Sending..." : "Send verification code"}
              </button>
            </form>

            <div
              className="flex items-center justify-end gap-1 text-xs mt-3.5 cursor-pointer"
              style={{ color: "var(--text-muted)" }}
              onClick={() => router.push("/login")}
            >
              <ArrowLeft size={12} />
              Back to login
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-center text-lg font-bold m-0 mb-0.5" style={{ color: "var(--text-primary)" }}>
              Enter verification code
            </h1>
            <p className="text-center text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Sent to {email || "your email"}
            </p>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
              <div className="flex-1 max-w-[48px] h-px" style={{ background: "var(--accent)" }} />
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
              <div className="flex-1 max-w-[48px] h-px" style={{ background: "var(--border-subtle)" }} />
              <div className="w-2 h-2 rounded-full" style={{ border: "1px solid var(--border-subtle)" }} />
            </div>

            <div
              className="rounded-lg p-3 mb-4 text-xs leading-relaxed"
              style={{
                background: "var(--bg-base)",
                borderLeft: "2px solid var(--accent)",
              }}
            >
              <strong className="block mb-0.5 text-xs" style={{ color: "var(--text-primary)" }}>
                Check your inbox
              </strong>
              <span style={{ color: "var(--text-secondary)" }}>
                A 6-digit code was sent. It expires in 5 minutes. If you don&apos;t see it, check your spam folder.
              </span>
            </div>

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

            <div className="font-mono text-[11px] text-center mb-5" style={{ color: "var(--text-muted)" }}>
              Expires in <span style={{ color: "var(--accent)" }}>{fmtTime(otpTimer)}</span>
            </div>

            {error && (
              <p className="text-xs text-center mb-3" style={{ color: "var(--critical)" }}>{error}</p>
            )}

            <button
              onClick={handleOtpSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium cursor-pointer border-none disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "var(--accent-hover)"; }}
              onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>

            <button
              onClick={handleResend}
              disabled={resendTimer > 0}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold border cursor-pointer disabled:opacity-50 mt-2 font-sans"
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
              Use a different email
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-center text-lg font-bold m-0 mb-0.5" style={{ color: "var(--text-primary)" }}>
              Set new password
            </h1>
            <p className="text-center text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Identity verified. Create a strong new password.
            </p>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
              <div className="flex-1 max-w-[48px] h-px" style={{ background: "var(--accent)" }} />
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
              <div className="flex-1 max-w-[48px] h-px" style={{ background: "var(--accent)" }} />
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
            </div>

            {/* Password policy notice */}
            <div
              className="rounded-lg p-4 mb-4"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-2.5" style={{ color: "var(--text-primary)" }}>
                <Lock size={13} style={{ color: "var(--accent)" }} />
                Password policy (from Settings)
              </div>
              <div className="space-y-1">
                {[
                  { key: "Minimum length", val: "8 characters" },
                  { key: "Uppercase required", val: "Yes", green: true },
                  { key: "Number required", val: "Yes", green: true },
                  { key: "Symbol required", val: "Yes (!@#$%^&*)", green: true },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-0.5"
                  >
                    <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{item.key}</span>
                    <span className="font-mono text-[11px]" style={{ color: item.green ? "var(--severity-low)" : "var(--text-primary)" }}>
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                New password
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setError(""); }}
                  placeholder="Enter new password"
                  className="w-full pr-10"
                  style={{
                    fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 border-none bg-none cursor-pointer p-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength meter */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-[3px] rounded-full"
                        style={{
                          background: i <= passedCount ? pwColor : "var(--border-subtle)",
                        }}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-[10px]" style={{ color: pwColor }}>
                    {pwStrength === "weak" && "Weak — try adding more variety"}
                    {pwStrength === "medium" && "Medium — add a symbol to strengthen"}
                    {pwStrength === "good" && "Good — almost there"}
                    {pwStrength === "strong" && "Strong"}
                  </div>
                </div>
              )}

              <div className="mt-2.5 space-y-1.5">
                {pwChecks.map((req) => (
                  <div
                    key={req.text}
                    className="flex items-center gap-1.5 font-mono text-[10px]"
                    style={{ color: req.pass ? "var(--severity-low)" : "var(--text-muted)" }}
                  >
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

            <div className="mb-5">
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
                  placeholder="Re-enter new password"
                  className="w-full pr-10"
                  style={{
                    fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "9px 12px", outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 border-none bg-none cursor-pointer p-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <span className="font-mono text-[10px] mt-1 block" style={{ color: "var(--critical)" }}>
                  Passwords do not match
                </span>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <span className="font-mono text-[10px] mt-1 block" style={{ color: "var(--severity-low)" }}>
                  <Check size={10} className="inline mr-0.5" />
                  Passwords match
                </span>
              )}
            </div>

            {error && (
              <p className="text-xs text-center mb-3" style={{ color: "var(--critical)" }}>{error}</p>
            )}

            <button
              onClick={handleSetPassword}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium cursor-pointer border-none disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "var(--accent-hover)"; }}
              onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
            >
              {loading ? "Resetting..." : "Set new password"}
            </button>

            <div className="font-mono text-[10px] text-center mt-3" style={{ color: "var(--text-muted)" }}>
              You&apos;ll be redirected to login after resetting.
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
