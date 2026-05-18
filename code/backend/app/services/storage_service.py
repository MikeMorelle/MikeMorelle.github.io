import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

"""
Storage abstraction layer, this handles communication with SeaweedFS via S3 API.
"""

s3 = boto3.client(
    "s3",
    endpoint_url=settings.S3_ENDPOINT,
    aws_access_key_id=settings.S3_ACCESS_KEY,
    aws_secret_access_key=settings.S3_SECRET_KEY,
    region_name="us-east-1",
)

BUCKET_NAME = "events"

def create_bucket():
    """ Creates a storage bucket if it does not exist. """
    try:
        s3.create_bucket(Bucket=BUCKET_NAME)
    except Exception:
        pass

def upload_file(file_obj, filename):
    """ Uploads event image to storage. """
    s3.upload_fileobj(file_obj, BUCKET_NAME, filename)

def delete_file(filename):
    """ Deletes event image from storage. """
    s3.delete_object(Bucket=BUCKET_NAME, Key=filename)

def generate_download_url(filename):
    """ Generates temporary download URL. """
    return s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": BUCKET_NAME, "Key": filename},
        ExpiresIn=3600
    )