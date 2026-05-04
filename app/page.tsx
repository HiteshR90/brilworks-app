import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Brilworks</h1>
      <p>App shell. See README.md.</p>
      <p>
        <Link href="/signin">Sign in</Link>
      </p>
    </main>
  );
}
