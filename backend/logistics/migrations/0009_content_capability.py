from django.db import migrations


def grant_full_operators(apps, schema_editor):
    User = apps.get_model("logistics", "User")
    original = {"dispatch", "finance", "crm", "verification", "monitoring"}
    for user in User.objects.filter(role="operator").iterator():
        if (
            original.issubset(set(user.capabilities))
            and "content" not in user.capabilities
        ):
            user.capabilities = [*user.capabilities, "content"]
            user.save(update_fields=["capabilities"])


class Migration(migrations.Migration):
    dependencies = [("logistics", "0008_article")]
    operations = [migrations.RunPython(grant_full_operators, migrations.RunPython.noop)]
