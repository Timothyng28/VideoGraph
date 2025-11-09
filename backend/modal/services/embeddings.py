"""
Embedding Service

Provides text embedding functionality using either sentence-transformers or
Google Gemini embeddings.
"""

import os
from typing import List, Optional

import numpy as np

DEFAULT_ST_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_GEMINI_MODEL = "models/text-embedding-004"
SUPPORTED_PROVIDERS = {"sentence-transformers", "gemini"}


class EmbeddingService:
    """
    Service for generating text embeddings using configurable providers.
    
    Providers:
    - sentence-transformers (default): all-MiniLM-L6-v2, 384-dimensional embeddings
    - gemini: Google Gemini text-embedding-004, 768-dimensional embeddings
    """
    
    def __init__(
        self,
        model_name: Optional[str] = None,
        provider: Optional[str] = None,
    ):
        """
        Initialize the embedding service.
        
        Args:
            model_name: Provider-specific model identifier (optional)
            provider: Embedding provider override
        """
        env_provider = os.getenv("EMBEDDING_PROVIDER")
        resolved_provider = provider or env_provider or "sentence-transformers"
        resolved_provider = resolved_provider.lower()
        
        if resolved_provider not in SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Unsupported embedding provider '{resolved_provider}'. "
                f"Supported providers: {', '.join(sorted(SUPPORTED_PROVIDERS))}"
            )
        
        self.provider = resolved_provider
        self.model_name = model_name or DEFAULT_ST_MODEL
        self.gemini_model = os.getenv("GEMINI_EMBEDDING_MODEL", DEFAULT_GEMINI_MODEL)
        
        self._st_model = None
        self._gemini_module = None
        self._gemini_configured = False
    
    def _load_sentence_transformer(self):
        """Lazy load the sentence-transformers model on first use."""
        if self._st_model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                raise ImportError(
                    "sentence-transformers not installed. "
                    "Install with: pip install sentence-transformers"
                ) from exc
            
            print(f"Loading embedding model: {self.model_name}")
            self._st_model = SentenceTransformer(self.model_name)
            print("Embedding model loaded successfully")
    
    def _configure_gemini(self):
        """Configure the Gemini client once."""
        if self._gemini_configured:
            return
        
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError(
                "GOOGLE_API_KEY environment variable is required when using the "
                "Gemini embedding provider."
            )
        
        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise ImportError(
                "google-generativeai not installed. "
                "Install with: pip install google-generativeai"
            ) from exc
        
        genai.configure(api_key=api_key)
        self._gemini_module = genai
        self._gemini_configured = True
    
    @staticmethod
    def _normalize_vector(vector: np.ndarray) -> np.ndarray:
        """Normalize embedding vector to unit length."""
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector
    
    def _embed_with_sentence_transformers(self, text: str) -> List[float]:
        self._load_sentence_transformer()
        embedding = self._st_model.encode(text, convert_to_numpy=True)
        embedding = self._normalize_vector(embedding)
        return embedding.tolist()
    
    def _embed_batch_with_sentence_transformers(
        self,
        texts: List[str],
        batch_size: int = 32,
    ) -> List[List[float]]:
        self._load_sentence_transformer()
        
        embeddings = self._st_model.encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1  # Avoid division by zero
        embeddings = embeddings / norms
        return embeddings.tolist()
    
    def _embed_with_gemini(self, text: str) -> List[float]:
        self._configure_gemini()
        result = self._gemini_module.embed_content(
            model=self.gemini_model,
            content=text,
        )
        
        embedding = np.array(result.get("embedding", []), dtype=float)
        if embedding.size == 0:
            raise ValueError("Gemini embedding response did not include embeddings.")
        
        embedding = self._normalize_vector(embedding)
        return embedding.tolist()
    
    def _embed_batch_with_gemini(self, texts: List[str]) -> List[List[float]]:
        self._configure_gemini()
        embeddings: List[List[float]] = []
        
        for text in texts:
            result = self._gemini_module.embed_content(
                model=self.gemini_model,
                content=text,
            )
            embedding = np.array(result.get("embedding", []), dtype=float)
            if embedding.size == 0:
                raise ValueError("Gemini embedding response did not include embeddings.")
            embedding = self._normalize_vector(embedding)
            embeddings.append(embedding.tolist())
        
        return embeddings
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding
        """
        if self.provider == "gemini":
            return self._embed_with_gemini(text)
        return self._embed_with_sentence_transformers(text)
    
    def embed_batch(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.
        
        Args:
            texts: List of texts to embed
            batch_size: Batch size for processing (sentence-transformers only)
            
        Returns:
            List of embeddings, one per input text
        """
        if not texts:
            return []
        
        if self.provider == "gemini":
            return self._embed_batch_with_gemini(texts)
        return self._embed_batch_with_sentence_transformers(texts, batch_size=batch_size)


def cosine_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """
    Compute cosine similarity between two embeddings.
    
    Since embeddings are normalized, this is just the dot product.
    
    Args:
        embedding1: First embedding
        embedding2: Second embedding
        
    Returns:
        Similarity score between -1 and 1 (higher = more similar)
    """
    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)
    return float(np.dot(vec1, vec2))


def find_most_similar(
    query_embedding: List[float],
    embeddings: List[List[float]],
    top_k: int = 5
) -> List[tuple[int, float]]:
    """
    Find the most similar embeddings to a query.
    
    Args:
        query_embedding: Query embedding
        embeddings: List of embeddings to search
        top_k: Number of top results to return
        
    Returns:
        List of (index, similarity_score) tuples, sorted by similarity descending
    """
    query_vec = np.array(query_embedding)
    embeddings_array = np.array(embeddings)
    
    # Compute similarities (dot product since normalized)
    similarities = np.dot(embeddings_array, query_vec)
    
    # Get top-k indices
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    # Return (index, score) pairs
    results = [(int(idx), float(similarities[idx])) for idx in top_indices]
    
    return results

