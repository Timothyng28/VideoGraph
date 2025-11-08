# Visual Guide: Tree Visualization with Thumbnails and Titles

## Tree Explorer (Full-Screen View)

### Node Display Examples

#### Node with Thumbnail
```
┌─────────────────────────────┐
│  ┌──┐                       │ ← 128px x 80px thumbnail
│  │ 1│  [Neural Network Img] │ ← Number badge (6x6 circle)
│  └──┘                       │ ← Colored border (blue if current)
└─────────────────────────────┘
     Understanding Neural      ← Title in rounded label
          Networks             ← (max-width: 140px)
```

#### Node without Thumbnail (Fallback)
```
    ┌────┐
    │    │  ← 40px circle
    │ 1  │  ← Node number
    │    │  ← Branch color
    └────┘
 Understanding    ← Title below
Neural Networks
```

### Complete Tree Example

```
                    ┌───────────────┐
                    │ ┌─┐           │
                    │ │1│ [Thumb]   │  Root: "Introduction to AI"
                    │ └─┘           │
                    └───────────────┘
                    Introduction to AI
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────────────┐       ┌───────────────┐
        │ ┌─┐           │       │ ┌─┐           │
        │ │2│ [Thumb]   │       │ │3│ [Thumb]   │
        │ └─┘           │       │ └─┘           │
        └───────────────┘       └───────────────┘
     Machine Learning Basics   Deep Learning Intro
                │
        ┌───────┴───────┐
        │               │
┌───────────────┐ ┌───────────────┐
│ ┌─┐           │ │ ┌─┐           │
│ │4│ [Thumb]   │ │ │5│ [Thumb]   │
│ └─┘           │ │ └─┘           │
└───────────────┘ └───────────────┘
Neural Networks     Decision Trees
```

### Hover Tooltip

```
┌────────────────────────────────────┐
│ 1.2.1                              │ ← Node number (blue)
│ Understanding Neural Networks      │ ← Title (white, bold)
│ Neural networks intro              │ ← Topic (gray, if different)
│                                    │
│ In this section, we'll explore     │ ← Voiceover preview
│ the fundamental concepts of...     │ ← (first 150 chars)
└────────────────────────────────────┘
```

## Tree Visualizer (Mini Sidebar View)

### Compact Node Display

```
History
─────────
    
    ●  ← Node 1 (with tiny thumbnail inside circle)
    │
    ●  ← Node 2
    │
    ◎  ← Node 3 (current - highlighted with blue glow)
    │
    ●  ← Node 4
    │
    ●  ← Node 5

Click to expand
```

### Mini View Tooltip (on hover)

```
┌─────────────────────┐
│ 1.2                 │
│ Neural Networks     │ ← Title (truncated if long)
└─────────────────────┘
```

## Color Scheme

### Branch Colors (rotating palette)
- Branch 0: #3b82f6 (Blue)
- Branch 1: #f59e0b (Amber)
- Branch 2: #ec4899 (Pink)
- Branch 3: #8b5cf6 (Purple)
- Branch 4: #10b981 (Green)
- Branch 5: #ef4444 (Red)

### Node States
- **Current Node**: Blue glow + #60a5fa border
- **On Current Path**: Full opacity (1.0)
- **Other Nodes**: Slight transparency (0.7)

### Thumbnails
- **Border**: 2px solid (branch color)
- **Shadow**: Subtle drop shadow
- **Current Node Border**: Brighter blue (#60a5fa)
- **Badge Background**: Branch color

## Responsive Behavior

### Desktop (Full Tree Explorer)
```
┌──────────────────────────────────────────────┐
│  Learning Path Explorer         [Close (ESC)] │
├──────────────────────────────────────────────┤
│                                              │
│     [Tree with thumbnails spread out]        │
│                                              │
│  ┌─────┐    ┌─────┐    ┌─────┐              │
│  │  1  │────│  2  │────│  3  │              │
│  │[Img]│    │[Img]│    │[Img]│              │
│  └─────┘    └─────┘    └─────┘              │
│   Title      Title      Title                │
│                                              │
├──────────────────────────────────────────────┤
│ Legend:                                      │
│ ● Current  ● Visited  ○ Leaf                 │
└──────────────────────────────────────────────┘
```

### Mini View (Sidebar)
```
┌──────┐
│Hist. │
├──────┤
│      │
│  ●   │ ← Small circles
│  │   │   (10-12px)
│  ◎   │ ← Current
│  │   │
│  ●   │
│      │
│Click │
│ to   │
│expand│
└──────┘
120px wide
```

## Interaction States

### Normal State
```
┌─────────────────┐
│ ┌─┐             │
│ │1│  [Image]    │  Normal opacity
│ └─┘             │  Branch color
└─────────────────┘
    Section Title
```

### Hover State
```
┌─────────────────┐
│ ┌─┐             │  
│ │1│  [Image]    │  ← Slightly brighter
│ └─┘             │  + Tooltip appears
└─────────────────┘
    Section Title
        ↑
  [Tooltip showing full info]
```

### Current/Active State
```
┌═════════════════┐  
║ ┌─┐             ║  ← Blue glow border
║ │1│  [Image]    ║  ← Highlighted
║ └─┘             ║  ← Pulsing effect
└═════════════════┘
    Section Title
```

### Loading State (if thumbnail not loaded yet)
```
┌─────────────────┐
│ ┌─┐             │
│ │1│  [Loading]  │  ← Gray placeholder
│ └─┘             │  ← Skeleton animation
└─────────────────┘
    Section Title
```

### Error State (thumbnail failed)
```
    ┌────┐
    │    │  ← Falls back to circle
    │ 1  │  ← No thumbnail shown
    │    │  ← Still functional
    └────┘
Section Title
```

## Animation Transitions

### Node Appearance
```
Frame 1:  ●        (small circle fades in)
Frame 2:  ○●       (grows)
Frame 3:  [●]      (thumbnail loads)
Frame 4:  [Image]  (fully displayed)
```

### Navigation
```
Step 1: Click node 3
        ┌─────────┐
        │   [3]   │ ← Clicked
        └─────────┘

Step 2: Highlight transitions
        ┌─────────┐
        │   [2]   │ ← Previous (fades)
        └─────────┘
        ┌═════════┐
        ║   [3]   ║ ← New current (glows)
        └═════════┘

Step 3: Tree adjusts
        (Smooth pan/zoom to center new node)
```

## Spacing and Layout

### Full Tree Explorer
- **Node Width**: 128px (with thumbnail) or 40px (circle)
- **Node Height**: 80px (with thumbnail) or 40px (circle)
- **Title Height**: ~24px (text + padding)
- **Total Node Height**: ~110px (thumbnail + title)
- **Horizontal Spacing**: 400px between siblings
- **Vertical Spacing**: 250px between levels

### Mini Tree Visualizer
- **Node Size**: 10-12px diameter
- **Vertical Spacing**: 35px
- **Horizontal Spacing**: 15px (for branches)
- **Container Width**: 120px
- **Container Height**: calc(100vh - 120px)

## Accessibility

### Color Contrast
- Text on dark background: #ffffff
- Title labels: bg-slate-900/80
- Tooltips: bg-slate-800 with border

### Keyboard Navigation
- **ESC**: Close tree explorer
- **Arrow Keys**: Navigate nodes (future enhancement)
- **Enter**: Select node (future enhancement)

### Screen Readers
- Images have alt text with title/topic
- Node numbers announced
- Current state indicated

## File Formats

### Thumbnails
- **Format**: PNG
- **Size**: ~50-200 KB
- **Dimensions**: Variable (extracted from video)
- **Quality**: High (q:v 2)
- **Displayed**: 128x80px (may be scaled)

### URLs
```
Video:     https://storage.googleapis.com/vid-gen-static/{job_id}/section_1.mp4
Thumbnail: https://storage.googleapis.com/vid-gen-static/{job_id}/section_1_thumbnail.png
```

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Features
- ✅ Image loading and error handling
- ✅ CSS Grid/Flexbox layout
- ✅ CSS transitions and animations
- ✅ SVG rendering (for fallback icons)

