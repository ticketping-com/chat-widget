import os
import time

import jwt
from flask import Blueprint
from flask_login import current_user, login_required

ticketping = Blueprint("ticketping", __name__)


@ticketping.post("/api/ticketping-token")
@login_required
def ticketping_token():
    claims = {"sub": str(current_user.id), "exp": int(time.time()) + 300}
    if current_user.email:
        claims["email"] = current_user.email
    if current_user.name:
        claims["name"] = current_user.name

    token = jwt.encode(claims, os.environ["TICKETPING_IDENTITY_SECRET"], algorithm="HS256")
    return token, 200, {"Content-Type": "text/plain"}
