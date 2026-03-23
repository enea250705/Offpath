# Offpath — Deploy Guide

## Step 1 — Push to GitHub

1. Go to github.com → New repository → name it `offpath` → Create
2. Open Terminal / Command Prompt in C:\Users\eneam\Downloads\Offpath and run:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/enea250705/Offpath.git
git push -u origin main
```

---

## Step 2 — Deploy on Render

1. Go to render.com → Sign up / Log in
2. New → Blueprint
3. Connect your GitHub account → select the `offpath` repo
4. Render reads `backend/render.yaml` and creates:
   - A PostgreSQL database (offpath-db)
   - A Node.js web service (offpath-api)
5. Click **Apply**

---

## Step 3 — Set secret env vars in Render

Render dashboard → offpath-api → Environment → Add the following:

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | your key from console.groq.com |
| `APPLE_PRIVATE_KEY` | paste the full contents of AuthKey_7K24452538.p8 (including the BEGIN/END lines) |

`GOOGLE_CLIENT_ID` is already set automatically from render.yaml.

Everything else (JWT_SECRET, DATABASE_URL, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID) is already set automatically.

Save → the service redeploys automatically.

---

## Step 4 — Get your API URL

Render dashboard → offpath-api → top of the page shows:
```
https://offpath-api.onrender.com
```
(your actual subdomain may differ slightly)

Test it works:
```
https://offpath-api.onrender.com/health
```
Should return: `{"status":"ok"}`

---

## Step 5 — Wire the URL into the iOS app

Open `ios/Offpath/Config.swift` and fill in:

```swift
static let authBaseURL = "https://offpath-api.onrender.com"
static let apiBaseURL  = "https://offpath-api.onrender.com"
```

---

## Step 6 — Two manual steps in Xcode (Google Sign-In)

**Add the GoogleSignIn Swift Package:**
- Open `ios/Offpath.xcodeproj` in Xcode
- File → Add Package Dependencies
- Paste URL: `https://github.com/google/GoogleSignIn-iOS`
- Click Add Package → select `GoogleSignIn` → Add to Target: Offpath

**Add the Google URL scheme:**
- Click Offpath project in left sidebar → select Offpath target → Info tab
- Scroll to URL Types → click +
- URL Schemes: `com.googleusercontent.apps.650828421062-engpkpdrm7lj2umolnfc9eugdbgq7mrb`

---

## Step 7 — Set your Team ID in Xcode

1. Open `ios/Offpath.xcodeproj` in Xcode
2. Click the project in the left sidebar → Signing & Capabilities
3. Team → select your Apple Developer account (3V28XJ2KVM)
4. Xcode handles certificates automatically

---

## Step 7 — App Store submission checklist

- [ ] Config.swift URLs filled in
- [ ] Xcode Team ID set
- [ ] App Store Connect: create 3 IAP products:
  - `com.offpath.app.trippass` — $2.99 — Non-Consumable
  - `com.offpath.app.trippack3` — $6.99 — Non-Consumable
  - `com.offpath.app.yearly` — $19.99 — Auto-Renewable Subscription
- [ ] Privacy policy URL (add to App Store Connect listing)
- [ ] Screenshots (6.5" iPhone, 5.5" iPhone minimum)
- [ ] Archive → Distribute in Xcode

---

## Free tier limits (Render)

- Web service: spins down after 15 min of inactivity, first request takes ~30s to wake
- PostgreSQL: 1GB storage, 97 connection limit
- Upgrade to Render's $7/mo plan to keep the service always on
