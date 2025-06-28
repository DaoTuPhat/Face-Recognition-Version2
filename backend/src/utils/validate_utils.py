from fastapi import HTTPException, status
from src.models import User


async def validate_data(
    username: str = None,
    password: str = None,
    role: str = None,
    email: str = None
):
    if username is not None:
        if len(username) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be at least 8 characters long."
            )
        if await User.filter(username=username).exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists."
            )
    if password is not None:
        if len(password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long."
            )
    if role is not None:
        if role not in ["User", "Admin"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role."
            )
    if email is not None:
        if await User.filter(email=email).exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists."
            )