"""
ElevenLabs TTS service implementation
Simplified voiceover generation with character-level timing for perfect sync
Uses the createSpeechWithTiming API endpoint for precise synchronization
"""

import base64
import hashlib
import json
import os
from pathlib import Path
from typing import Dict, List, Optional

import requests
from manim_voiceover.services.base import SpeechService


def generate_voiceover(
    text: str,
    output_path: str,
    voice_id: str = "K80wneyktrw2rE11kA2W",
    retries: int = 3
) -> Dict:
    """
    Generate voiceover audio for a text script with automatic retries.
    
    This is the primary interface for generating voiceovers in the video pipeline.
    It handles caching, retries, and returns timing information for sync.
    
    Args:
        text: Script text to convert to speech
        output_path: Full path where audio file should be saved (e.g., /outputs/job_id/section_1.mp3)
        voice_id: ElevenLabs voice ID (default: K80wneyktrw2rE11kA2W - Ewen)
        retries: Number of retry attempts on failure (default: 3)
    
    Returns:
        Dictionary with:
            - audio_path: Path to generated audio file
            - word_timings: List of word timing dicts with 'text', 'start', 'end'
            - character_alignment: Character-level timing data
            - cost: Estimated cost in USD
            - from_cache: Whether result was from cache
    
    Raises:
        Exception: If generation fails after all retries
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Get API key
    api_key = (
        os.getenv('ELEVENLABS_API_KEY') or
        os.getenv('elevenlabs_key') or
        os.getenv('ELEVENLABS_KEY') or
        os.getenv('ELEVEN_API_KEY')
    )
    
    if not api_key:
        raise ValueError(
            "ElevenLabs API key required. Set ELEVENLABS_API_KEY environment variable."
        )
    
    # Check cache
    cache_key = _get_cache_key(text, voice_id)
    cache_dir = output_path.parent
    cached_audio = cache_dir / f"{cache_key}.mp3"
    cached_timing = cache_dir / f"{cache_key}.timing.json"
    
    if cached_audio.exists() and cached_timing.exists():
        print(f"📋 Using cached audio for: {text[:50]}...")
        try:
            timing_data = json.loads(cached_timing.read_text())
            cost = _calculate_cost(text)
            return {
                "audio_path": str(cached_audio),
                "word_timings": timing_data.get('word_timings', []),
                "character_alignment": timing_data.get('character_alignment', {}),
                "cost": cost,
                "character_count": len(text),
                "from_cache": True
            }
        except Exception as e:
            print(f"⚠️  Cache read error: {e}, regenerating...")
    
    # Generate with retries
    last_error = None
    for attempt in range(retries):
        try:
            print(f"🔊 Generating audio (attempt {attempt + 1}/{retries}): {text[:50]}...")
            
            # Call ElevenLabs API
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps"
            headers = {
                "xi-api-key": api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True
                }
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            result = response.json()
            
            # Decode and save audio
            audio_bytes = base64.b64decode(result['audio_base64'])
            output_path.write_bytes(audio_bytes)
            print(f"✅ Audio saved: {output_path.name} ({len(audio_bytes)} bytes)")
            
            # Extract timing
            alignment = result.get('alignment', {})
            characters = alignment.get('characters', [])
            char_start_times = alignment.get('character_start_times_seconds', [])
            char_end_times = alignment.get('character_end_times_seconds', [])
            word_timings = _extract_word_timings(characters, char_start_times, char_end_times)
            
            # Save timing data
            timing_data = {
                "text": text,
                "word_timings": word_timings,
                "character_alignment": alignment
            }
            timing_file = output_path.with_suffix('.timing.json')
            timing_file.write_text(json.dumps(timing_data, indent=2))
            
            # Cache for future use
            if not cached_audio.exists():
                cached_audio.write_bytes(audio_bytes)
                cached_timing.write_text(json.dumps(timing_data, indent=2))
            
            cost = _calculate_cost(text)
            print(f"💰 Cost: ${cost:.4f} ({len(text)} characters)")
            
            return {
                "audio_path": str(output_path),
                "word_timings": word_timings,
                "character_alignment": alignment,
                "cost": cost,
                "character_count": len(text),
                "from_cache": False
            }
            
        except Exception as e:
            last_error = e
            print(f"❌ Attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                print(f"⏳ Retrying...")
                continue
    
    raise Exception(f"Failed to generate voiceover after {retries} attempts: {last_error}")


def _get_cache_key(text: str, voice_id: str) -> str:
    """Generate cache key from text and voice ID."""
    data = {"text": text, "voice_id": voice_id, "service": "elevenlabs_timed"}
    data_str = json.dumps(data, sort_keys=True)
    return hashlib.sha256(data_str.encode('utf-8')).hexdigest()


def _calculate_cost(text: str) -> float:
    """Calculate estimated cost for text-to-speech generation."""
    # ElevenLabs pricing: ~$0.30 per 1,000 characters
    return len(text) * 0.0003


def _extract_word_timings(
    characters: List[str],
    start_times: List[float],
    end_times: List[float]
) -> List[Dict]:
    """Convert character-level timing to word-level timing."""
    if not characters or not start_times or not end_times:
        return []
    
    words = []
    current_word = {
        'text': '',
        'start': start_times[0] if start_times else 0,
        'end': 0,
        'char_start_index': 0,
        'char_end_index': 0
    }
    
    for i, char in enumerate(characters):
        if char in [' ', '\n', '\t']:
            # End current word if it has content
            if current_word['text'].strip():
                current_word['end'] = end_times[i-1] if i > 0 else start_times[i]
                current_word['char_end_index'] = i - 1
                words.append(current_word.copy())
            
            # Start new word (skip whitespace)
            next_char_idx = i + 1
            while next_char_idx < len(characters) and characters[next_char_idx] in [' ', '\n', '\t']:
                next_char_idx += 1
            
            if next_char_idx < len(characters):
                current_word = {
                    'text': '',
                    'start': start_times[next_char_idx] if next_char_idx < len(start_times) else 0,
                    'end': 0,
                    'char_start_index': next_char_idx,
                    'char_end_index': next_char_idx
                }
        else:
            current_word['text'] += char
            current_word['char_end_index'] = i
    
    # Add the last word if it has content
    if current_word['text'].strip():
        current_word['end'] = end_times[-1] if end_times else 0
        words.append(current_word)
    
    return words


# ============================================================================
# Legacy Manim Voiceover Service (for backward compatibility)
# ============================================================================

class ElevenLabsTimedService(SpeechService):
    """
    ElevenLabs TTS service with character-level timing for perfect sync.
    Uses the createSpeechWithTiming API endpoint for precise synchronization.
    """

    def __init__(self,
                 api_key: Optional[str] = None,
                 voice_id: str = "K80wneyktrw2rE11kA2W",  # Specified voice ID (Ewen)
                 model_id: str = "eleven_multilingual_v2",
                 stability: float = 0.5,
                 similarity_boost: float = 0.75,
                 style: float = 0.0,
                 use_speaker_boost: bool = True,
                 transcription_model: Optional[str] = None,  # Disable transcription by default
                 **kwargs):
        """
        Initialize ElevenLabs TTS service with timing support.

        Args:
            api_key: ElevenLabs API key (or set via ELEVENLABS_API_KEY env var)
            voice_id: Voice ID to use (default: K80wneyktrw2rE11kA2W)
            model_id: Model to use (eleven_multilingual_v2, eleven_monolingual_v1, etc.)
            stability: Voice stability (0-1, higher = more consistent)
            similarity_boost: Voice clarity (0-1, higher = more similar to original)
            style: Style exaggeration (0-1, higher = more expressive)
            use_speaker_boost: Whether to use speaker boost
        """

        # Get API key from parameter or environment (check multiple possible names)
        self.api_key = (api_key or
                       os.getenv('ELEVENLABS_API_KEY') or
                       os.getenv('elevenlabs_key') or  # Modal secret format
                       os.getenv('ELEVENLABS_KEY'))

        print(f"🔑 [ElevenLabs] API key found: {'Yes' if self.api_key else 'No'}")
        if self.api_key:
            print(f"🔑 [ElevenLabs] API key prefix: {self.api_key[:10]}...")

        if not self.api_key:
            raise ValueError(
                "ElevenLabs API key required. Set ELEVENLABS_API_KEY environment variable "
                "or pass api_key parameter."
            )

        self.voice_id = voice_id
        self.model_id = model_id
        self.voice_settings = {
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": style,
            "use_speaker_boost": use_speaker_boost
        }

        self.base_url = "https://api.elevenlabs.io/v1"

        # Override kwargs to disable transcription if not explicitly requested
        # This prevents the interactive package installation prompt
        if 'transcription_model' not in kwargs:
            kwargs['transcription_model'] = None

        super().__init__(**kwargs)

        # Ensure cache_dir is set
        if not hasattr(self, 'cache_dir') or self.cache_dir is None:
            self.cache_dir = "media/voiceovers"

        print(f"✅ ElevenLabs TTS initialized with voice: {voice_id}")

    def calculate_cost(self, text: str) -> float:
        """
        Calculate the cost of generating TTS for the given text.

        ElevenLabs pricing is character-based:
        - Starter ($5/month): ~30,000 characters/month
        - Creator ($22/month): ~100,000 characters/month
        - Pro ($99/month): ~500,000 characters/month
        - Scale ($330/month): ~2 million characters/month

        For API usage, approximate rates:
        - $0.30 per 1,000 characters (professional models)
        - $0.15 per 1,000 characters (turbo models)

        Args:
            text: Text to be converted to speech

        Returns:
            Estimated cost in USD
        """
        character_count = len(text)

        # Use the professional model rate as it's most commonly used
        # $0.30 per 1,000 characters = $0.0003 per character
        cost_per_character = 0.0003

        total_cost = character_count * cost_per_character

        return total_cost

    def get_data_hash(self, input_data: Dict) -> str:
        """
        Generate hash for caching based on input parameters.
        """
        data_str = json.dumps(input_data, sort_keys=True)
        return hashlib.sha256(data_str.encode('utf-8')).hexdigest()

    def _extract_word_timings(self, characters: List[str],
                            start_times: List[float],
                            end_times: List[float]) -> List[Dict]:
        """
        Convert character-level timing to word-level timing for easier use in Manim.
        Delegates to the module-level function.

        Args:
            characters: List of characters from API response
            start_times: Start times for each character
            end_times: End times for each character

        Returns:
            List of word timing dictionaries with 'text', 'start', 'end'
        """
        return _extract_word_timings(characters, start_times, end_times)

    def generate_from_text(self, text: str, cache_dir: Optional[str] = None,
                          path: Optional[str] = None) -> Dict:
        """
        Generate audio from text with timing information.
        
        This method delegates to the new generate_voiceover() function.
        Kept for backward compatibility with manim_voiceover.

        Args:
            text: Text to convert to speech
            cache_dir: Directory for cached audio files
            path: Optional specific path for the audio file

        Returns:
            Dictionary containing audio file info, timing data, and metadata
        """
        if cache_dir is None:
            cache_dir = self.cache_dir

        # Ensure cache directory exists
        Path(cache_dir).mkdir(parents=True, exist_ok=True)

        # Determine output path
        if path is None:
            hash_key = self.get_data_hash({
                "input_text": text,
                "service": "elevenlabs_timed",
                "voice_id": self.voice_id
            })
            audio_filename = f"{hash_key}.mp3"
        else:
            audio_filename = path

        output_path = Path(cache_dir) / Path(audio_filename).name
        
        # Use the new simplified function
        result = generate_voiceover(
            text=text,
            output_path=str(output_path),
            voice_id=self.voice_id,
            retries=3
        )
        
        # Convert to legacy format expected by manim_voiceover
        return {
            "input_text": text,
            "input_data": {
                "input_text": text,
                "service": "elevenlabs_timed",
                "voice_id": self.voice_id
            },
            "original_audio": audio_filename,
            "word_timings": result.get('word_timings', []),
            "character_alignment": result.get('character_alignment', {}),
            "service": "elevenlabs_timed",
            "cost": result.get('cost', 0),
            "character_count": result.get('character_count', len(text)),
            "from_cache": result.get('from_cache', False)
        }

    def get_available_voices(self) -> List[Dict]:
        """
        Get list of available voices from ElevenLabs API.

        Returns:
            List of voice dictionaries with id, name, and other metadata
        """
        url = f"{self.base_url}/voices"
        headers = {"xi-api-key": self.api_key}

        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.json().get('voices', [])
        except requests.exceptions.RequestException as e:
            print(f"⚠️  Could not fetch voices: {e}")
            return []

    def print_voice_info(self):
        """Print information about the current voice and available alternatives."""
        voices = self.get_available_voices()
        current_voice = next((v for v in voices if v['voice_id'] == self.voice_id), None)

        print(f"\n🎤 Current Voice: {self.voice_id}")
        if current_voice:
            print(f"   Name: {current_voice.get('name', 'Unknown')}")
            print(f"   Description: {current_voice.get('description', 'No description')}")

        print(f"\n📊 Available Voices ({len(voices)} total):")
        for voice in voices[:5]:  # Show first 5
            print(f"   {voice['voice_id']}: {voice.get('name', 'Unnamed')}")

        if len(voices) > 5:
            print(f"   ... and {len(voices) - 5} more")
