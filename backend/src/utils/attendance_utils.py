from datetime import datetime
from src.models import Attendance, User
from datetime import datetime


async def initialize_attendance():
    """
    Automatically create attendance records for all users at the start of each day. 
    """
    try:
        today = datetime.now().date()
        if today.weekday() in (5, 6):
            print(f"Attendance records for {today} were not created because it's the weekend.")
            return
        existing = await Attendance.filter(date=today).exists()
        if existing:
            print(f"Attendance records for {today} already exist.")
            return
        users = await User.filter(role="User").all()
        if not users:
            print(f"No users found to create attendance records for {today}.")
            return
        created_attendance = []
        for user in users:
            created_attendance.append(Attendance(user=user, date=today, status="Pending"))
        await Attendance.bulk_create(created_attendance)
        print(f"Attendance records for {today} have been created for {len(users)} users.")
    except Exception as e:
        print(f"Error while creating attendance records: {e}")