# V3 Digital Studio

A standalone Next.js website for V3 Digital Studio. The Field design combines original SVG motion, a system-aware light/dark palette, a Cal.com booking dialog, and a Resend contact form.

## Local development

Requires Node.js 24+ and pnpm 12.3.4.

```sh
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars # first setup only; preserve an existing file
pnpm dev:api
```

Add your Resend sending key to `.dev.vars`. Start the frontend in a second terminal:

```sh
pnpm dev
```

Open http://localhost:3000. The frontend proxies `/api/*` to the Worker on port 8788. Never commit `.dev.vars` or place server credentials in `NEXT_PUBLIC_*` variables.

## Production build

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm preview
```

Next.js 16.3.4 uses the public Adapter API through `adapters/cloudflare.mts`. The adapter exports the prerendered page and copies the framework outputs to `.cloudflare/assets`. Cloudflare Workers Static Assets serves the page; `worker/index.ts` handles `/api/contact`. This adapter supports this static site, not arbitrary server-rendered Next.js applications.

Field is the only published design, at `/`. Previous design paths permanently redirect home. Earlier design explorations, local notes, and QA evidence live in ignored directories and are not deployed.

## Contact and booking

The booking buttons open https://cal.com/v3digitalstudio/20min on demand. The contact form sends from `V3 Digital Studio <forms@v3digital.studio>` to `contact@v3digital.studio`, with the visitor’s address as Reply-To. Resend must have a verified sending domain and a `RESEND_API_KEY` Worker secret.

The Worker validates and bounds incoming JSON, rejects cross-origin requests, checks a honeypot, limits each IP to five submissions per minute, and uses a stable idempotency key for retries. It reports success only after Resend accepts the message.

## Deployment

Authenticate with the Cloudflare account that owns `v3digital.studio`:

```sh
pnpm exec wrangler login
pnpm exec wrangler secret put RESEND_API_KEY
pnpm deploy
```

The secret command prompts securely. Local `.dev.vars` values do not automatically become production secrets. Check `wrangler.jsonc` for the account and domain before deploying. Deployment must pass the build and type checks, and the public contact form and booking dialog should be checked after each release.

The visual system uses user-supplied V3 logos and Mona Sans. Component structure was adapted from the user’s licensed Tailwind UI Studio and Tailwind Plus TypeScript sources. Product explorations and SVG artwork are original to this project.
