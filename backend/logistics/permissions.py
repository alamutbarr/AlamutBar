from rest_framework.permissions import BasePermission

CAPABILITY_PATHS = [
    ("/api/editorial/", "content"),
    ("/api/crm/", "crm"),
    ("/api/invoices/", "finance"),
    ("/api/control-room/", "monitoring"),
    ("/api/operations/", "monitoring"),
    ("/api/drivers/", "verification"),
    ("/api/credentials/", "verification"),
    ("/api/shipments/", "dispatch"),
    ("/api/documents/", "dispatch"),
    ("/api/incidents/", "dispatch"),
]


class RolePermission(BasePermission):
    message = "به این بخش از عملیات دسترسی ندارید."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role != "operator":
            return True
        if user.is_superuser and request.path.startswith(
            ("/api/drivers/", "/api/credentials/")
        ):
            return True
        if request.path.startswith("/api/team/"):
            return (
                bool(set(user.capabilities) & {"verification", "dispatch"})
                if request.method in ["GET", "HEAD", "OPTIONS"]
                else "verification" in user.capabilities
            )
        for path, capability in CAPABILITY_PATHS:
            if request.path.startswith(path):
                return capability in user.capabilities
        return True
