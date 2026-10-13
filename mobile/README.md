# LAYA Mobile

LAYA is the Expo / React Native client for JusticeLink. It is the current product-development priority and contains citizen, attorney, and shared case workflows.

## Implemented workflows

- Account session restore and role-based navigation.
- Citizen conversational triage, assessment review, and attorney matching.
- Attorney dashboard, assigned cases, case lifecycle actions, and service-hour logging.
- Case messaging and private case-file upload/access for case participants.
- Legal Library, AI document drafting, saved documents, notifications, and profile management.

## Local setup

1. Install the root dependencies and the dependencies in this directory (`npm install` in each location).
2. Create `mobile/.env` with:

   ```text
   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
   EXPO_PUBLIC_API_BASE_URL=https://justincase-production-9b25.up.railway.app
   ```

   The default API is `https://justincase-production-9b25.up.railway.app`. Use that URL to run without a local backend. For a local Android emulator, set the API URL to `http://10.0.2.2:8000`. A physical phone needs the computer's reachable LAN address and the same network.

   Expo embeds this URL when building the APK. Changing `.env` requires rebuilding and reinstalling the APK. Run Expo prebuild after changing a local HTTP address so Android's host-specific network policy is regenerated.
3. Run `npm start` from this directory to use the hosted backend. For local backend development, use `./dev.ps1 start` from the repository root and set the API URL to the computer's LAN address.

The backend also needs its own `backend/.env`; see [backend/README.md](../backend/README.md). Do not commit environment files or secrets.

## Android download

The landing page distributes the arm64 Android APK. Version **0.1.3** (Android version code **4**) adds user-answer filtering for AI Triage suggestions and prevents the assessment review action from silently returning to chat when the service omits the assessment.

Download: https://justice-link-alpha.vercel.app/downloads/laya-android-arm64.apk?v=0.1.3

Install it over the previous version to retain local app data. This release uses the same package and signing certificate as version 0.1.2. Physical-device workflow testing is still required.

## Android emulator helper

From the repository root, run `./dev.ps1 emulators` to start the configured Pixel emulators. Emulator interaction/system testing is a separate validation step; static checks do not confirm end-to-end account workflows.

## Useful commands

```powershell
npm start
npm run lint
npm test -- --runInBand
```
