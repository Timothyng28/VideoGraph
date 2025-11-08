# Thumbnail and Title Generation Feature

## Overview
Added automatic thumbnail generation and title generation for each video section.

## Changes Made

### 1. GCS Storage Service (`backend/modal/services/gcs_storage.py`)

**Added Methods:**
- `GCSStorageService.upload_scene_thumbnail()`: Upload thumbnail PNG files to GCS
- `upload_scene_thumbnail()`: Convenience function for uploading thumbnails

**Functionality:**
- Uploads thumbnails to `{job_id}/section_{section_num}_thumbnail.png`
- Sets correct content type (`image/png`) and metadata

### 2. Renderer (`backend/modal/dev/renderer.py`)

**Added Thumbnail Generation:**
- After each section is successfully rendered, extracts the first frame as a thumbnail
- Uses `ffmpeg -vframes 1` to extract high-quality PNG thumbnail
- Uploads thumbnail to GCS alongside the section video

**Process:**
1. Render section video
2. Extract first frame: `ffmpeg -i video.mp4 -vframes 1 -q:v 2 thumbnail.png`
3. Upload thumbnail to GCS: `{job_id}/section_{section_num}_thumbnail.png`
4. Upload section video to GCS: `{job_id}/section_{section_num}.mp4`

### 3. Generator Logic (`backend/modal/dev/generator_logic.py`)

**Added Title Generation:**
- After all sections are rendered, generates titles for each successful section
- Uses the same LLM service (Anthropic Sonnet or Cerebras Qwen, depending on mode)
- Generates titles in parallel for all sections

**Title Generation Prompt:**
- Analyzes section name and content
- Generates concise, engaging titles (5-8 words)
- Falls back to section name if generation fails

**Updated Response:**
Each section in `section_details` now includes:
```json
{
  "section": 1,
  "title": "Understanding Photosynthesis Basics",
  "video_url": "https://storage.googleapis.com/vid-gen-static/{job_id}/section_1.mp4",
  "thumbnail_url": "https://storage.googleapis.com/vid-gen-static/{job_id}/section_1_thumbnail.png",
  "voiceover_script": "..."
}
```

## API Response Format

### Final Response Structure
```json
{
  "status": "completed",
  "job_id": "abc-123",
  "sections": [
    "https://storage.googleapis.com/vid-gen-static/{job_id}/section_1.mp4",
    "https://storage.googleapis.com/vid-gen-static/{job_id}/section_2.mp4"
  ],
  "section_details": [
    {
      "section": 1,
      "title": "Introduction to Photosynthesis",
      "video_url": "https://storage.googleapis.com/vid-gen-static/{job_id}/section_1.mp4",
      "thumbnail_url": "https://storage.googleapis.com/vid-gen-static/{job_id}/section_1_thumbnail.png",
      "voiceover_script": "In this section, we'll explore..."
    },
    {
      "section": 2,
      "title": "Light-Dependent Reactions",
      "video_url": "https://storage.googleapis.com/vid-gen-static/{job_id}/section_2.mp4",
      "thumbnail_url": "https://storage.googleapis.com/vid-gen-static/{job_id}/section_2_thumbnail.png",
      "voiceover_script": "Now let's dive into..."
    }
  ],
  "metadata": {
    "prompt": "Explain photosynthesis",
    "num_sections": 2,
    ...
  }
}
```

## Benefits

1. **Better UX**: Thumbnails provide visual previews of each section
2. **Improved Navigation**: Titles help users understand section content at a glance
3. **Frontend Integration**: Easy to display section cards with thumbnails and titles
4. **SEO Friendly**: Descriptive titles improve content discoverability

## Performance Impact

- **Thumbnail Generation**: ~1-2 seconds per section (parallel with upload)
- **Title Generation**: ~1-2 seconds total (all sections in parallel)
- **Storage Impact**: ~50-200 KB per thumbnail (PNG format, high quality)

## Error Handling

- Thumbnail generation is **non-fatal** - if it fails, video rendering continues
- Title generation has **fallback** - uses section name if LLM generation fails
- Both features degrade gracefully without affecting core video generation

## Testing

To test the feature:
```bash
modal run backend/modal/main_video_generator_dev_modular.py --prompt "Explain neural networks"
```

Expected output logs:
```
🖼️  [Container 1] Generating thumbnail (first frame)...
✓ [Container 1] Thumbnail generated (87.34 KB)
✓ [Container 1] Scene video uploaded to GCS: https://...
✓ [Container 1] Thumbnail uploaded to GCS: https://...

🏷️  Generating Section Titles
🏷️  [Section 1] Generating title...
✓ [Section 1] Title: Understanding Neural Network Basics
✓ Generated 3 section titles
```

## Future Enhancements

1. **Customizable Thumbnail Time**: Allow selecting a specific frame instead of first
2. **Thumbnail Composition**: Add title text overlay on thumbnail
3. **Multiple Thumbnail Sizes**: Generate different sizes for responsive display
4. **Video Preview GIFs**: Generate short animated previews

