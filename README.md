# DailyNest

Your life-admin app: today, plan, home, money, and you. It runs as a website, installs on a phone from the browser, and can be packaged as an Android app. React + TypeScript + Vite, with Supabase for sign-in and cloud saving.

> **Status:** written and checked with a simulated Supabase and a test browser. It has **not** been run against your live Supabase project, your Netlify site, or a real phone. See [What is not tested](#what-is-not-tested) and use the checklist at the end before sharing it.

---

## 1. One-time setup

### 1a. Database
Your project already has the table and function (the same SQL you ran before). It is kept in `supabase/migrations/20261020000000_dailynest_state.sql`. If you ever make a fresh Supabase project, paste that file into **SQL Editor → New query** and run it once. It is safe to run again.

### 1b. Sign-in settings (Supabase dashboard)
**Authentication → URL Configuration**
- Site URL: `https://YOUR-SITE.netlify.app/`
- Redirect URLs: `https://YOUR-SITE.netlify.app/` and `https://YOUR-SITE.netlify.app/?recovery=1`

**Authentication → Emails / SMTP**: to let friends sign up and reset passwords, set up custom SMTP. The default email sender only delivers to your own team addresses.

**Authentication → Sign In / Providers**: leave "Allow new users to sign up" on for a public launch, off for private use.

### 1c. Settings in the app
Copy `.env.example` to `.env`. The Supabase values already point at your project. Set `VITE_SITE_URL` to your Netlify address.

---

## 2. Run it on your computer
Needs [Node.js](https://nodejs.org) 20 or newer.

```
npm install
npm run dev        # opens at http://localhost:5173
npm run typecheck  # checks the TypeScript
npm run build      # makes the finished site in dist/
```

(For local sign-in to work, also add `http://localhost:5173/` to the Supabase redirect URLs.)

## 3. Put it online (Netlify)
Push this folder to GitHub and connect the repository in Netlify. `netlify.toml` already sets the build command (`npm run build`), the folder (`dist`) and the security headers. Add the three `VITE_` values under **Site configuration → Environment variables**.

Deploy to your **existing** Netlify site and address if you can: browsers keep each person's offline copy per address, so a new address starts empty until they sign in and sync.

---

## 4. Get it as an app on a phone

### Option A: install from the browser (nothing to build)
On Android Chrome, open your Netlify address, then menu → **Install app**. DailyNest then opens full-screen from the home screen, with its own icon, and works offline for what is already saved. This is the fastest route and is already built in.

### Option B: a real Android app file (APK), built in the cloud
You do not need Android Studio or any Android tools.
1. Create a free GitHub account and a new repository. Upload this whole folder to it.
2. In the repository: **Settings → Secrets and variables → Actions → Variables → New repository variable**. Name: `SITE_URL`. Value: your Netlify address, e.g. `https://your-site.netlify.app/`.
3. Open the **Actions** tab → **Build Android app** → **Run workflow**.
4. When the run turns green (about 5–10 minutes), open it and download **DailyNest-android-apk** under *Artifacts*. Unzip it to get `app-debug.apk`.
5. Send the APK to your phone, open it, and allow "install from this source" when Android asks.

This gives a **debug** APK: perfect for you and friends to install directly. It cannot be uploaded to the Google Play Store. A Play Store release needs a signed release build and a Google Play developer account; ask for that as a next step.

Before your first real release, decide the app's permanent ID in `capacitor.config.ts` (`appId`). It cannot be changed afterwards without it counting as a different app.

**Email links and the app:** confirmation and password-reset emails always open your *website* in the phone's browser (that is why `SITE_URL` is needed). After confirming or resetting there, return to the app and sign in.

---

## 5. How the code is organised

```
src/
  config.ts            project settings (Supabase address, timing)
  main.tsx, App.tsx    start-up; chooses sign-in screen or the app
  Workspace.tsx        the signed-in app: owns the data, runs the sync, shows the tabs
  auth/                useAuth.ts (all sign-in logic), AuthScreen.tsx (the forms)
  state/
    types.ts           the shape of everything that is saved
    defaults.ts        empty data, and cleaning of loaded/backup data
    actions.ts         EVERY change to the data (one place)
    selectors.ts       numbers and advice worked out from the data
  sync/cloudSync.ts    browser copy + Supabase copy + conflict handling
  features/            one folder per tab: today, plan, home, money, me
  components/          shared pieces: nav bar, dialog, sync bar, task row
  hooks/               weather, focus timer, toast, install prompt
  lib/                 dates, small helpers, the Supabase client
public/                manifest, service worker, icons
supabase/migrations/   the database SQL
```

### Add a feature (example: a "mood note" on Today)
1. **Shape:** add the field to `AppState` in `state/types.ts`, and a default in `state/defaults.ts`.
2. **Change:** add a case to `Action` and to the `switch` in `state/actions.ts`.
3. **Show:** read it in a `features/.../Tab.tsx` and call `run({ type: 'your-action', ... })`.

Saving to the phone, syncing to the cloud, and conflict checks then work with no further code, because they act on the whole saved object.

### Add a tab
Add an entry to `TABS` in `components/BottomNav.tsx`, add its id to `TabId` in `state/types.ts`, create `features/<name>/<Name>Tab.tsx`, and add one line in `Workspace.tsx`.

### How saving works
Every edit is saved in the browser immediately and uploaded about a second later through the `dailynest_save_state` database function. The function only accepts an upload whose revision number matches the cloud's. If another device saved first, nothing is overwritten and the sync bar shows **Resolve conflict**, where you choose which whole copy to keep (the other one is downloaded as a backup first). There is no automatic merging.

---

## What is not tested
- Not run against your live Supabase project: real sign-up, emails, password reset, and row-level-security behaviour need checking by you.
- The Android APK was **not built here** (the build environment cannot download the Android toolchain). The cloud build is a standard Capacitor setup but has not been run; if a step fails, the Actions log will say which.
- Installing, offline use, and the install prompt have not been tried on a real phone.
- Closed-app reminders and notifications do not exist: reminders show inside the app while it is open.

## Checklist before sharing
1. Sign up with a non-team email; confirm, sign in, reset password, sign in again.
2. Add a task, a stock item and a spend; wait for "Cloud saved".
3. Sign in on a second device or browser: same records appear.
4. Sign in as a second account: the first account's data must not appear.
5. Go offline, change something, reconnect, tap **Sync now**.
6. Edit on two devices from the same starting point: you should see **Resolve conflict**, not lost data.
7. Choose a weather town; export a backup and restore it with test data.
8. Install on the phone; reopen it; sign out.

Local caches and backup files are not encrypted. Sign out on shared devices.
