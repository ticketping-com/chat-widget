from fastapi import HTTPException


def get_current_user():
    """Stands in for your app's existing auth dependency."""
    raise HTTPException(status_code=401)
