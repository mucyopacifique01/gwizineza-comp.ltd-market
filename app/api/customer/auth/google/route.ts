/** Step 1 of Google sign-up/in: redirect the customer to Google's consent screen. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = new URL(request.url).origin;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return Response.redirect(`${origin}/auth?error=google-not-configured`, 302);
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/customer/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
}
