from django.urls import path

from . import views

urlpatterns = [
    path("api/ticketping-token", views.ticketping_token, name="ticketping-token"),
]
