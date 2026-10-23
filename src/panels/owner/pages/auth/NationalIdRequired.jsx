import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Contact } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { updateProfile } from "../../api/auth.api";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import AuthShell from "./AuthShell";
import { getErrorMessage } from "../../utils/errorMessage";
import { toEnglishDigits } from "../../utils/digits";
import { isValidNationalId, nationalIdIssue } from "../../utils/nationalId";

export default function NationalIdRequired() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [nationalId, setNationalId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isValidNationalId(user.national_id)) {
      navigate("/owner/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const issue = nationalIdIssue(nationalId);
    if (issue) {
      setError(issue);
      return;
    }

    setLoading(true);

    try {
      const data = await updateProfile({ national_id: nationalId });
      updateUser(data);
      navigate("/owner/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "ذخیره کد ملی با خطا مواجه شد."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="کد ملی خود را وارد کنید"
      subtitle="برای ادامه استفاده از حساب، وارد کردن کد ملی معتبر الزامی است."
    >
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="کد ملی"
          icon={Contact}
          dir="ltr"
          className="tabular text-left"
          maxLength={10}
          inputMode="numeric"
          value={nationalId}
          onChange={(e) =>
            setNationalId(
              toEnglishDigits(e.target.value)
                .replace(/[^\d]/g, "")
                .slice(0, 10),
            )
          }
          placeholder="0499370899"
          autoFocus
          required
        />

        <Button
          type="submit"
          variant="accent"
          size="lg"
          loading={loading}
          className="w-full"
        >
          ذخیره و ادامه
        </Button>
      </form>
    </AuthShell>
  );
}
