import { Webhook } from 'standardwebhooks';

export const runtime = 'nodejs';

function getHeader(headers: Headers, name: string) {
  return headers.get(name) ?? '';
}

export async function POST(request: Request) {
  const hookSecret = process.env.SUPABASE_SEND_SMS_HOOK_SECRET;
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!hookSecret || !apiKey) {
    return Response.json({ error: 'TextBee SMS hook is not configured' }, { status: 503 });
  }

  const rawBody = await request.text();

  try {
    const webhook = new Webhook(hookSecret);
    webhook.verify(rawBody, {
      'webhook-id': getHeader(request.headers, 'webhook-id'),
      'webhook-timestamp': getHeader(request.headers, 'webhook-timestamp'),
      'webhook-signature': getHeader(request.headers, 'webhook-signature'),
    });
  } catch {
    return Response.json({ error: 'Invalid Supabase Auth hook signature' }, { status: 401 });
  }

  let payload: {
    user?: { phone?: string | null };
    sms?: { otp?: string | null };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;

  if (!phone || !otp) {
    return Response.json({ error: 'Phone number and OTP are required' }, { status: 400 });
  }

  const textBeeResponse = await fetch('https://api.textbee.dev/api/v1/gateway/send-sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      recipients: [phone],
      message: `Gwizineza Market verification code: ${otp}. Do not share this code with anyone.`,
      ...(deviceId ? { deviceId } : {}),
    }),
  });

  if (!textBeeResponse.ok) {
    const detail = await textBeeResponse.text().catch(() => '');
    console.error('TextBee SMS send failed', textBeeResponse.status, detail);
    return Response.json({ error: 'SMS provider failed to send the OTP' }, { status: 502 });
  }

  return new Response(null, { status: 200 });
}
