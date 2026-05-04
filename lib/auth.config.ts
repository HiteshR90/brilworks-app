import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/signin",
  },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnHello = nextUrl.pathname.startsWith("/hello");
      if (isOnHello && !isLoggedIn) {
        const signInUrl = new URL("/signin", nextUrl);
        signInUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(signInUrl);
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
