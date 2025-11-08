# Google Cloud Storage CORS Configuration Guide

## 🚨 The Problem

You're getting this error:
```
Access to video at 'https://storage.googleapis.com/vid-gen-static/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Why This Happens

The segmentation feature requires `crossOrigin="anonymous"` on the video element to extract frames to Canvas. However, Google Cloud Storage doesn't allow cross-origin requests by default.

## ✅ Solutions

### Solution 1: Quick Fix (Videos work, segmentation disabled)

**Status**: ✅ Already applied

I've temporarily removed `crossOrigin="anonymous"` from the video element. This means:
- ✅ Videos will load and play normally
- ❌ Segmentation won't work (canvas tainted error)

Use this while you're testing video generation. Segmentation will show an error when you try to use it.

---

### Solution 2: Configure GCS CORS (Everything works)

**This is the permanent fix for production.**

#### Step 1: Make the script executable

```bash
cd /Users/luileng/Downloads/video/remotion-draft/backend
chmod +x configure-gcs-cors.sh
```

#### Step 2: Run the configuration script

```bash
./configure-gcs-cors.sh
```

This will:
1. Check if `gcloud` CLI is installed
2. Check if you're authenticated
3. Apply CORS configuration to your bucket

#### Step 3: Re-enable segmentation

After CORS is configured, restore the `crossOrigin` attribute in `App.tsx`:

```tsx
<video
  crossOrigin="anonymous"  // ← Add this back
  src={currentSegment.videoUrl}
  ...
/>
```

---

### Manual CORS Configuration (If script doesn't work)

#### Using gcloud CLI:

1. **Install gcloud CLI** (if not installed):
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from:
   # https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate**:
   ```bash
   gcloud auth login
   ```

3. **Apply CORS config**:
   ```bash
   cd backend
   gsutil cors set gcs-cors-config.json gs://vid-gen-static
   ```

4. **Verify**:
   ```bash
   gsutil cors get gs://vid-gen-static
   ```

#### Using Google Cloud Console (Web UI):

1. Go to: https://console.cloud.google.com/storage
2. Find your bucket: `vid-gen-static`
3. Click on the bucket name
4. Go to the **"Permissions"** tab
5. Click **"Edit CORS configuration"**
6. Paste this JSON:
   ```json
   [
     {
       "origin": ["http://localhost:3000", "http://localhost:5173", "https://*"],
       "method": ["GET", "HEAD"],
       "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
7. Click **Save**

---

## 🧪 Testing

### Test Video Loading (Current State)

```bash
cd frontend
npm run dev
```

- ✅ Videos should load and play
- ❌ Segmentation will fail with "tainted canvas" error

### Test After CORS Configuration

1. Configure CORS (see above)
2. Add back `crossOrigin="anonymous"` to video element
3. Restart frontend
4. Test:
   - ✅ Videos load and play
   - ✅ Enable segmentation mode
   - ✅ Click on video
   - ✅ Object gets segmented!

---

## 📋 CORS Configuration Explained

```json
{
  "origin": [
    "http://localhost:3000",  // React dev server
    "http://localhost:5173",  // Vite dev server
    "https://*"               // All production HTTPS sites
  ],
  "method": ["GET", "HEAD"],  // Allow reading videos
  "responseHeader": [
    "Content-Type",
    "Access-Control-Allow-Origin"  // Required for CORS
  ],
  "maxAgeSeconds": 3600  // Cache CORS preflight for 1 hour
}
```

### For Production

Update the `origin` array to include your production domain:

```json
{
  "origin": [
    "https://yourdomain.com",
    "https://www.yourdomain.com"
  ],
  ...
}
```

---

## 🔍 Troubleshooting

### "gsutil: command not found"

Install Google Cloud SDK:
```bash
brew install google-cloud-sdk
```

Or download from: https://cloud.google.com/sdk/docs/install

### "AccessDeniedException: 403"

You don't have permission to modify the bucket. Either:

1. Ask the bucket owner to run the script
2. Get `storage.buckets.update` permission
3. Use a service account with proper permissions

### Videos still don't load after CORS config

1. **Clear browser cache** (hard refresh: Cmd+Shift+R)
2. **Wait 1-2 minutes** for CORS config to propagate
3. **Check CORS was applied**:
   ```bash
   gsutil cors get gs://vid-gen-static
   ```
4. **Check browser console** for other errors

### Segmentation still fails after CORS config

1. Make sure you added back `crossOrigin="anonymous"` to video element
2. Restart the frontend dev server
3. Hard refresh the browser (Cmd+Shift+R)
4. Check browser console for "tainted canvas" errors

---

## 🎯 Current Status

✅ **Quick fix applied**: Videos load (segmentation disabled)

To enable segmentation:
1. Run `./configure-gcs-cors.sh`
2. Add back `crossOrigin="anonymous"` to video element
3. Restart frontend

---

## 📚 Resources

- [GCS CORS Configuration](https://cloud.google.com/storage/docs/configuring-cors)
- [HTML5 Video CORS](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image)
- [Canvas Tainting](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image#security_and_tainted_canvases)

---

**Need help?** Check the error messages in browser console (F12) for more details.

