from fastapi import HTTPException, status, UploadFile
from src.models import User, Attendance
from datetime import datetime, time
from deepface import DeepFace
import cloudinary.uploader
import os
from dotenv import load_dotenv
import pytz


load_dotenv()
CLOUD_NAME = os.getenv("CLOUD_NAME")
API_KEY = os.getenv("API_KEY")
API_SECRET = os.getenv("API_SECRET")


cloudinary.config( 
    cloud_name = CLOUD_NAME, 
    api_key = API_KEY, 
    api_secret = API_SECRET,
    secure=True
)


async def upload_image(file: UploadFile, folder: str):
    """
    Upload image to Cloudinary and return the URL and public_id.
    """
    try:
        contents = await file.read()
        image = cloudinary.uploader.upload(contents, folder=folder)
        url = image["secure_url"]
        public_id = image["public_id"]
        return {
            "secure_url": url,
            "public_id": public_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error while uploading image: {str(e)}"
        )

def delete_image(public_id: str):
    """
    Delete image from Cloudinary using public_id.
    """
    cloudinary.uploader.destroy(public_id)


def verify_faces(temp_url: str, face_url: str) -> bool:
    """
    Verify if two face images belong to the same person.
    """
    try:
        result = DeepFace.verify(
            img1_path=temp_url,
            img2_path=face_url
        )
        if not result["verified"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Face verification failed."
            )
        return True
    except ValueError as ve:
        error_message = str(ve)
        if "img1_path" in error_message:
            detail = "No face detected in the check-in image."
        elif "img2_path" in error_message:
            detail = "No face detected in the reference image."
        else:
            detail = error_message
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during face verification: {str(e)}"
        )


async def process_attendance(current_user: User) -> dict:
    """
    Process attendance for the current user.
    """ 
    vn_timezone = pytz.timezone("Asia/Ho_Chi_Minh")
    today = datetime.now(vn_timezone).date()
    now = datetime.now(vn_timezone).time().replace(microsecond=0)
    attendance_time = time(8, 0)

    attendance = await Attendance.get_or_none(user=current_user, date=today)

    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found for today."
        )

    if attendance.time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance has already been recorded for today."
        )

    attendance.time = now
    attendance.status = "On time" if now <= attendance_time else "Late"
    await attendance.save()

    return {
        "attendance_id": attendance.attendance_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "date": attendance.date,
        "time": attendance.time,
        "status": attendance.status,
    }
