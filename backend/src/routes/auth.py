from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from src.utils.auth_utils import verify_password, create_access_token, get_current
from src.models import User


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Log in and return a JWT token if the credentials are valid.
    """
    try:
        user = await User.get_or_none(username=form_data.username)
        if not user or not verify_password(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username or password is incorrect."
            )
        try:
            access_token = create_access_token(data={"sub": user.username})
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not generate access token."
            )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user.role
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred."
        )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current)):
    """
    Log out and clear the token on the client side.
    """
    return {"message": "Logout successful", "user": current_user.username}