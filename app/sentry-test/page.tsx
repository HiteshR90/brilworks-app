"use client";

import { useState } from "react";

export default function DeliberateErrorPage() {
  const [armed, setArmed] = useState(false);

  if (armed) {
    throw new Error(
      `BRI-5 deliberate error — ${new Date().toISOString()} — verifying Sentry pipeline`,
    );
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Deliberate error</h1>
      <p>
        Click the button to throw an unhandled error. Sentry should pick it up within ~1 minute.
        This page exists to verify the observability pipeline (BRI-5).
      </p>
      <button
        type="button"
        onClick={() => setArmed(true)}
        style={{
          marginTop: "1rem",
          padding: "0.75rem 1.25rem",
          fontSize: "1rem",
          cursor: "pointer",
        }}
      >
        Throw test error
      </button>
      <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#666" }}>
        See <code>docs/observability.md</code> for the verification runbook.
      </p>
    </main>
  );
}
