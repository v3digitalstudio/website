import { Resend } from "resend";
import { z } from "zod";

const inquiry = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[^\r\n]+$/),
  email: z.email().max(254),
  project: z.string().trim().min(10).max(4000),
  website: z.string().max(200).default(""),
  requestId: z.uuid(),
  turnstileToken: z.string().min(1).max(2048),
});
const verification = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
});
const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function handleContact(
  request: Request,
  env: CloudflareEnv,
): Promise<Response> {
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  const origin = request.headers.get("Origin");
  const url = new URL(request.url);
  const allowedOrigin =
    origin === url.origin ||
    (env.DEV_ORIGIN !== "" && origin === env.DEV_ORIGIN);
  if (!allowedOrigin) return json({ error: "Request not allowed." }, 403);
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "A message is required." }, 400);
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 20000) {
      await reader.cancel();
      return json({ error: "Message too large." }, 413);
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError)
      return json({ error: "Invalid JSON." }, 400);
    throw error;
  }
  const parsed = inquiry.safeParse(body);
  if (!parsed.success)
    return json({ error: "Please check the form fields." }, 422);
  const fields = parsed.data;
  if (fields.website) return json({ ok: true });
  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY)
    return json(
      { error: "Email is unavailable. Please email us directly." },
      503,
    );
  const ip = request.headers.get("CF-Connecting-IP");
  const limit = await env.CONTACT_LIMITER.limit({ key: ip ?? "local" });
  if (!limit.success)
    return json({ error: "Please try again in a minute." }, 429);
  const verified = await verifyTurnstile(fields.turnstileToken, ip, env);
  if (verified === "unavailable")
    return json(
      { error: "Verification is unavailable. Please email us directly." },
      503,
    );
  // Cloudflare's local test keys report a placeholder hostname and no action.
  const strict = env.DEV_ORIGIN === "";
  if (
    verified === "rejected" ||
    (strict &&
      (verified.hostname !== url.hostname || verified.action !== "contact"))
  )
    return json({ error: "Verification failed. Please try again." }, 403);
  const resend = new Resend(env.RESEND_API_KEY);
  const result = await resend.emails.send(
    {
      from: env.RESEND_FROM,
      to: ["contact@v3digital.studio"],
      replyTo: fields.email,
      subject: `New project inquiry from ${fields.name}`,
      text: `${fields.project}\n\nName: ${fields.name}\nEmail: ${fields.email}`,
    },
    { idempotencyKey: `contact/${fields.requestId}` },
  );
  if (result.error || !result.data?.id)
    return json({ error: "Email is unavailable. Please try again." }, 502);
  return json({ ok: true });
}

async function verifyTurnstile(
  token: string,
  ip: string | null,
  env: CloudflareEnv,
) {
  let body: unknown;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return "unavailable";
    body = await response.json();
  } catch {
    return "unavailable";
  }
  const result = verification.safeParse(body);
  if (!result.success) return "unavailable";
  return result.data.success ? result.data : "rejected";
}
