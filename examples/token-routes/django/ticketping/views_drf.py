import time

import jwt
from django.conf import settings
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ticketping_token(request):
    user = request.user
    claims = {"sub": str(user.pk), "exp": int(time.time()) + 300}
    if user.email:
        claims["email"] = user.email
    if user.get_full_name():
        claims["name"] = user.get_full_name()

    token = jwt.encode(claims, settings.TICKETPING_IDENTITY_SECRET, algorithm="HS256")
    return HttpResponse(token, content_type="text/plain")
