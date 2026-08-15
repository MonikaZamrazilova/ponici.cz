"use client";

import { useState } from "react";
import { Input, tokens } from "@admin/ui";

/**
 * Password input s show/hide toggle (ikona oka).
 * Default je skrytý (type="password"); po kliknutí password ↔ text.
 * Heslo se nikde neukládá navíc — jen toggle typu inputu.
 */
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <Input
        {...props}
        type={visible ? "text" : "password"}
        style={{ paddingRight: 40, ...props.style }}
      />
      <button
        type="button"
        aria-label={visible ? "Skrýt heslo" : "Zobrazit heslo"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        style={{
          position: "absolute",
          insetInlineEnd: 4,
          top: "50%",
          transform: "translateY(-50%)",
          width: 30,
          height: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          color: tokens.colors.muted,
        }}
      >
        {visible ? (
          /* oko s přeškrtnutím — skrýt */
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <path d="M2 2l20 20" />
          </svg>
        ) : (
          /* oko — zobrazit */
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
