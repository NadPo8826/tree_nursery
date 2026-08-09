"use client";

import { useEffect, useRef, type ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

/**
 * Submit button for admin forms that announces success: when the server
 * action it triggered completes, it fires the "admin:saved" event that
 * AdminToaster (in the admin layout) shows as a toast.
 *
 * Only the button that was actually clicked fires the toast — forms with
 * several submit buttons (save + delete) each report their own message.
 */
export function SaveButton({
  toast = "השינויים נשמרו",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { toast?: string }) {
  const { pending } = useFormStatus();
  const clicked = useRef(false);
  const wasPending = useRef(false);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const announce = () => {
    clicked.current = false;
    window.dispatchEvent(
      new CustomEvent("admin:saved", { detail: toastRef.current }),
    );
  };

  // Path 1: the form survives the save — pending goes true → false here.
  useEffect(() => {
    if (wasPending.current && !pending && clicked.current) announce();
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // Path 2: forms keyed by their data remount on a successful save, which
  // unmounts us mid-flight — announce from the unmount cleanup instead.
  useEffect(() => {
    return () => {
      if (clicked.current && wasPending.current) announce();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      {...rest}
      disabled={pending || rest.disabled}
      onClick={(e) => {
        clicked.current = true;
        rest.onClick?.(e);
      }}
      className={`${className ?? ""} disabled:opacity-60`}
    >
      {children}
    </button>
  );
}
