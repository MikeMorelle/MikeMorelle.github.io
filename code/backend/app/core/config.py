import os
from dotenv import load_dotenv

load_dotenv()

"""
Application configuration layer loads environment variables
"""

class Settings:
    S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://localhost:8333")
    S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "set_value_here")
    S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "set_value_here")

settings = Settings()