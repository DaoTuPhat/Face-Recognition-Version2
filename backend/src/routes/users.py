from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from src.utils.auth_utils import get_current_user
from src.utils.file_utils import upload_image, delete_image, verify_faces, process_attendance
from src.utils.filter_utils import filter_by_attendance
from src.models import User, Attendance
from typing import List


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=dict)
async def get_my_info(current_user: User = Depends(get_current_user)):
    """
    Allow a user to view their personal information.
    """
    return {
        "user_id": current_user.user_id,
        "fullname": current_user.fullname,
        "email": current_user.email,
        "department": current_user.department,
        "face_url": current_user.face_url
    }

    
@router.post("/attendance")
async def record_attendance(
    face_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """ 
    Allow a user to record attendance using face verification.
    """
    upload_result = await upload_image(face_image, folder="temp")
    temp_url = upload_result["secure_url"]
    temp_public_id = upload_result["public_id"]
    try:
        if not current_user.face_url:
            raise HTTPException(
                status_code=400, 
                detail="User has not uploaded a face image."
            )
        if verify_faces(temp_url, current_user.face_url):
            return await process_attendance(current_user)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error verifying user's face image: {str(e)}"
        )
    finally:
        delete_image(temp_public_id)


@router.get("/attendance", response_model=List[dict])
async def get_attendance_history(
    year: int = None,
    month: int = None,
    day: int = None,
    status: str = None,
    current_user: User = Depends(get_current_user)
):
    """
    Allow a user to view their attendance history.
    """
    attendances = await Attendance.filter(user=current_user).order_by("-date")
    filtered_attendances = filter_by_attendance(
        attendances,
        day=day,
        month=month,
        year=year,
        status=status
    )
    return [
        {
            "attendance_id": att.attendance_id,
            "date": att.date,
            "time": att.time,
            "status": att.status
        }
        for att in filtered_attendances
    ]