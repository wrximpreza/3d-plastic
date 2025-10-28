"""
File Storage Service

Handles file storage to local filesystem or AWS S3
"""

import os
import shutil
from pathlib import Path
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from config import settings


class StorageService:
    """Service for storing CAD files"""
    
    def __init__(self):
        self.storage_type = settings.storage_type
        
        if self.storage_type == "s3":
            self.s3_client = boto3.client(
                's3',
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key
            )
            self.bucket_name = settings.aws_bucket_name
        else:
            # Local storage
            self.storage_path = Path(settings.storage_path)
            self.storage_path.mkdir(parents=True, exist_ok=True)
    
    def save_file(self, file_path: str, destination_key: str) -> str:
        """
        Save file to storage
        
        Args:
            file_path: Local path to file
            destination_key: Destination key/path in storage
            
        Returns:
            URL or path to stored file
        """
        if self.storage_type == "s3":
            return self._save_to_s3(file_path, destination_key)
        else:
            return self._save_to_local(file_path, destination_key)
    
    def _save_to_s3(self, file_path: str, destination_key: str) -> str:
        """Save file to AWS S3"""
        try:
            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                destination_key,
                ExtraArgs={'ACL': 'public-read'}
            )
            
            # Return public URL
            url = f"https://{self.bucket_name}.s3.{settings.aws_region}.amazonaws.com/{destination_key}"
            return url
            
        except ClientError as e:
            raise Exception(f"Failed to upload to S3: {str(e)}")
    
    def _save_to_local(self, file_path: str, destination_key: str) -> str:
        """Save file to local filesystem"""
        destination_path = self.storage_path / destination_key
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        
        shutil.copy2(file_path, destination_path)
        
        # Return relative URL path
        return f"/files/{destination_key}"
    
    def delete_file(self, file_key: str) -> bool:
        """
        Delete file from storage
        
        Args:
            file_key: Key/path of file to delete
            
        Returns:
            True if successful
        """
        if self.storage_type == "s3":
            return self._delete_from_s3(file_key)
        else:
            return self._delete_from_local(file_key)
    
    def _delete_from_s3(self, file_key: str) -> bool:
        """Delete file from S3"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_key)
            return True
        except ClientError:
            return False
    
    def _delete_from_local(self, file_key: str) -> bool:
        """Delete file from local filesystem"""
        try:
            file_path = self.storage_path / file_key
            if file_path.exists():
                file_path.unlink()
            return True
        except Exception:
            return False
    
    def get_file_url(self, file_key: str) -> str:
        """
        Get URL for accessing file
        
        Args:
            file_key: Key/path of file
            
        Returns:
            URL to access file
        """
        if self.storage_type == "s3":
            return f"https://{self.bucket_name}.s3.{settings.aws_region}.amazonaws.com/{file_key}"
        else:
            return f"/files/{file_key}"


# Global storage service instance
storage_service = StorageService()

