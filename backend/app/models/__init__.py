from app.models.knowledge import KnowledgeDoc, KnowledgeChunk, FaqEntry
from app.models.interaction import InteractionLog
from app.models.avatar import AvatarConfig
from app.models.tourist import TouristProfile, ScenicSpot, TourRoute
from app.models.memory import TravelMemory, JourneySummary

__all__ = [
    "KnowledgeDoc",
    "KnowledgeChunk",
    "FaqEntry",
    "InteractionLog",
    "AvatarConfig",
    "TouristProfile",
    "ScenicSpot",
    "TourRoute",
    "TravelMemory",
    "JourneySummary",
]
