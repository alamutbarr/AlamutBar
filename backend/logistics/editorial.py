from django.utils import timezone
from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.permissions import AllowAny
from .models import Article
from .operations import OperatorOnly
from .services import audit


class ArticleSerializer(serializers.ModelSerializer):
    body = serializers.CharField(max_length=50000)

    class Meta:
        model = Article
        exclude = ["created_by"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        status = data.get("status", getattr(self.instance, "status", "draft"))
        body = data.get("body", getattr(self.instance, "body", ""))
        if status == "published" and len(body.strip()) < 200:
            raise serializers.ValidationError(
                {"body": "متن مقاله برای انتشار باید حداقل ۲۰۰ نویسه باشد."}
            )
        return data


class EditorialViewSet(viewsets.ModelViewSet):
    permission_classes = [OperatorOnly]
    serializer_class = ArticleSerializer
    queryset = Article.objects.all()
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("q"):
            qs = qs.filter(title__icontains=self.request.query_params["q"])
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(
            created_by=self.request.user,
            published_at=serializer.validated_data.get("published_at")
            or (
                timezone.now()
                if serializer.validated_data.get("status") == "published"
                else None
            ),
        )
        audit(self.request.user, "article.create", obj)

    def perform_update(self, serializer):
        values = {}
        if (
            serializer.validated_data.get("status") == "published"
            and not serializer.instance.published_at
            and not serializer.validated_data.get("published_at")
        ):
            values["published_at"] = timezone.now()
        obj = serializer.save(**values)
        audit(self.request.user, "article.update", obj)


class PublicArticleViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = ArticleSerializer
    lookup_field = "slug"
    queryset = Article.objects.none()

    def get_queryset(self):
        qs = Article.objects.filter(
            status="published", published_at__lte=timezone.now()
        )
        q = self.request.query_params.get("q", "")
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(summary__icontains=q)
                | Q(category__icontains=q)
            )
        return qs
