import boto3
from botocore.exceptions import ClientError
import time
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

BUCKET_NAME = settings.S3_BUCKET_NAME

def create_bucket(retries=10, delay=2):
    """ Creates a storage bucket if it does not exist. """
    last_error = None

    for _ in range(retries):
        try:
            s3.head_bucket(Bucket=BUCKET_NAME)
            return
        except ClientError as error:
            last_error = error
            try:
                s3.create_bucket(Bucket=BUCKET_NAME)
                return
            except ClientError as create_error:
                last_error = create_error
        except Exception as error:
            last_error = error

        time.sleep(delay)

    raise RuntimeError(f"Object storage bucket '{BUCKET_NAME}' is unavailable") from last_error


def check_storage():
    """Check that the configured S3 bucket is reachable."""
    s3.head_bucket(Bucket=BUCKET_NAME)

def upload_file(file_obj, filename):
    """ Uploads event image to storage. """
    file_obj.seek(0)
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=filename,
        Body=file_obj.read(),
    )

def delete_file(filename):
    """ Deletes event image from storage. """
    s3.delete_object(Bucket=BUCKET_NAME, Key=filename)

def generate_download_url(filename):
    """ Generates temporary download URL. """
    url = s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": BUCKET_NAME, "Key": filename},
        ExpiresIn=3600
    )
    internal_endpoint = settings.S3_ENDPOINT.rstrip("/")
    public_endpoint = settings.S3_PUBLIC_ENDPOINT.rstrip("/")
    return url.replace(internal_endpoint, public_endpoint, 1)