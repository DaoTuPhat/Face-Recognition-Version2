from fastapi import HTTPException, status
from src.models import User, Attendance
from typing import List


async def get_user_by_id(user_id: int) -> User:
    """
    Get user information by ID.
    """
    user = await User.get_or_none(user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
    return user


def filter_by_attendance(
    attendances: List[Attendance],
    day: int = None,
    month: int = None,
    year: int = None,
    status: str = None
) -> List:
    """
    Filter attendance records by day, month, year, and status.
    """
    filtered_attendances = []
    for att in attendances:
        if day is not None and att.date.day != day:
            continue
        if month is not None and att.date.month != month:
            continue
        if year is not None and att.date.year != year:
            continue
        if status is not None and att.status.lower() != status.lower():
            continue
        filtered_attendances.append(att)
    return filtered_attendances


def filter_by_user(
    users: List[User],
    fullname: str = None,
    role: str = None,
    email: str = None,
    department: str = None
) -> List:
    """
    Filter user list by full name, role, email, and department.
    """
    filtered_users = []
    for user in users:
        if fullname and fullname.lower() not in user.fullname.lower():
            continue
        if role and role.lower() not in user.role.lower():
            continue
        if email and email.lower() not in user.email.lower():
            continue
        if department and department.lower() not in user.department.lower():
            continue
        filtered_users.append(user)
    return filtered_users