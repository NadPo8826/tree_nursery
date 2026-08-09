"use client";

import { useEffect, useRef, useState } from "react";

/** Bottom-corner toast confirming admin saves (fired by SaveButton). */
export function AdminToaster() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onSaved = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail || "השינויים נשמרו");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), 3000);
    };
    window.addEventListener("admin:saved", onSaved);
    return () => {
      window.removeEventListener("admin:saved", onSaved);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 start-5 z-[60] flex items-center gap-2.5 rounded-full bg-soil px-5 py-3 text-sm text-ink-cream shadow-2xl shadow-soil/40"
      style={{ animation: "storyfade 0.25s ease-out" }}
    >
      <span className="grid size-5 place-items-center rounded-full bg-leaf text-[11px] text-white">
        ✓
      </span>
      {message}
    </div>
  );
}
