import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider
      }
      return token
    },
    async session({ session, token }) {
      return session
    },
    async redirect({ url, baseUrl }) {
      return baseUrl + '/dashboard'
    },
  },
})

export { handler as GET, handler as POST }
