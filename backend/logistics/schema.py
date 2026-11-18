from rest_framework import serializers


class LoginRequest(serializers.Serializer):
    code = serializers.CharField(required=False, allow_blank=True, max_length=6)
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=["owner", "driver", "operator", "inspector"], required=False
    )


class PasswordRequest(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)


class TransitionRequest(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            "approved",
            "loading",
            "in_transit",
            "delivered",
            "completed",
            "cancelled",
        ]
    )
    note = serializers.CharField(required=False, max_length=1000, allow_blank=True)


class AssignRequest(serializers.Serializer):
    driver = serializers.IntegerField(min_value=1)
    inspector = serializers.IntegerField(min_value=1)


class SettlementRequest(serializers.Serializer):
    reference = serializers.CharField(min_length=5, max_length=100)


class VerifyRequest(serializers.Serializer):
    verified = serializers.BooleanField()


class UploadRequest(serializers.Serializer):
    file = serializers.FileField()


class DetailResponse(serializers.Serializer):
    detail = serializers.CharField()


class CsrfResponse(serializers.Serializer):
    csrfToken = serializers.CharField()
    demo_enabled = serializers.BooleanField()


class HealthResponse(serializers.Serializer):
    status = serializers.CharField()
    service = serializers.CharField()
    database = serializers.CharField()


class TrackingResponse(serializers.Serializer):
    code = serializers.CharField()
    origin = serializers.CharField()
    destination = serializers.CharField()
    status = serializers.CharField()
    updated_at = serializers.DateTimeField()
