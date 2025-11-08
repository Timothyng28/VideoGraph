# Video Segmentation Feature Guide

## 🎯 How to Use

### 1. Enable Segmentation Mode
Click the **"Enable Segmentation"** button in the top-right corner of the video player.
- Button turns **blue** when active
- Shows: "🎯 Segmentation ON"
- Video gets a blue border
- Message appears: "Click anywhere on the video to segment"

### 2. Click to Segment
With segmentation mode ON:
- **Click anywhere on the video** to segment objects
- Works while video is playing or paused
- Video controls (play/pause) still work normally

### 3. View Results
After clicking:
- "Analyzing object..." appears (~200-500ms)
- Object gets highlighted with:
  - Colored outline (confidence-based)
  - Semi-transparent fill
  - Label with confidence score
- Info panel shows detection details

### 4. Clear & Repeat
- Click **"Clear Segmentation"** to remove overlay
- Click elsewhere on video to segment different objects
- Toggle button OFF to disable segmentation mode

## 🎨 Visual Indicators

### Segmentation Mode OFF
```
┌─────────────────────────────┐
│  👆 Enable Segmentation     │ ← Gray button
└─────────────────────────────┘
      ┌────────────┐
      │   VIDEO    │ ← Normal view
      └────────────┘
```

### Segmentation Mode ON
```
┌─────────────────────────────┐
│  🎯 Segmentation ON         │ ← Blue button (glowing)
└─────────────────────────────┘
      ┌────────────┐
      │   VIDEO    │ ← Blue border
      │            │
      │ Click to   │ ← Instructioncalls
      │  segment   │
      └────────────┘
```

### After Segmentation
```
┌─────────────────────────────┐
│  🎯 Segmentation ON         │
└─────────────────────────────┘
      ┌────────────┐
      │  ╔══════╗  │ ← Segmented object
      │  ║ OBJ  ║  │   with colored outline
      │  ╚══════╝  │
      └────────────┘
       [Clear Segmentation] ← Top-right
       [Object count: 95%]  ← Bottom-left
```

## ⚙️ How It Works

1. **Toggle Button** → Enables/disables segmentation mode
2. **Click Detection** → Only processes clicks when mode is ON
3. **Frame Extraction** → Captures current video frame
4. **AI Processing** → Sends to SAM model on Modal
5. **Overlay Display** → Shows segmentation mask on video

## 🔑 Key Features

✅ **Non-intrusive**: Video controls work normally
✅ **Toggle on/off**: Easy to enable/disable
✅ **Visual feedback**: Clear indicators of mode status
✅ **Fast**: ~200-500ms response time
✅ **Auto-clear**: Resets when changing videos

## 💡 Tips

- **Pause video** for more precise segmentation
- **Click object centers** for best results
- **Try different objects** in the same frame
- **Toggle OFF** when not needed (saves API calls)

## 🚫 Troubleshooting

### Button doesn't appear
- Make sure you're on the video player screen
- Frontend should be running (`npm run dev`)

### "Analyzing..." never finishes
- Check browser console (F12) for errors
- Verify Modal API is deployed and running
- Check `.env` file has correct API URL

### Segmentation not working
- Make sure segmentation mode is **ON** (blue button)
- Click on the **video area**, not controls
- Check that video has `crossOrigin="anonymous"`

### Video not clickable
- Segmentation mode must be ON
- If button is gray, click it first
- Video controls may capture some clicks (this is normal)

## 🎮 Keyboard Shortcut (Future Enhancement)

Could add:
- Press `S` to toggle segmentation mode
- Press `Escape` to clear segmentation
- Press `C` to clear and disable mode

## 📊 Performance

- **Toggle**: Instant
- **Segmentation**: ~200-500ms
- **First call**: ~1-2s (cold start)
- **Subsequent calls**: Fast (model stays warm)

## 🔧 Configuration

API URL is in `frontend/.env`:
```env
VITE_SEGMENTATION_API_URL=https://YOUR_USERNAME--segmentation-api-segment-click.modal.run
```

## 🎯 Use Cases

1. **Identify objects** in educational videos
2. **Highlight elements** for emphasis
3. **Interactive learning** - click to learn more
4. **Accessibility** - segment for screen readers
5. **Analysis** - understand video content

---

**Enjoy your interactive video segmentation!** 🚀

