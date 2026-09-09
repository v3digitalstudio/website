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
  if (fields.website) return json({ error: "Request not accepted." }, 400);
  if (!env.RESEND_API_KEY)
    return json(
      { error: "Email is unavailable. Please email us directly." },
      503,
    );
  const limit = await env.CONTACT_LIMITER.limit({
    key: request.headers.get("CF-Connecting-IP") ?? "local",
  });
  if (!limit.success)
    return json({ error: "Please try again in a minute." }, 429);
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
