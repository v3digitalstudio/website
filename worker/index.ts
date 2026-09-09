import { handleContact } from "./contact";

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.replace(/\/$/, "") !== "/api/contact")
      return env.ASSETS.fetch(request);
    try {
      return await handleContact(request, env);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "contact_request_failed",
          kind: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      return Response.json(
        { error: "We couldn’t send your message. Please try again." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  },
} satisfies ExportedHandler<CloudflareEnv>;
