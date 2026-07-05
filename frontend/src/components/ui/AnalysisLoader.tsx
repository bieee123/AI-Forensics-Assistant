"use client";
import { useState, useEffect } from "react";
import { Brain, CheckCircle2, Circle, Hourglass } from "lucide-react";

const STEPS = [
  { key: "parsing",    delay: 0 },
  { key: "extracting", delay: 2000 },
  { key: "querying",   delay: 5000 },
  { key: "generating", delay: 8000 },
];

interface Props {
  steps: { parsing: string; extracting: string; querying: string; generating: string };
  estimatedTime: string;
  onCancel?: () => void;
}

export default function AnalysisLoader({ steps, estimatedTime, onCancel }: Props) {
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    const timers = STEPS.slice(0, 3).map(s =>
      setTimeout(() => setDone(prev => [...prev, s.key]), s.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mb-6 animate-pulse">
        <Brain size={24} style={{ color: "var(--accent)" }} />
      </div>
      <div className="space-y-3 w-full max-w-xs mb-6">
        {STEPS.map(s => {
          const isDone = done.includes(s.key);
          const isActive = s.key === "generating" || (s.key !== "generating" && !isDone);
          return (
            <div key={s.key} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-center flex-shrink-0 flex items-center justify-center">
                {isDone ? (
                  <CheckCircle2 size={18} style={{ color: "var(--severity-low)" }} />
                ) : s.key === "generating" ? (
                  <Hourglass size={18} style={{ color: "var(--severity-high)" }} />
                ) : (
                  <Circle size={18} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                )}
              </span>
              <span className={isDone ? "text-text-secondary line-through" : "text-text-primary"}>
                {steps[s.key as keyof typeof steps]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-text-muted mb-4">{estimatedTime}</p>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-xs text-text-muted hover:text-text-secondary underline"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
