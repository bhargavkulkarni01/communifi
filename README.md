# Communfi (Township)

React Native shell (Google sign-in + WebView) → web UI (report form, map, chart, grid, likes) → FastAPI backend → S3 for photos, SQLite for data.

The ID token from native Google sign-in is injected into the WebView, which exchanges it for an API token at `/auth/google`. (Google blocks OAuth inside WebViews, hence native sign-in.)

## 1. One-time setup

**Google Cloud Console** (one project):
1. APIs & Services → enable **Maps JavaScript API**; create an API key (`GOOGLE_MAPS_KEY`).
2. OAuth consent screen → External → add yourself as test user.
3. Credentials → create three OAuth client IDs: **Web**, **Android** (package name + SHA-1 from `cd android && ./gradlew signingReport`), **iOS** (bundle ID).
4. Use the **Web** client ID as `WEB_CLIENT_ID` in `App.js` and `GOOGLE_CLIENT_IDS` in the backend.

**AWS S3**: create a private bucket (e.g. `township-photos-<you>`), then Permissions → CORS:
```json
[{"AllowedMethods":["PUT","GET"],"AllowedOrigins":["*"],"AllowedHeaders":["*"]}]
```
Tighten `AllowedOrigins` to your domain in production. Locally, create an IAM user with `s3:PutObject`/`s3:GetObject` on that bucket and use its keys in `.env`.

## 2. Build the web UI, then run the backend locally
```bash
cd web && npm install && npm run build && cd ..   # re-run after any change in web/src
```
(`npm run dev` serves the UI with hot reload and proxies the API to :8000, but sign-in only exists inside the app, so test through the WebView with the built output.)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in values
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API docs: http://localhost:8000/docs

## 3. Run the mobile app
Prereqs: Node 18+, JDK 17, Android Studio (emulator), Xcode + CocoaPods (macOS, for iOS).
```bash
npx @react-native-community/cli init TownshipApp
cd TownshipApp
npm i react-native-webview @react-native-google-signin/google-signin
cp ../township/mobile/App.js ./App.js     # adjust path; edit WEB_CLIENT_ID
```
**Android**: add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
```
Start an emulator that has **Google Play** (Pixel image), then `npx react-native run-android`. The app reaches your backend at `10.0.2.2:8000`.

**iOS**: add to `ios/TownshipApp/Info.plist`:
```xml
<key>NSCameraUsageDescription</key><string>Attach a photo to your report</string>
<key>NSPhotoLibraryUsageDescription</key><string>Attach a photo to your report</string>
<key>NSLocationWhenInUseUsageDescription</key><string>Pin the issue location</string>
<key>CFBundleURLTypes</key><array><dict><key>CFBundleURLSchemes</key>
<array><string>com.googleusercontent.apps.YOUR_IOS_CLIENT_ID_REVERSED</string></array></dict></array>
```
Then `cd ios && pod install && cd .. && npx react-native run-ios`. In the simulator use Features → Location to set a position. The simulator has no camera; the photo picker opens the library instead.

## 4. Deploy to AWS free tier
Check current [AWS Free Tier](https://aws.amazon.com/free/) terms; limits and durations change.

1. **S3**: the bucket from step 1.
2. **IAM role** for EC2 with `s3:PutObject`/`s3:GetObject` on the bucket (no keys on the server).
3. **EC2**: launch a free-tier-eligible instance (t2/t3.micro, Ubuntu 22.04), attach the role, open ports 22, 80, 443.
4. **Domain + HTTPS** (required for geolocation, camera and Maps in release builds): point a domain (or free DuckDNS name) at the instance's Elastic IP.
5. On the instance:
```bash
sudo apt update && sudo apt install -y python3-venv git caddy
git clone <your-repo> township && cd township/web && npm install && npm run build && cd ../backend  # needs Node 18+ (or build locally and upload web/dist)
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
cp .env.example .env && nano .env      # omit AWS keys; the role supplies them
```
6. Run as a service, `/etc/systemd/system/township.service`:
```ini
[Service]
WorkingDirectory=/home/ubuntu/township/backend
ExecStart=/home/ubuntu/township/backend/.venv/bin/uvicorn main:app --port 8000
Restart=always
User=ubuntu
[Install]
WantedBy=multi-user.target
```
`sudo systemctl enable --now township`
7. HTTPS reverse proxy, `/etc/caddy/Caddyfile`:
```
your.domain.com { reverse_proxy localhost:8000 }
```
`sudo systemctl reload caddy`
8. Set `BASE` in `App.js` to `https://your.domain.com`, restrict your Maps key to that domain, and build:
   - Android: `cd android && ./gradlew bundleRelease` → upload the AAB to Play Console (one-time $25) or sideload an APK with `assembleRelease`.
   - iOS: archive in Xcode → TestFlight (Apple Developer Program, $99/yr).

SQLite lives on the instance disk; back up `township.db` or move to RDS (free-tier Postgres) if you need more.

## Notes
- Sign-in only works through the app; opening `/app/` in a browser shows a prompt.
- Photos stay private in S3 and are shown via 1-hour presigned URLs.

## Communfi update notes
- Screens: Home (stats, recent issues, nearby map, chart), 4-step Report wizard, My Reports with status filters, Map, Issue detail with updates timeline, Notifications, Settings.
- Statuses are Open / In Progress / Resolved. Set `ADMIN_EMAILS` in `.env` so those Google accounts get a status picker on issue pages; each change adds a timeline update and a notification for the reporter.
- Enable the **Geocoding API** on your Google Maps key (used to turn the pin into a street address).
- Schema changed: delete any old `backend/township.db` before the first run.

## Communfi intelligence (v3)
- **Smart Report + AI understanding:** the photo and description go to Claude (`ANTHROPIC_API_KEY`, model via `ANTHROPIC_MODEL`), which returns title, category, severity, urgency, risks. The department comes from a category map. Without a key, a keyword fallback is used.
- **Location intelligence:** the pin is geocoded into road + neighbourhood and a ~100 m grid cell.
- **Duplicates:** open issues of the same category within 75 m, ranked by distance and text similarity.
- **Confirmations:** "I see this too" / "It's fixed" (3 fixed votes adds a staff-verification update).
- **Civic memory:** reports within 100 m, shown on every issue.
- **Score, early warning, predictions:** transparent rule-based formulas in `backend/main.py` (not trained ML); they sharpen as data accumulates.
- **Municipal dashboard (`/admin`) and CSV export:** `ADMIN_EMAILS` only. It also works in a desktop browser via Google web sign-in: add `http://localhost:8000` and your domain under **Authorized JavaScript origins** on the Web OAuth client.
- Run `pip install -r requirements.txt` again; existing databases are migrated automatically.

## Web platform
- Open `https://your.domain.com/` (or `http://localhost:8000/` locally). The backend redirects to the web app, which signs in with a Google button. The session is kept in the browser for 7 days.
- On the web, reporting uses **Upload photo** (or drag and drop) instead of the camera. Everything else (map search, AI review, duplicates, dashboard) is the same as in the app.
- In Google Cloud, on the **Web** OAuth client add **Authorized JavaScript origins**: `https://your.domain.com`, plus for local testing both `http://localhost` and `http://localhost:8000` (use `localhost`, not `127.0.0.1`, which Google rejects).
- Restrict the Maps key to your domain under Application restrictions, HTTP referrers.

## AI forecasts and watch alerts
- Residents save their ZIP in **Settings**; Home then shows a short **Watch alert** for that ZIP (2 to 4 things that may go wrong soon, with a tip).
- Admins get a detailed **AI forecast** on the dashboard (filter by ZIP or all areas): predicted issue, likelihood, window, likely causes, evidence, recommended actions, department and effort.
- The report's ZIP comes from the map pin (older reports are filled in from their address). Forecasts are cached per ZIP (at least 10 minutes, up to 6 hours unless new reports arrive), so cost stays low.
- Only aggregated report data (categories, roads, counts, short titles) is sent to the AI, never names or emails. Without `ANTHROPIC_API_KEY` a rule-based version is shown instead.
- Forecasts are decision support from limited data, not guarantees.
