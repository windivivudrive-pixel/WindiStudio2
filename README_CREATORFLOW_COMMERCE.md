# CreatorFlow Commerce Deployment Guide

This repository has been transitioned from the WindiStudio2 AI image generator into the **CreatorFlow Commerce** platform. It now supports selling CreatorFlow Studio licenses and CreatorFlow Voice Units via SePay webhooks.

## 1. Database Migrations

Run the SQL migration to create the new tables.

```bash
supabase db push
# or manually run the SQL in supabase/migrations/20260811000000_creatorflow_commerce.sql
# and supabase/migrations/20260811000001_process_order_rpc.sql
```

## 2. Deploying Edge Functions

The system uses three Supabase Edge Functions:
- `payment-webhook`: Listens for SePay successful transfers, validates API key, and atomically grants licenses/units.
- `create-order`: Generates a pending order and unique payment code (CFxxxxxx).
- `voice-provider`: Mocked Cartesia TTS endpoint. Deducts from voice ledger.

Deploy them:
```bash
supabase functions deploy create-order
supabase functions deploy payment-webhook
supabase functions deploy voice-provider
```

## 3. Environment Variables

Set the secrets for the Edge Functions:
```bash
supabase secrets set VITE_SEPAY_API_KEY="YOUR_SEPAY_KEY"
supabase secrets set CARTESIA_API_KEY="YOUR_CARTESIA_KEY"
```

## 4. SePay Configuration
1. Go to the SePay Dashboard.
2. Setup Webhook URL to: `https://[YOUR-PROJECT-REF].supabase.co/functions/v1/payment-webhook`
3. Check the "Add Authorization Header" (or similar) setting in SePay to include your `Apikey YOUR_SEPAY_KEY`.

## 5. Uploading CreatorFlow Studio
Users expect to download `CreatorFlow Studio v1.0.0` from their Dashboard.
1. Create a **private** Supabase Storage bucket called `creatorflow-releases`.
2. Upload the `CreatorFlow-Studio-v1.0.0.zip` file there.
3. (Future) Update the frontend to generate a signed URL via an Edge Function for download.

## 6. Starting the Frontend

```bash
npm install
npm run dev
```
