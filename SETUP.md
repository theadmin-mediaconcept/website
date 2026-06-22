# Amplicue Web Store v3 — Firebase Setup Guide

Complete this guide before deploying the app.
All the code is ready. You only need to:
1. Create the Firebase project
2. Paste your config into `firebase-config.js`
3. Apply the rules and indexes below in the Firebase Console

---

## STEP 1 — Create your Firebase project

1. Go to https://console.firebase.google.com
2. Click **Add project** → enter name e.g. `amplicue-store`
3. Disable Google Analytics (optional) → **Create project**

---

## STEP 2 — Enable Authentication

1. In the Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** tab → enable:
   - **Google** (set project support email)
   - **Email/Password**
3. Click **Save**

---

## STEP 3 — Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Select your preferred region (e.g. `us-central1` or `europe-west1`)
4. Click **Enable**

---

## STEP 4 — Enable Storage

1. Firebase Console → **Storage** → **Get started**
2. Choose **Start in production mode** → pick same region → **Done**

---

## STEP 5 — Get your config and paste it

1. Firebase Console → **Project settings** (gear icon) → **General**
2. Scroll to **Your apps** → click **</>** (Web) → Register app
3. Copy the `firebaseConfig` object
4. Open `firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

5. Also update the admin emails array in `firebase-config.js`:

```js
export const ADMIN_EMAILS = [
  "your-admin@email.com"
];
```

---

## STEP 6 — Firestore Security Rules

In Firebase Console → **Firestore** → **Rules** tab,
replace everything with the rules below, then click **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helpers
    function isSignedIn() {
      return request.auth != null;
    }
    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    function notBanned() {
      return !get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('banned', false);
    }

    // Users collection
    match /users/{uid} {
      allow read: if isSignedIn();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) || isAdmin();
      allow delete: if isAdmin();
    }

    // Published websites (public read)
    match /websites/{id} {
      allow read: if true;
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Pending submissions (authenticated users can submit)
    match /pendingWebsites/{id} {
      allow read: if isAdmin() || (isSignedIn() && resource.data.ownerUid == request.auth.uid);
      allow create: if isSignedIn() && notBanned();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Owner profiles
    match /owners/{id} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && notBanned();
      allow update: if isAdmin() || (isSignedIn() && resource.data.uid == request.auth.uid);
      allow delete: if isAdmin();
    }

    // Reviews
    match /reviews/{id} {
      allow read: if true;
      allow create: if isSignedIn() && notBanned();
      allow update: if isAdmin() || (isSignedIn() && resource.data.uid == request.auth.uid);
      allow delete: if isAdmin();
    }

    // Reports
    match /reports/{id} {
      allow read: if isAdmin();
      allow create: if isSignedIn();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Badges audit log
    match /badges/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

---

## STEP 7 — Firestore Indexes

In Firebase Console → **Firestore** → **Indexes** tab → **Composite** → **Add index**

Create each of these composite indexes:

### Index 1 — Published websites by date
- Collection: `websites`
- Fields:
  - `status` — Ascending
  - `createdAt` — Descending
- Query scope: Collection

### Index 2 — Published websites by views
- Collection: `websites`
- Fields:
  - `status` — Ascending
  - `views` — Descending
- Query scope: Collection

### Index 3 — Published websites verified
- Collection: `websites`
- Fields:
  - `verified` — Ascending
  - `status` — Ascending
- Query scope: Collection

### Index 4 — Reviews by website, date
- Collection: `reviews`
- Fields:
  - `websiteId` — Ascending
  - `createdAt` — Descending
- Query scope: Collection

### Index 5 — Reviews by user
- Collection: `reviews`
- Fields:
  - `uid` — Ascending
  - `createdAt` — Descending
- Query scope: Collection

### Index 6 — Pending by owner
- Collection: `pendingWebsites`
- Fields:
  - `ownerUid` — Ascending
  - `createdAt` — Descending
- Query scope: Collection

### Index 7 — Published by owner
- Collection: `websites`
- Fields:
  - `ownerUid` — Ascending
  - `status` — Ascending
- Query scope: Collection

### Index 8 — Reports by status
- Collection: `reports`
- Fields:
  - `status` — Ascending
  - `createdAt` — Descending
- Query scope: Collection

---

## STEP 8 — Storage Security Rules

In Firebase Console → **Storage** → **Rules** tab,
replace everything with the rules below, then click **Publish**:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Logos — authenticated users can upload, public can read
    match /logos/{ownerId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }

    // Screenshots — same rules as logos
    match /screenshots/{ownerId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }

    // Avatars — only the owner can write their own avatar
    match /avatars/{uid}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == uid
        && request.resource.size < 3 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## STEP 9 — Set your first admin manually

After you sign in for the first time with your admin email:

1. Firebase Console → **Firestore** → **users** collection
2. Find your document (it uses your Firebase Auth UID as the document ID)
3. Edit the `role` field → set value to `"admin"`
4. Click **Update**

The app also auto-promotes any email listed in `ADMIN_EMAILS` in `firebase-config.js`.

---

## STEP 10 — Deploy

### Option A — Firebase Hosting (recommended)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Set public directory to: . (current folder)
# Configure as single-page app: No
# Overwrite index.html: No
firebase deploy --only hosting
```

### Option B — Vercel

```bash
npm install -g vercel
vercel
```

### Option C — Netlify drag-and-drop

1. Go to https://netlify.com → **Add new site** → **Deploy manually**
2. Drag the entire project folder into the upload box
3. Done — your site is live

---

## Firestore Collections Created Automatically

| Collection | Created by | Purpose |
|---|---|---|
| `users` | App on first sign-in | User profiles, roles, bookmarks |
| `owners` | Upload form (Step 1) | Brand/owner profiles |
| `pendingWebsites` | Upload form (Step 2) | Awaiting admin approval |
| `websites` | Admin approving a submission | Published, public listings |
| `reviews` | Website detail page | User reviews and ratings |
| `reports` | Website detail page | User reports |
| `badges` | Admin verification panel | Badge assignment audit log |

---

## File Summary

| File | Purpose |
|---|---|
| `index.html` | Homepage — browse, search, filter |
| `website.html` | Website detail — reviews, bookmark, share |
| `upload.html` | Submit a website — 2-step form with image upload |
| `profile.html` | User profile — submissions, saved, reviews, settings |
| `dashboard.html` | Owner dashboard — submission tracking |
| `admin.html` | Admin panel — approve, verify, moderate |
| `login.html` | Sign in — Google or email/password |
| `style.css` | Full design system |
| `app.js` | All functionality — auth, Firestore, UI |
| `firebase-config.js` | Firebase init — **edit this with your config** |
| `sw.js` | Service worker — PWA offline support |
| `manifest.json` | PWA manifest — install prompt |
| `logo.png` | App logo |

---

*Built by Amplicue Tech — https://amplicue.vercel.app*
