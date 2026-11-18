import json
from django.core.mail.backends.base import BaseEmailBackend
from .models import OutboundEmail
from .security import encrypt


class OutboxBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        count = 0
        for message in email_messages:
            OutboundEmail.objects.create(
                payload=encrypt(
                    json.dumps(
                        {
                            "to": message.to,
                            "subject": message.subject,
                            "body": message.body,
                            "from_email": message.from_email,
                        }
                    )
                )
            )
            count += 1
        return count
