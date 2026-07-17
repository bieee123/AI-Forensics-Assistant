"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Shield, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { getLang, setLang, t, Lang } from "@/lib/i18n";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [lang, setLangState] = useState<Lang>("en");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); setLangState(getLang()); }, []);

  const tr = t(lang);

  const toggleLang = () => {
    const next = lang === "en" ? "id" : "en";
    setLang(next);
    setLangState(next);
    window.dispatchEvent(new Event("lang-change"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const errs: { username?: string; password?: string } = {};

    if (!username.trim()) errs.username = tr.login.usernameRequired;
    if (!password.trim()) errs.password = tr.login.passwordRequired;

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

      setLoading(true);
    try {
      const res = await api.login(username.trim(), password);
      document.cookie = `dfa-token=${res.token}; path=/; max-age=28800`;
      document.cookie = "dfa-authed=true; path=/; max-age=28800";
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials")) {
        setError(tr.login.error);
      } else {
        setError(msg || tr.login.error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className="flex items-center justify-center h-screen"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-[380px] border rounded-xl p-8"
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

        <h1 className="text-center text-lg font-bold m-0 mb-0.5" style={{ color: "var(--text-primary)" }}>
          {tr.login.title}
        </h1>
        <p className="text-center text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          {tr.login.subtitle}
        </p>

        <form onSubmit={handleSubmit}>
          <label className="field-label text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {tr.login.username}
          </label>
          <input
            type="text"
            placeholder="analyst01"
            value={username}
            onChange={e => { setUsername(e.target.value); setFieldErrors({}); setError(""); }}
            className="w-full mb-3.5"
            style={{
              fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)",
              border: `1px solid var(--border-subtle)`, borderRadius: 6, padding: "9px 12px", outline: "none",
            }}
          />
          {fieldErrors.username && (
            <p className="text-xs mt-[-10px] mb-3" style={{ color: "var(--severity-critical)" }}>{fieldErrors.username}</p>
          )}

          <label className="field-label text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {tr.login.password}
          </label>
          <div className="relative mb-5">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setFieldErrors({}); setError(""); }}
              className="w-full pr-10"
              style={{
                fontFamily: "inherit", fontSize: 13, background: "var(--bg-base)", color: "var(--text-primary)",
                border: `1px solid var(--border-subtle)`, borderRadius: 6, padding: "9px 12px", outline: "none",
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
          {fieldErrors.password && (
            <p className="text-xs mt-[-16px] mb-3" style={{ color: "var(--severity-critical)" }}>{fieldErrors.password}</p>
          )}

          {error && (
            <p className="text-xs text-center mb-3" style={{ color: "var(--severity-critical)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium cursor-pointer border-none disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "var(--accent-hover)"; }}
            onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
          >
            {loading ? "Signing in..." : tr.login.submit}
          </button>
        </form>

        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={() => router.push("/forgot-password")}
            className="text-xs border-none bg-transparent cursor-pointer font-sans"
            style={{ color: "var(--accent)" }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
          >
            {tr.login.forgotPassword}
          </button>
        </div>

        <div className="flex justify-between mt-3">
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
