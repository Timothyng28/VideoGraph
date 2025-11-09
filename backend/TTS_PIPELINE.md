# Text-to-Speech Pipeline

## Overview

The TTS pipeline has been simplified to use a single, consolidated ElevenLabs integration with built-in retry logic and caching. This eliminates redundant code paths and fallback mechanisms that added unnecessary complexity.

## Architecture

### Core Function: `generate_voiceover()`

Located in `backend/modal/services/tts/elevenlabs.py`, this is the primary interface for generating voiceovers:

```python
from services.tts import generate_voiceover

result = generate_voiceover(
    text="Your script text here",
    output_path="/path/to/output.mp3",
    voice_id="K80wneyktrw2rE11kA2W",  # Optional, defaults to Ewen
    retries=3  # Built-in retry logic
)
```

**Returns:**
- `audio_path`: Path to generated audio file
- `word_timings`: Character-level timing for sync
- `character_alignment`: Detailed timing data
- `cost`: Estimated cost in USD
- `from_cache`: Whether result was cached

### Key Features

1. **Automatic Retries**: Built-in retry logic (default: 3 attempts) handles transient API failures
2. **Smart Caching**: Cache-first approach using content-based hashing
3. **Timing Data**: Character and word-level timing for perfect audio-visual sync
4. **Cost Tracking**: Automatic cost calculation for monitoring

## Video Generation Flow

### Dev Environment (`dev/generator_logic.py`)

The dev pipeline generates audio upfront for all sections:

1. **Stage 1**: Generate video plan (structure and sections)
2. **Stage 2**: Generate Manim code for each section
3. **Stage 2.5**: Generate audio from extracted scripts
   ```python
   for section_num, script_text in section_scripts.items():
       result = generate_voiceover(
           text=script_text,
           output_path=audio_dir / f"section_{section_num}.mp3",
           voice_id=selected_voice_id,
           retries=3
       )
   ```
4. **Stage 3**: Render sections (Manim uses cached audio via ElevenLabsTimedService)

### Production Environment (`main_video_generator.py`)

The production pipeline is simpler - Manim generates audio on-demand during rendering:

1. **Stage 1**: Generate video plan
2. **Stage 2**: Generate Manim code (extract scripts for tracking)
3. **Stage 3**: Render sections (audio generated inline by Manim)

## Legacy Compatibility

The `ElevenLabsTimedService` class is maintained for backward compatibility with `manim_voiceover`:

```python
from services.tts import ElevenLabsTimedService

tts_service = ElevenLabsTimedService(
    voice_id="K80wneyktrw2rE11kA2W",
    transcription_model=None  # Always set to None
)
self.set_speech_service(tts_service)
```

This class now delegates to `generate_voiceover()` internally.

## Removed Components

The following have been removed to simplify the pipeline:

1. **PreGeneratedAudioService**: Eliminated fallback mechanism and code patching
2. **Async wrappers**: Removed redundant async API methods
3. **Code patching stage**: No longer needed - Manim handles audio directly
4. **Multiple fallback paths**: Single, reliable ElevenLabs path

## Configuration

### Environment Variables

Set one of these (checked in order):
- `ELEVENLABS_API_KEY`
- `elevenlabs_key` (Modal secret format)
- `ELEVENLABS_KEY`
- `ELEVEN_API_KEY`

### Voice Selection

Default voice: `K80wneyktrw2rE11kA2W` (Ewen - male voice)

To use a different voice, pass `voice_id` parameter to `generate_voiceover()` or `ElevenLabsTimedService()`.

## Error Handling

The pipeline includes comprehensive error handling:

1. **Automatic Retries**: Up to 3 attempts for transient failures
2. **Cache Fallback**: Uses cached audio if available
3. **Detailed Logging**: Clear error messages for debugging
4. **Cost Tracking**: Monitors API usage even on failures

## Best Practices

1. **Always set `transcription_model=None`**: Prevents interactive prompts
2. **Use content-based caching**: Identical scripts reuse cached audio
3. **Monitor costs**: Check returned cost estimates
4. **Handle errors gracefully**: Retries are automatic but check final result

## Migration Notes

If you have code using the old `PreGeneratedAudioService`:

**Before:**
```python
from services.tts.pregenerated import PreGeneratedAudioService

service = PreGeneratedAudioService(
    audio_file_path="/path/to/audio.mp3",
    fallback_to_elevenlabs=True
)
```

**After:**
```python
from services.tts import generate_voiceover

result = generate_voiceover(
    text="Your script",
    output_path="/path/to/audio.mp3",
    voice_id="K80wneyktrw2rE11kA2W",
    retries=3
)
```

The new approach is simpler, more reliable, and requires less code.

