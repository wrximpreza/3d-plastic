from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings"""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    cors_origins: Union[str, List[str]] = "http://localhost:3000,http://localhost:4173"

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    # Database
    database_url: str = "sqlite:///./plastic_configurator.db"
    
    # FreeCAD
    freecad_path: str = "/usr/lib/freecad-python3/lib"
    freecad_python: str = "/usr/bin/freecadcmd"
    
    # Storage
    storage_type: str = "local"  # local or s3
    storage_path: str = "./storage/cad_files"
    aws_bucket_name: str = ""
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    
    # Visma
    visma_api_url: str = "https://api.visma.com/v1"
    visma_api_key: str = ""
    visma_client_id: str = ""
    visma_client_secret: str = ""
    visma_webhook_secret: str = ""
    
    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

