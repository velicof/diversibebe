declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.trim();
      if (!email) return false;

      const name = user.name ?? null;
      const image = user.image ?? null;

      try {
        const { data: existing, error: selectError } = await supabase
          .from("profiles")
          .select("email")
          .eq("email", email)
          .maybeSingle();

        if (selectError) {
          console.error("[supabase] profiles select", selectError);
          return true;
        }

        if (!existing) {
          const { error: insertError } = await supabase.from("profiles").insert({
            email,
            name,
            image,
          });
          if (insertError) console.error("[supabase] profiles insert", insertError);
        }
      } catch (e) {
        console.error("[supabase] signIn callback", e);
      }

      return true;
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.provider = account.provider;
      }

      if (account?.provider === "google" && user?.email) {
        const email = user.email.trim();
        try {
          const { data } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (data?.id) {
            (token as any).supabaseId = data.id;
          }
        } catch (e) {
          console.error("[supabase] jwt callback profiles select", e);
        }
      }

      return token;
    },
    async session({ session, token }) {
      const supabaseId = (token as any)?.supabaseId;
      if (supabaseId && session.user) {
        (session.user as any).id = supabaseId as string;
      }
      return session;
    },
    async redirect({ baseUrl }) {
      return baseUrl + "/dashboard";
    },
  },
};
