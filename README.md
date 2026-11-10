# AI Resume System

An Expo mobile app and Laravel API for resume review, skill verification, job
matching, mock interviews, and applicant updates. The API also includes a
browser-based HR/admin review workspace.

> **Beta / privacy:** This project handles resumes, contact information, written
> answers, and potentially voice recordings. Use test accounts and sample data
> for demonstrations. Do not send real applicant data or API credentials over
> an untrusted network. The local development setup uses HTTP; production
> deployments should use HTTPS and an appropriately secured database and file
> store.

## What the system does

### Applicant workflow

1. Register or sign in.
2. Upload one text-readable PDF resume (maximum 10 MB). A replacement overwrites
   the current resume and clears its previous analysis.
3. Wait for the queued AI resume review and answer the generated skill
   verification questions.
4. Score at least **75/100** to unlock job recommendations and applications.
5. Review jobs matched against verified skills. A match score represents the
   share of a listing's required skills that matched; it is not a hiring
   prediction.
6. Apply and complete a mock interview using typed or (where available) spoken
   answers.
7. Check the **Updates** tab for interview progress and the HR/admin decision.

Updates are shown inside the app; they are not operating-system push
notifications. The tab refreshes when opened and polls while active.

### HR/admin workflow

HR and admin accounts can review applicants, resumes, and completed interviews,
create job listings, and record pass/reject decisions with an optional note. The
final decision is made by the review team, not automatically by the AI.

## Project layout

```text
.
├── App.tsx                 Expo app entry and navigation
├── src/                    Applicant, HR/admin, and authentication screens
├── __tests__/              React Native UI tests
└── ai-resume-api/          Laravel API, migrations, jobs, and backend tests
```

## Requirements

- Node.js and npm
- PHP 8.3 or newer, Composer, and the PHP extensions required by Laravel and
  `smalot/pdfparser`
- A database supported by the API configuration (SQLite is suitable for local
  development)
- An AI-provider API key for AI-powered analysis, verification, interviews,
  and transcription
- Expo Go on an Android/iOS device for physical-device testing

## Local setup (Windows / PowerShell)

### 1. Install and configure the API

```powershell
cd C:\path\to\ai-resume-system\ai-resume-api
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Edit `ai-resume-api\.env` locally. Set the AI provider key and confirm the
database, queue, and application URL settings. Do not commit `.env`.

Then prepare the database:

```powershell
if (-not (Test-Path database\database.sqlite)) {
    New-Item -ItemType File -Path database\database.sqlite | Out-Null
}
php artisan migrate
```

If `database\database.sqlite` already exists, do not overwrite it. It is local
runtime data and is intentionally not tracked by Git.

To create local HR/admin accounts and sample listings, configure unique
`ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, `HR_SEED_EMAIL`, and
`HR_SEED_PASSWORD` values in the API `.env`, then run:

```powershell
php artisan db:seed
```

Never use shared, predictable, or default staff credentials.

### 2. Start the API and queue worker

Open two terminals in the API directory:

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

```powershell
php artisan queue:work --tries=3 -vvv
```

The queue worker is required for background resume analysis. Keep both
processes running during testing. The API health endpoint is:

```text
http://127.0.0.1:8000/up
```

The browser-based review workspace is available at
`http://127.0.0.1:8000/admin/login`.

### 3. Install and start the Expo app

In another terminal, from the repository root:

```powershell
npm ci
Copy-Item .env.example .env
```

Edit the Expo `.env` and set `EXPO_PUBLIC_API_URL` to the API machine's address:

```text
EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:8000/api
```

For a physical phone, use the PC's current Wi-Fi/hotspot LAN IP. Do not use
`localhost` or `127.0.0.1` in the phone's API URL; those addresses refer to the
phone itself. Ensure the phone and PC are on a network that permits device-to-PC
connections. After changing `.env`, restart Expo:

```powershell
npx expo start --lan
```

If Metro appears to use stale settings:

```powershell
npx expo start --lan --clear
```

Scan the QR code with Expo Go. If LAN mode cannot connect, try:

```powershell
npx expo start --tunnel
```

The tunnel is for reaching the Expo development server; the phone still needs a
working route to the API. For a phone network check, open
`http://<PC-LAN-IP>:8000/up` in the phone browser.

## Tests and checks

From the repository root:

```powershell
npm run typecheck
npm test
```

From `ai-resume-api`:

```powershell
php artisan test
```

## Important behavior and limits

- Applicants have one current resume. Use **Replace current resume** to submit
  another version.
- Resume uploads must be readable PDFs and pass basic resume-content checks;
  scanned/image-only PDFs may be rejected.
- Recommendations and applications require a completed skill verification
  score of at least 75 and at least one exact verified-skill match (case and
  surrounding spaces are ignored).
- AI output can be slow, rate-limited, incomplete, or unavailable. It is
  advisory and should not be treated as a hiring guarantee.
- Voice recording depends on device microphone permission and supported audio
  formats. Typing answers is an alternative.
- Interview results are only visible after the HR/admin reviewer records a
  decision.
- Changing networks may change the PC's LAN IP. Update the Expo
  `EXPO_PUBLIC_API_URL` and restart Metro when this happens.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| App shows **Network Error** or times out | Confirm Laravel is running; check the current PC IP in Expo `.env`; verify the phone can open `/up`; check Windows Firewall, VPN, and hotspot/client isolation. |
| Login says **Invalid credentials** | Check the account email and password. For staff accounts, use the configured local seed credentials. |
| API returns **401** | The session token is missing or expired. Sign in again. |
| API returns **403** | The account lacks permission or a prerequisite (for example, passing skill verification) is not met. |
| API returns **409** for resume upload | A resume already exists. Replace the current resume instead of uploading a second one. |
| API returns **422** | Input did not pass validation or the workflow step is out of order. Read the response message for the specific reason. |
| Resume remains **queued/processing** | Check that `php artisan queue:work` is running and that the database/queue configuration is correct. |
| **Analysis incomplete** or `analysis_failed` | Review API logs and AI-provider configuration, then retry analysis from the app if offered. |
| AI returns **429** / busy | The provider is rate-limiting requests. Wait before retrying; avoid repeated rapid submissions. |
| AI response fails or returns **502** | Check the AI key, provider availability/limits, configured model, and API logs. This differs from a phone-to-API network error. |
| Voice feature fails | Check microphone permission, record again, or type the response. |
| Updates do not appear | Open or refresh the Updates tab. The feed is in-app and is not a push-notification service. |

For backend diagnostics, from `ai-resume-api`:

```powershell
Get-Content storage\logs\laravel.log -Tail 100
php artisan queue:failed
```

Do not post logs publicly without removing tokens, personal information, resume
content, and provider responses.

## Configuration and data safety

- `.env` files, local databases, uploaded resumes, interview recordings, and
  dependency directories are excluded from the repository.
- `.env.example` files are templates only. Copy them locally and provide
  private values in your own environment.
- Back up the database and private file storage before maintenance.
- Do not use public HTTP or share the development server for real applicant
  data. A public beta needs HTTPS, access controls, secure storage, and a review
  of privacy, retention, and consent requirements.
