import { useEffect, useState } from "react";
import { Camera, Loader2, Save } from "lucide-react";
import { nationalIdIssue } from "../../utils/nationalId";
import { getProfile, updateProfile } from "../../api/auth.api";
import { uploadShipmentPhotos } from "../../api/upload.api";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Avatar from "../../components/common/Avatar";
import { toEnglishDigits } from "../../utils/digits";
import { getErrorMessage } from "../../utils/errorMessage";

export default function Profile() {
  const { updateUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    national_id: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const applyProfile = (data) => {
    setProfile(data);
    setForm({
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      company_name: data.company_name || "",
      national_id: data.national_id || "",
    });
    updateUser(data);
  };

  useEffect(() => {
    getProfile()
      .then(applyProfile)
      .catch((err) =>
        setError(
          getErrorMessage(err, "دریافت اطلاعات پروفایل با خطا مواجه شد."),
        ),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();

    const nationalIssue = nationalIdIssue(form.national_id);
    if (nationalIssue) {
      setError(nationalIssue);
      return;
    }

    setError("");
    setSaving(true);

    try {
      const data = await updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        company_name: form.company_name.trim(),
        national_id: form.national_id,
      });

      applyProfile(data);
      toast.success("تغییرات پروفایل ذخیره شد.");
    } catch (err) {
      setError(getErrorMessage(err, "ذخیره‌ی پروفایل با خطا مواجه شد."));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    setUploading(true);

    try {
      const [url] = await uploadShipmentPhotos([file]);
      const data = await updateProfile({ avatar_url: url });
      setProfile(data);
      updateUser(data);
      toast.success("عکس پروفایل به‌روز شد.");
    } catch (err) {
      toast.error(getErrorMessage(err, "بارگذاری عکس با خطا مواجه شد."));
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploading(true);

    try {
      const data = await updateProfile({ avatar_url: "" });
      setProfile(data);
      updateUser(data);
      toast.success("عکس پروفایل حذف شد.");
    } catch (err) {
      toast.error(getErrorMessage(err, "حذف عکس با خطا مواجه شد."));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <p className="py-20 text-center text-sm text-ink-300">
        در حال بارگذاری...
      </p>
    );
  }

  const displayName = `${form.first_name} ${form.last_name}`.trim();
  const hasPhoto = Boolean(profile?.avatar_url);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900">پروفایل</h1>
        <p className="mt-1 text-sm text-ink-300">
          اطلاعات حساب کاربری خود را مشاهده و ویرایش کنید
        </p>
      </div>

      <div className="mb-6 flex flex-col items-center gap-5 rounded-xl border border-ink-100 bg-white p-6 shadow-panel sm:flex-row">
        <Avatar
          size="lg"
          avatarUrl={profile?.avatar_url}
          firstName={form.first_name}
          lastName={form.last_name}
        />

        <div className="min-w-0 flex-1 text-center sm:text-right">
          <p className="truncate text-lg font-bold text-ink-900">
            {displayName || "—"}
          </p>

          {form.company_name && (
            <p className="mt-0.5 truncate text-sm text-ink-400">
              {form.company_name}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink-200 px-3.5 py-2 text-xs text-ink-400 transition-colors hover:border-amber-400 hover:text-amber-600">
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}

              {hasPhoto ? "تغییر عکس" : "بارگذاری عکس"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handlePhotoChange}
                disabled={uploading}
              />
            </label>

            {hasPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={uploading}
                className="text-xs text-ink-300 transition-colors hover:text-red-600 disabled:opacity-50"
              >
                حذف عکس
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-panel">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="نام"
              value={form.first_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, first_name: e.target.value }))
              }
              maxLength={50}
              required
            />

            <Input
              label="نام خانوادگی"
              value={form.last_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, last_name: e.target.value }))
              }
              maxLength={50}
              required
            />

            <Input
              label="نام شرکت (اختیاری)"
              value={form.company_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, company_name: e.target.value }))
              }
              maxLength={100}
            />

            <Input
              label="کد ملی"
              required
              hint="کد ملی ۱۰ رقمی شما؛ صفر ابتدایی حفظ می‌شود."
              value={form.national_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  national_id: toEnglishDigits(e.target.value)
                    .replace(/\D/g, "")
                    .slice(0, 10),
                }))
              }
              inputMode="numeric"
              dir="ltr"
              className="tabular text-left"
            />

            <Input
              label="شماره موبایل"
              value={profile?.phone_number || ""}
              readOnly
              disabled
              hint="شماره موبایل با کد تأیید پیامکی ورود شما مرتبط است و قابل ویرایش نیست."
              dir="ltr"
              className="tabular text-left disabled:bg-ink-50 disabled:text-ink-400"
            />
          </div>

          <Button type="submit" variant="accent" icon={Save} loading={saving}>
            ذخیره تغییرات
          </Button>
        </form>
      </div>
    </div>
  );
}
