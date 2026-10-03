import os
import time

import jwt
from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse

from app.auth import get_current_user

router = APIRouter()


@router.post("/api/ticketping-token", response_class=PlainTextResponse)
def ticketping_token(user=Depends(get_current_user)):
    claims = {"sub": str(user.id), "exp": int(time.time()) + 300}
    if user.email:
        claims["email"] = user.email
    if user.name:
        claims["name"] = user.name

    return jwt.encode(claims, os.environ["TICKETPING_IDENTITY_SECRET"], algorithm="HS256")
