from django.contrib.admin.apps import AdminConfig


class AlamutAdminConfig(AdminConfig):
    default_site = "logistics.admin_site.AlamutAdminSite"
