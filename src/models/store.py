import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# Database configuration: use DATABASE_URL env var (Neon PostgreSQL) or fall back to local SQLite
DB_PATH = os.path.join(os.path.dirname(__file__), "../../app.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

# Neon/Heroku/Railway use postgres:// but SQLAlchemy requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Lecture(Base):
    __tablename__ = "lectures"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    video_url = Column(String, nullable=True)
    youtube_id = Column(String, nullable=True)
    drive_file_id = Column(String, nullable=True)
    duration = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    chapters = relationship("Chapter", back_populates="lecture", cascade="all, delete-orphan")
    transcript_lines = relationship("TranscriptLine", back_populates="lecture", cascade="all, delete-orphan")

class Chapter(Base):
    __tablename__ = "chapters"
    
    id = Column(Integer, primary_key=True, index=True)
    lecture_id = Column(String, ForeignKey("lectures.id"))
    title = Column(String)
    summary = Column(Text)
    start_time = Column(Float)  # seconds
    end_time = Column(Float)    # seconds
    
    lecture = relationship("Lecture", back_populates="chapters")

class TranscriptLine(Base):
    __tablename__ = "transcript_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    lecture_id = Column(String, ForeignKey("lectures.id"))
    start_time = Column(Float, index=True)
    end_time = Column(Float)
    content = Column(Text)
    
    lecture = relationship("Lecture", back_populates="transcript_lines")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)  # nullable: Clerk users don't have local passwords
    created_at = Column(DateTime, default=datetime.utcnow)
    
    qa_history = relationship("QAHistory", back_populates="user", cascade="all, delete-orphan")

class QAHistory(Base):
    __tablename__ = "qa_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    lecture_id = Column(String, ForeignKey("lectures.id"))
    question = Column(Text)
    answer = Column(Text)
    thoughts = Column(Text, nullable=True)
    current_timestamp = Column(Float)
    image_base64 = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Learning signals (spec-final.md §3)
    status = Column(String, default="pending")  # pending | understood | reported
    correction_text = Column(Text, nullable=True)  # Filled when status='reported'
    latency_ms = Column(Integer, nullable=True)  # Time from request to stream complete
    is_proactive = Column(Boolean, default=False)  # From proactive suggestion chip?
    
    user = relationship("User", back_populates="qa_history")

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    last_active = Column(DateTime, default=datetime.utcnow)
    lecture_id = Column(String, nullable=True)  # What lecture they're viewing
    
    user = relationship("User")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
