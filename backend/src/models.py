from tortoise.models import Model
from tortoise import fields


class User(Model):
    user_id = fields.IntField(pk=True, generated=True)
    username = fields.CharField(max_length=50, unique=True)
    password_hash = fields.CharField(max_length=255)
    role = fields.CharField(max_length=20)
    fullname = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255, unique=True)
    department = fields.CharField(max_length=255)
    face_url = fields.CharField(max_length=255, unique=True)
    face_public_id = fields.CharField(max_length=255, unique=True)
    class Meta:
        table = "users"


class Attendance(Model):
    attendance_id = fields.IntField(pk=True, generated=True)
    user = fields.ForeignKeyField("models.User", related_name="attendances", on_delete=fields.CASCADE)
    date = fields.DateField()
    time = fields.TimeField(null=True)
    status = fields.CharField(max_length=20, default="Pending")
    class Meta:
        table = "attendances"
