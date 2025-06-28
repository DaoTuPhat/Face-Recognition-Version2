from fastapi import APIRouter, Form, HTTPException, status, Depends, UploadFile, File
from src.utils.auth_utils import get_current_admin, get_password_hash
from src.utils.file_utils import upload_image, delete_image
from src.utils.filter_utils import get_user_by_id, filter_by_attendance, filter_by_user
from src.utils.validate_utils import validate_data
from src.models import User, Attendance
from typing import List


router = APIRouter(prefix="/admins", tags=["admins"])


@router.get("/", response_model=List[dict])
async def get_users(
    fullname: str = None,
    email: str = None,
    department: str = None,
    role: str = None,
    current_admin: User = Depends(get_current_admin)
):
    """
    Admin views the list of all users.
    """
    users = await User.all().order_by("user_id")
    filtered_users = filter_by_user(
        users=users,
        fullname=fullname, 
        email=email, 
        department=department, 
        role=role
    )
    return [
        {
            "user_id": user.user_id,
            "fullname": user.fullname,
            "email": user.email,
            "department": user.department,
            "role": user.role,
            "face_url": user.face_url
        }
        for user in filtered_users
    ]
    

@router.post("/", response_model=dict)
async def create_user(
    username: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    fullname: str = Form(...),
    email: str = Form(...),
    department: str = Form(...),
    face_image: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin)
):
    """
    Admin creates a new user.
    """
    try:
        await validate_data(
            username=username,
            password=password,
            role=role,
            email=email,
        )
        result = await upload_image(face_image, folder="faces")
        user = await User.create(
            username=username,
            password_hash=get_password_hash(password),
            role=role,
            fullname=fullname,
            email=email,
            department=department,
            face_url=result["secure_url"],
            face_public_id=result["public_id"]
        )
        response_data = {
            "user_id": user.user_id,
            "username": user.username,
            "role": user.role,
            "fullname": user.fullname,
            "email": user.email,
            "department": user.department,
            "face_url": user.face_url,
            "face_public_id": user.face_public_id
        }
        return response_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )
    

@router.put("/{user_id}")
async def update_user(
    user_id: int,
    username: str = None,
    password: str = None,
    role: str = None,
    fullname: str = None,
    email: str = None,
    department: str = None,
    face_image: UploadFile = File(None),
    current_admin: User = Depends(get_current_admin)
):
    """
    Admin updates user information.
    """    
    user = await get_user_by_id(user_id=user_id)
    if username and username != user.username:
        await validate_data(username=username)
        user.username = username
    if password and get_password_hash(password) != user.password_hash:
        await validate_data(password=password)
        user.password_hash = get_password_hash(password)
    if role and role != user.role:
        await validate_data(role=role)
        user.role = role
    if fullname and fullname != user.fullname:
        user.fullname = fullname
    if email and email != user.email:
        await validate_data(email=email)
        user.email = email
    if department and department != user.department:
        user.department = department
    if face_image:        
        try:
            result = await upload_image(face_image, folder="faces")
            if user.face_public_id:
                delete_image(user.face_public_id)
            user.face_url = result["secure_url"]
            user.face_public_id = result["public_id"]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update face image: {str(e)}"
            )
    await user.save()
    return {
        "user_id": user.user_id,
        "username": user.username,
        "role": user.role,
        "fullname": user.fullname,
        "email": user.email,
        "department": user.department,
        "face_url": user.face_url,
        "face_public_id": user.face_public_id
    }


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin)
):
    """
    Admin deletes a user.
    """
    try:
        user = await get_user_by_id(user_id=user_id)
        delete_image(user.face_public_id)
        await user.delete()
        return {"message": "User deleted successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )


@router.get("/attendance", response_model=List[dict])
async def get_daily_attendance(
    year: int = None,
    month: int = None,
    day: int = None,
    status: str = None,
    fullname: str = None,
    email: str = None,
    department: str = None,
    current_admin: User = Depends(get_current_admin)
):
    """
    Admin views daily attendance records.
    """
    attendances = await Attendance.all().order_by("-date").prefetch_related("user")
    filtered_attendances = filter_by_attendance(
        attendances,
        day=day,
        month=month,
        year=year,
        status=status
    )
    users = [att.user for att in filtered_attendances]
    filtered_users = filter_by_user(
        users=users,
        fullname=fullname,
        email=email,
        department=department
    )
    return [
        {
            "attendance_id": att.attendance_id,
            "user_id": att.user.user_id,
            "fullname": att.user.fullname,
            "email": att.user.email,
            "department": att.user.department,
            "date": att.date,
            "time": att.time,
            "status": att.status
        }
        for att in filtered_attendances if att.user in filtered_users
    ]


@router.get("/attendance/{user_id}", response_model=List[dict])
async def get_user_attendance(
    user_id: int,
    year: int = None,
    month: int = None,
    day: int = None,
    status: str = None,
    current_admin: User = Depends(get_current_admin)
):
    """
    Admin views the attendance records of a specific user by ID.
    """
    user = await get_user_by_id(user_id=user_id)
    attendances = await Attendance.filter(user=user).order_by("-date")
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
