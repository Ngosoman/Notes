# Notes

## Connect your Supabase project

The app needs a Supabase project before you can register, sign in, or save notes.

1. Create a project in the [Supabase Dashboard](https://supabase.com/dashboard). Keep its database password somewhere secure; it is not used by the frontend.
2. In the project's **Connect** dialog or **Project Settings → API**, copy the Project URL and the publishable key. The publishable key is safe for browser use; never use a `service_role` or secret key in this app.
3. From the repository root, copy the example environment file and edit `.env.local` with those two values:

	```powershell
	Copy-Item .env.example .env.local
	```

	```dotenv
	VITE_SUPABASE_URL=https://your-project-ref.supabase.co
	VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
	```

	`.env.local` is ignored by Git. Do not commit it or put server-side AI credentials in it.

4. Apply the database schema and private PDF storage policies to your project:

	```sh
	npx supabase login
	npx supabase link --project-ref your-project-ref
	npx supabase db push
	```

	The project reference is the part between `https://` and `.supabase.co` in your Project URL. `db push` applies the migrations in `supabase/migrations`.

5. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:5173` and add `http://localhost:5173/**` to the redirect URL allow list. This supports signup confirmation and password reset locally.
6. Start the app. Restart the dev server after changing `.env.local`:

	```sh
	npm install
	npm run dev
	```

You can now register and use the database-backed parts of the app. PDF text processing, summaries, study set generation, quiz submission, and Ask Your Notes also require the Edge Functions and server-side AI secrets described in [Supabase deployment](supabase/README.md).

## Checks

```sh
npm run lint
npm run build
```
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
