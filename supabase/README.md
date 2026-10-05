# Supabase deployment

From the repository root, link the Supabase project and apply migrations before deploying the Edge Functions:

```sh
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy process-document
supabase functions deploy generate-summary
supabase functions deploy generate-study-set
supabase functions deploy submit-quiz
```

The summary function calls an OpenAI-compatible Chat Completions endpoint through a server-side adapter. Configure these Edge Function secrets in the Supabase project; do not add them to `.env`, Vercel `VITE_` variables, or frontend code:

```sh
supabase secrets set AI_API_URL=https://your-provider.example/v1 AI_API_KEY=<provider-secret> AI_MODEL=<model-name>
```

`AI_API_URL` is the provider API base URL; the adapter appends `/chat/completions` unless the URL already ends with that path. Use the provider's server-side secret key. The browser invokes `generate-summary` with its authenticated session; only the Edge Function reads the AI key.

The structured summaries migration creates summary, topic, formula, definition, and exam-question tables with owner-scoped read policies. The service-role key used by Supabase Functions is supplied by the Supabase runtime and must never be exposed to the browser.

The study tools migration creates flashcards, quizzes, quiz questions, private quiz answer keys, quiz attempts, and study sessions. `quiz_answer_keys` has no authenticated grants or read policy; answer keys are read only by the `submit-quiz` Edge Function after the learner submits. Never add answer-key fields to a client select or generation response.

Study-set generation uses the same server-only `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL` secrets. Quiz attempts and quiz study time are graded and recorded server-side; flashcard review state and quick/deep study session duration are saved for the signed-in owner.
