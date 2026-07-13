import logging
import re
import math
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.database.models import AgentMemory

logger = logging.getLogger(__name__)

def add_memory(user_id: int, memory_text: str, metadata: dict):
    """Saves a semantic memory string into the AgentMemory SQL table."""
    db = SessionLocal()
    try:
        # Create a new AgentMemory entry with type 'semantic'
        memory = AgentMemory(
            user_id=user_id,
            memory_type="semantic",
            content=memory_text
        )
        db.add(memory)
        db.commit()
        logger.info(f"[VectorStore] Added memory for user {user_id}: {memory_text}")
    except Exception as e:
        logger.error(f"[VectorStore] Error adding memory to SQL AgentMemory: {e}")
    finally:
        db.close()

def _tokenize(text: str) -> list[str]:
    """Tokenize the input text into simple words."""
    return re.findall(r'\w+', text.lower())

def _get_term_frequencies(tokens: list[str]) -> dict:
    """Calculates term frequency counts for a token sequence."""
    freq = {}
    for token in tokens:
        freq[token] = freq.get(token, 0) + 1
    return freq

def _cosine_similarity(vec1: dict, vec2: dict) -> float:
    """Calculates cosine similarity between two term frequency vectors."""
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum([vec1[x] * vec2[x] for x in intersection])
    
    sum1 = sum([vec1[x]**2 for x in vec1.keys()])
    sum2 = sum([vec2[x]**2 for x in vec2.keys()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    
    if not denominator:
        return 0.0
    return float(numerator) / denominator

def query_memories(user_id: int, query: str, limit: int = 5) -> list[str]:
    """Retrieves relevant memory logs using pure Python cosine similarity on SQL data."""
    db = SessionLocal()
    try:
        memories = db.query(AgentMemory).filter(
            AgentMemory.user_id == user_id,
            AgentMemory.memory_type == "semantic"
        ).all()
        
        if not memories:
            return []
            
        query_tokens = _tokenize(query)
        query_vec = _get_term_frequencies(query_tokens)
        
        scored_memories = []
        for mem in memories:
            mem_tokens = _tokenize(mem.content)
            mem_vec = _get_term_frequencies(mem_tokens)
            similarity = _cosine_similarity(query_vec, mem_vec)
            scored_memories.append((similarity, mem.content))
            
        # Sort by similarity score descending
        scored_memories.sort(key=lambda x: x[0], reverse=True)
        
        # Return top N elements
        return [content for score, content in scored_memories[:limit]]
    except Exception as e:
        logger.error(f"[VectorStore] Error querying memories from database: {e}")
        return []
    finally:
        db.close()

def clear_memories(user_id: int):
    """Deletes all semantic memories associated with the specified user ID."""
    db = SessionLocal()
    try:
        db.query(AgentMemory).filter(
            AgentMemory.user_id == user_id,
            AgentMemory.memory_type == "semantic"
        ).delete()
        db.commit()
        logger.info(f"[VectorStore] Cleared semantic memories for user {user_id}")
    except Exception as e:
        logger.error(f"[VectorStore] Error clearing memories: {e}")
    finally:
        db.close()
