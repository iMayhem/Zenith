# PDF Viewer Troubleshooting Guide

## Current Status

Based on the logs:
- ✅ Firestore composite index created
- ✅ Modules loading successfully
- ✅ PDF.js loading the PDF file
- ❌ Firebase permission errors blocking access
- ❌ PDF not displaying in the viewer

---

## Root Cause

**Firebase Security Rules are blocking access to Firestore and Storage.**

Even though the PDF is being fetched by PDF.js, the iframe cannot load it due to permission errors.

---

## Fix Steps

### Step 1: Update Firebase Security Rules

Follow the instructions in `FIREBASE_RULES_SETUP.md` to update all three rule sets:
1. Firestore Rules
2. Storage Rules  
3. Realtime Database Rules

**This is the most critical step.**

### Step 2: Clear Browser Cache

After publishing the rules:
1. Open Chrome DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

OR open an incognito window: `Ctrl+Shift+N` (Windows/Linux) or `Cmd+Shift+N` (Mac)

### Step 3: Test the Flow

1. Go to `http://localhost:3000/resources`
2. Open browser console (F12 → Console tab)
3. Select institute: ALLEN
4. Select subject: Physics
5. Click on a module

**Expected console output:**
```
✅ Subjects loaded: ["Physics", "Chemistry", ...]
✅ Modules loaded: [{id: "...", displayName: "...", ...}]
📄 PdfViewer: Loading PDF: ALLEN PHYSICS JEE Module
📄 PdfViewer: PDF URL: https://firebasestorage.googleapis.com/...
✅ PdfViewer: PDF loaded successfully
```

**If you see errors:**
- `Missing or insufficient permissions` → Rules not published yet
- `Failed to load modules` → Firestore index or rules issue
- `storage/unauthorized` → Storage rules not published
- `Timeout reached` → Network issue or CORS problem

---

## Additional Debugging

### Check Firebase Console

1. **Firestore Database**
   - Go to Data tab
   - Verify `resources` collection exists
   - Check that documents have: `institute`, `subject`, `displayName`, `pdfUrl`, `sortOrder`

2. **Storage**
   - Go to Files tab
   - Navigate to `resources/ALLEN/Physics/`
   - Verify PDF files exist
   - Click on a file → Copy download URL
   - Paste URL in browser - should download the PDF

3. **Rules Status**
   - Each rules tab should show "Published" with a timestamp
   - If it says "Not published", click "Publish"

### Check Network Tab

1. Open DevTools → Network tab
2. Click on a module
3. Look for the PDF request
4. Check the status code:
   - `200 OK` → PDF loaded successfully
   - `403 Forbidden` → Permission denied (rules issue)
   - `404 Not Found` → File doesn't exist
   - `CORS error` → CORS configuration issue

### Test Direct PDF Access

1. Get a PDF URL from Firestore:
   ```
   Firebase Console → Firestore → resources collection → any document → pdfUrl field
   ```

2. Open that URL in a new browser tab
   - Should download/display the PDF
   - If you get "Access Denied", rules are not published

---

## Known Issues

### Issue 1: PDF loads but doesn't display

**Symptoms:** Console shows "PDF loaded successfully" but screen is blank

**Cause:** CSS height/width issue or iframe rendering problem

**Fix:** Already applied - PdfViewer has explicit height/width styling

### Issue 2: CORS errors

**Symptoms:** Console shows CORS policy errors

**Cause:** Firebase Storage CORS not configured

**Fix:** Run this command (requires `gsutil` CLI):
```bash
gsutil cors set cors.json gs://liorea-life.firebasestorage.app
```

Or update CORS via Firebase Console → Storage → CORS settings

### Issue 3: Presence sync failed

**Symptoms:** Console shows "Presence sync failed: Missing or insufficient permissions"

**Cause:** Realtime Database rules blocking access

**Fix:** Update Realtime Database rules (see FIREBASE_RULES_SETUP.md)

---

## Testing Checklist

- [ ] All three Firebase rule sets published
- [ ] Browser cache cleared
- [ ] Can select institute and see subjects
- [ ] Can select subject and see modules
- [ ] Can click module and see PDF viewer
- [ ] PDF displays correctly in viewer
- [ ] Can close PDF and return to module list
- [ ] No permission errors in console

---

## If Still Not Working

1. **Share console logs:**
   - Open DevTools → Console
   - Click on a module
   - Copy all console output
   - Share with developer

2. **Share network logs:**
   - Open DevTools → Network tab
   - Filter by "Doc" or "XHR"
   - Click on a module
   - Screenshot any failed requests

3. **Verify Firebase project:**
   - Confirm project ID: `liorea-life`
   - Confirm storage bucket: `liorea-life.firebasestorage.app`
   - Confirm you're logged into the correct Firebase account

---

## Quick Test Command

Run this in browser console to test Firestore access:

```javascript
import { firestore } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

getDocs(collection(firestore, 'resources'))
  .then(snap => console.log('✅ Firestore access OK:', snap.size, 'documents'))
  .catch(err => console.error('❌ Firestore access failed:', err));
```

If this fails, rules are not published correctly.
