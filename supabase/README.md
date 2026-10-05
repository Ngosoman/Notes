# Supabase deployment

From the repository root, link the Supabase project and apply migrations before deploying the Edge Functions:

```sh
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy process-document
supabase functions deploy generate-summary
```

The summary function calls an OpenAI-compatible Chat Completions endpoint through a server-side adapter. Configure these Edge Function secrets in the Supabase project; do not add them to `.env`, Vercel `VITE_` variables, or frontend code:

```sh
supabase secrets set AI_API_URL=https://your-provider.example/v1 AI_API_KEY=<provider-secret> AI_MODEL=<model-name>
```

`AI_API_URL` is the provider API base URL; the adapter appends `/chat/completions` unless the URL already ends with that path. Use the provider's server-side secret key. The browser invokes `generate-summary` with its authenticated session; only the Edge Function reads the AI key.

The structured summaries migration creates summary, topic, formula, definition, and exam-question tables with owner-scoped read policies. The service-role key used by Supabase Functions is supplied by the Supabase runtime and must never be exposed to the browser.
