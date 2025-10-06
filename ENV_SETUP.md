# Environment Setup Guide

To run the LangLab application, you need to create a `.env.local` file in the root directory with the following environment variables:

## Required Variables

### Database

```env
DATABASE_URL="file:./dev.db"
```

### NextAuth

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"
```

## Optional Variables (for full functionality)

### Google OAuth

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Kakao OAuth

```env
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"
```

### Stripe (for payments)

```env
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID="price_your-pro-price-id"
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID="price_your-premium-price-id"
```

### OpenAI (for AI features)

```env
OPENAI_API_KEY="your-openai-api-key"
```

### Firebase (for additional features)

```env
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
```

## Quick Start

1. Create a `.env.local` file in the project root
2. Add at least the required variables above
3. Install deps with `pnpm install`
4. Start the dev server yourself with `pnpm dev`

## Vercel (Production) Setup

1. Provision a Postgres database (Supabase/Neon/PlanetScale Postgres)
2. In Vercel Project Settings → Environment Variables:
   - `DATABASE_URL=postgres://...`
   - `NEXTAUTH_URL=https://<your-domain>`
   - `NEXTAUTH_SECRET=<random-secret>`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional)
   - `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` (optional)
3. OAuth redirect URIs:
   - `https://<your-domain>/api/auth/callback/google`
   - `https://<your-domain>/api/auth/callback/kakao`
4. Apply Prisma migrations to production DB:
   - Locally with prod `DATABASE_URL`: `pnpm db:deploy`
   - Or enable a Vercel build step to run `pnpm db:deploy`
5. Push to the main branch to trigger Vercel redeploy

The application will work with just the required variables, but additional features like OAuth login, payments, and AI features will require the optional variables.
