import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SentryInit } from "./sentry-init";

export const metadata: Metadata = {
  title: "Brilworks",
  description: "Brilworks app shell",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SentryInit />
        {children}
      </body>
    </html>
  );
}
