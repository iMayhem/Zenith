# Firebase Security Rules Setup

## Issue
You're getting "Missing or insufficient permissions" errors because Firebase Security Rules are blocking access to Firestore and Storage.

## Solution
Update all three Firebase rule sets in the Firebase Console to allow public access.

---

## 1. Firestore Rules

**Location:** Firebase Console → Firestore Database → Rules tab

**Replace with:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Then click "Publish"**

---

## 2. Storage Rules

**Location:** Firebase Console → Storage → Rules tab

**Replace with:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

**Then click "Publish"**

---

## 3. Realtime Database Rules

**Location:** Firebase Console → Realtime Database → Rules tab

**Replace with:**
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Then click "Publish"**

---

## Verification Steps

After publishing all three rule sets:

1. **Clear browser cache** or open an incognito window
2. Go to `http://localhost:3000/resources`
3. Select an institute (e.g., ALLEN)
4. Select a subject (e.g., Physics)
5. Click on a module
6. The PDF should now load successfully

---

## Troubleshooting

If PDFs still don't load after updating rules:

1. **Check browser console** for any remaining permission errors
2. **Verify rules are published** - each rule set should show "Published" status
3. **Wait 1-2 minutes** - rule changes can take a moment to propagate
4. **Hard refresh** - Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

---

## Security Note

⚠️ **These rules allow public read/write access to your Firebase project.**

For production, you should implement proper authentication and authorization rules. Example:

```
// Firestore - authenticated users only
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /resources/{document=**} {
      allow read: if true;  // Public read
      allow write: if request.auth != null;  // Authenticated write
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}

// Storage - authenticated users only
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /resources/{allPaths=**} {
      allow read: if true;  // Public read
      allow write: if request.auth != null;  // Authenticated write
    }
  }
}
```
