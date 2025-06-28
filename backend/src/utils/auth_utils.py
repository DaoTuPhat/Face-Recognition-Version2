from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from src.models import User


SECRET_KEY = "09c7abd667cb028c0ba6c0064752633d65a0cd4a2a8be0a585c44fc72078ad07"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# OAuth2 configuration to retrieve token from the header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify if the entered password matches the hashed password.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash the user password for storing in the database.
    """
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    """
    Create a JWT token with expiration time.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current(token: str = Depends(oauth2_scheme)) -> User:
    """
    Get the current user or admin from the JWT token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User information not found in token"
            )
        user = await User.get_or_none(username=username)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="User does not exist in the system"
            )
        return user
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


async def get_current_user(current_user: User = Depends(get_current)) -> User:
    """
    Get the current user.
    """
    if current_user.role != "User":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only users are allowed to access this resource"
        )
    return current_user


async def get_current_admin(current_user: User = Depends(get_current)) -> User:
    """
    Get the current admin.
    """
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only administrators are allowed to access this resource")
    return current_user