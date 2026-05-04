import { signIn } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/hello";
  const error = params.error;

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: callbackUrl });
  }

  async function signInWithEmail(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    await signIn("resend", { email, redirectTo: callbackUrl });
  }

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Sign in to Brilworks</h1>
      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          Could not sign in: {error}
        </p>
      ) : null}

      <form action={signInWithGoogle} style={{ marginTop: "1.5rem" }}>
        <button type="submit" style={{ width: "100%", padding: "0.75rem" }}>
          Continue with Google
        </button>
      </form>

      <hr style={{ margin: "1.5rem 0" }} />

      <form action={signInWithEmail}>
        <label htmlFor="email" style={{ display: "block", marginBottom: 4 }}>
          Email magic link
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          style={{ width: "100%", padding: "0.5rem", marginBottom: "0.75rem" }}
        />
        <button type="submit" style={{ width: "100%", padding: "0.75rem" }}>
          Send magic link
        </button>
      </form>
    </main>
  );
}
