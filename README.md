# AeroPay Demo

A sample web app that walks through the AeroPay sandbox end to end: sign in, verify a user, link a bank account, and run payments, preauthorizations, and payouts.

Built with **Next.js**, **Supabase** (app login), and the **AeroPay sandbox API**.

## What you can try

- **Sign up / sign in** with email and password (Supabase Auth)
- **Onboard an AeroPay user** and confirm identity with a sandbox OTP
- **Link a bank account** through the Aerosync widget
- **Send a payment** from a linked account to the merchant
- **Create and capture preauthorizations** (authorize now, charge later)
- **Send payouts** from the merchant to a customer's bank
- **View transactions** and optional webhook events on the dashboard

This is a demo, not production software. All AeroPay calls go through server-side API routes so secrets never reach the browser.

## Prerequisites

- **Node.js 18.18+** (Node 20+ recommended)
- A **Supabase** project ([supabase.com](https://supabase.com))
- **AeroPay sandbox** credentials ([aeropay.com/demo](https://www.aeropay.com/demo))

## Quick start

1. **Clone and install**

   ```sh
   npm install
   ```

2. **Configure environment**

   ```sh
   cp .env.example .env.local
   ```

   Fill in your Supabase and AeroPay values in `.env.local`. See the table below — do not commit that file.

3. **Set up the database**

   Run `supabase/schema.sql` in the Supabase SQL editor, or apply migrations with the Supabase CLI if you use it locally.

   In **Authentication → Providers**, turn off email confirmation so new accounts work immediately in the demo.

4. **Run the app**

   ```sh
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `AEROPAY_API_KEY` | AeroPay API key |
| `AEROPAY_API_SECRET` | AeroPay API secret |
| `AEROPAY_MERCHANT_ID` | Your sandbox merchant ID |
| `AEROPAY_BASE_URL` | Sandbox API base URL (see `.env.example`) |
| `NEXT_PUBLIC_APP_URL` | Public app URL for webhook registration |
| `NEXT_PUBLIC_AEROSYNC_CONFIGURATION_ID` | Aerosync profile from your Solutions Engineer (enables sandbox OTP bypass) |

Copy `.env.example` and replace every placeholder with your own values.

## Sandbox shortcuts

When testing in the AeroPay sandbox:

| Step | Code |
| ---- | ---- |
| Confirm user (6-digit OTP after sign-up) | `000000` |
| Aerosync widget (4-digit OTP for returning users) | `0000` (requires `NEXT_PUBLIC_AEROSYNC_CONFIGURATION_ID`) |

Aerosync test codes: `0001` expired, `0002` too many attempts, `0003` account not found, `0004` server error.

## Typical flow

1. Sign in on the home page
2. Complete onboarding — AeroPay user creation and MFA confirmation
3. Link a bank account on **Bank Link**
4. Use **Send**, **Preauth**, or **Payout** once a bank account is connected

Returning users who are already verified in AeroPay should not go through user creation again; they pick up at bank linking or payments.

## Webhooks (optional)

AeroPay needs a public URL to deliver webhooks. In local development, tunnel with [ngrok](https://ngrok.com) (or similar), set `NEXT_PUBLIC_APP_URL` to the tunnel URL, restart the dev server, then register webhooks while signed in:

```sh
curl -X POST http://localhost:3000/api/aeropay/webhooks/register \
  -H "Cookie: <your session cookies>"
```

You can also trigger registration from the browser devtools while logged in.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Production build

```sh
npm run build
npm start
```

The PWA service worker registers only in production builds.

## Deploy on Vercel

This is a standard Next.js App Router app — Vercel detects it automatically. No custom `vercel.json` is required.

1. Push the repo to GitHub and import it in [Vercel](https://vercel.com).
2. Add every variable from `.env.example` under **Project → Settings → Environment Variables**.
3. Set `NEXT_PUBLIC_APP_URL` to your Vercel production URL (e.g. `https://your-app.vercel.app`).
4. Deploy. Vercel runs `npm run build` and serves the app as serverless functions.

For AeroPay webhooks in production, register your Vercel URL with the webhook register endpoint after deploy.

## Learn more

- [AeroPay API docs](https://dev.aero.inc/docs/getting-started)
- [Aerosync Web SDK](https://dev.aero.inc/docs/npm-sdk)

## Stack

Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Supabase Auth, AeroPay sandbox API, Aerosync Web SDK.
