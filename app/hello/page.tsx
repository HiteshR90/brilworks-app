import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function HelloPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/hello");
  }

  const display = session.user.name ?? session.user.email ?? "friend";

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>hello, {display}</h1>
      <p style={{ color: "#666" }}>
        Signed in as <code>{session.user.email}</code>.
      </p>
      <form action={signOutAction} style={{ marginTop: "1.5rem" }}>
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Sign out
        </button>
      </form>
    </main>
  );
}
