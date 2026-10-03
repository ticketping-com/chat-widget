"""Runs a Python token route with a fixed clock and prints one JSON line.

Called by ../check.ts, once per example (their module names overlap), with
TICKETPING_IDENTITY_SECRET and TP_NOW set.
"""

import importlib.util
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NOW = int(os.environ["TP_NOW"])
USER = {"id": 123, "email": "ada@acme.com", "first_name": "Ada", "last_name": "Lovelace"}


def emit(example, **fields):
    print(json.dumps({"example": example, **fields}), flush=True)


def missing(*modules):
    return [m for m in modules if importlib.util.find_spec(m) is None]


def run_django():
    import django
    from django.conf import settings

    sys.path.insert(0, str(ROOT / "django"))
    settings.configure(
        TICKETPING_IDENTITY_SECRET=os.environ["TICKETPING_IDENTITY_SECRET"],
        INSTALLED_APPS=["django.contrib.auth", "django.contrib.contenttypes"],
        DATABASES={},
        ROOT_URLCONF="ticketping.urls",
    )
    django.setup()
    from django.contrib.auth.models import AnonymousUser, User
    from django.test import RequestFactory
    from django.urls import resolve

    view = resolve("/api/ticketping-token").func
    user = User(
        pk=USER["id"],
        email=USER["email"],
        first_name=USER["first_name"],
        last_name=USER["last_name"],
    )

    request = RequestFactory().post("/api/ticketping-token")
    request.user = AnonymousUser()
    anonymous_status = view(request).status_code

    request = RequestFactory().post("/api/ticketping-token")
    request.user = user
    response = view(request)
    return response.status_code, response.content.decode(), anonymous_status


def run_django_drf():
    import django
    from django.conf import settings

    sys.path.insert(0, str(ROOT / "django"))
    settings.configure(
        TICKETPING_IDENTITY_SECRET=os.environ["TICKETPING_IDENTITY_SECRET"],
        INSTALLED_APPS=["django.contrib.auth", "django.contrib.contenttypes", "rest_framework"],
        DATABASES={},
        REST_FRAMEWORK={"UNAUTHENTICATED_USER": "django.contrib.auth.models.AnonymousUser"},
    )
    django.setup()
    from django.contrib.auth.models import User
    from rest_framework.test import APIRequestFactory, force_authenticate

    from ticketping.views_drf import ticketping_token

    factory = APIRequestFactory()
    anonymous_status = ticketping_token(factory.post("/api/ticketping-token")).status_code

    user = User(
        pk=USER["id"],
        email=USER["email"],
        first_name=USER["first_name"],
        last_name=USER["last_name"],
    )
    request = factory.post("/api/ticketping-token")
    force_authenticate(request, user=user)
    response = ticketping_token(request)
    return response.status_code, response.content.decode(), anonymous_status


def run_fastapi():
    sys.path.insert(0, str(ROOT / "fastapi"))
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from app.auth import get_current_user
    from app.ticketping import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    anonymous_status = client.post("/api/ticketping-token").status_code

    class FakeUser:
        id = USER["id"]
        email = USER["email"]
        name = f'{USER["first_name"]} {USER["last_name"]}'

    app.dependency_overrides[get_current_user] = lambda: FakeUser()
    response = client.post("/api/ticketping-token")
    return response.status_code, response.text, anonymous_status


def run_flask():
    sys.path.insert(0, str(ROOT / "flask"))
    from flask import Flask
    from flask_login import LoginManager, UserMixin

    from ticketping import ticketping

    class FakeUser(UserMixin):
        id = USER["id"]
        email = USER["email"]
        name = f'{USER["first_name"]} {USER["last_name"]}'

    app = Flask(__name__)
    app.secret_key = "test"
    login_manager = LoginManager(app)
    signed_in = {"user": None}
    login_manager.request_loader(lambda request: signed_in["user"])
    app.register_blueprint(ticketping)
    client = app.test_client()

    anonymous_status = client.post("/api/ticketping-token").status_code
    signed_in["user"] = FakeUser()
    response = client.post("/api/ticketping-token")
    return response.status_code, response.get_data(as_text=True), anonymous_status


EXAMPLES = {
    "django": (("jwt", "django"), run_django),
    "django-drf": (("jwt", "django", "rest_framework"), run_django_drf),
    "fastapi": (("jwt", "fastapi", "httpx"), run_fastapi),
    "flask": (("jwt", "flask", "flask_login"), run_flask),
}

if __name__ == "__main__":
    time.time = lambda: NOW
    for name in sys.argv[1:]:
        modules, run = EXAMPLES[name]
        absent = missing(*modules)
        if absent:
            emit(name, skip=f"Python packages not installed: {', '.join(absent)}")
            continue
        try:
            status, body, anonymous_status = run()
            emit(name, status=status, token=body.strip(), anonymousStatus=anonymous_status)
        except Exception as exc:  # report and keep checking the other examples
            emit(name, error=f"{type(exc).__name__}: {exc}")
