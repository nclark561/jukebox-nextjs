import NextAuth from "next-auth/next";
import SpotifyProvider from "next-auth/providers/spotify";

const clientId = process.env.CLIENT_ID as string;
const clientSecret = process.env.CLIENT_SECRET as string;
const secret = process.env.SECRET as string;

const scopes = [
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-email",
  "streaming",
  "user-read-private",
  "user-library-read",
  "user-top-read",
  "app-remote-control",
  "streaming",
  "user-read-playback-position",
  "user-top-read",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
].join(",");

async function refreshAccessToken(token: any) {
  try {
    const url =
      "https://accounts.spotify.com/api/token?" +
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      });
      console.log(url)

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.log(error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions = {
  providers: [
    SpotifyProvider({
      clientId,
      clientSecret,
      authorization: {
        params: {
          scope: scopes,
        },
      },
    }),
  ],
  secret,
  callbacks: {
    async jwt({ token, account }: { token: any; account: any }) {
      if (account) {
        token.id = account.id;
        token.accessToken = account.access_token;
        token.accessTokenExpires = Date.now() + account.expires_in * 1000
        token.refreshToken = account.refresh_token
      }
      if(Date.now() < token.accessTokenExpires) return token
      return refreshAccessToken(token)
    },
    async session({ session, token }: { session: any; token: any }) {
      session.user = token;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
