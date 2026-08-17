import os
from dotenv import load_dotenv

load_dotenv()

"""
Application configuration layer loads environment variables
"""

class Settings:
    S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://localhost:8333")
    S3_PUBLIC_ENDPOINT = os.getenv("S3_PUBLIC_ENDPOINT", S3_ENDPOINT)
    S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "admin")
    S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "admin")
    S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "events")

settings = Settings()