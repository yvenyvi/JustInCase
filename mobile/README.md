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
   EXPO_PUBLIC_API_BASE_URL=http://<computer-lan-ip>:8000
   ```

   For Android emulators, `http://10.0.2.2:8000` reaches the host machine if no explicit API URL is set. A physical phone needs the computer's reachable LAN address.
3. Start the backend and Expo using `./dev.ps1 start` from the repository root, or run `npm start` from this directory.

The backend also needs its own `backend/.env`; see [backend/README.md](../backend/README.md). Do not commit environment files or secrets.

## Android emulator helper

From the repository root, run `./dev.ps1 emulators` to start the configured Pixel emulators. Emulator interaction/system testing is a separate validation step; static checks do not confirm end-to-end account workflows.

## Useful commands

```powershell
npm start
npm run lint
npm test -- --runInBand
```
