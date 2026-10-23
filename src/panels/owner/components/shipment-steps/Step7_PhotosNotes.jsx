import { useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import Input from '../common/Input';
import StepHeader from './StepHeader';
import { uploadShipmentPhotos } from '../../api/upload.api';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errorMessage';

export default function Step7_PhotosNotes({ data, onChange }) {
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const photos = data.photo_urls || [];

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE_MB = 5;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - photos.length);
    if (files.length === 0) return;

    const invalid = files.find(
      (f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_SIZE_MB * 1024 * 1024
    );
    if (invalid) {
      toast.error(`فایل «${invalid.name}» باید تصویر JPG/PNG/WEBP و کمتر از ${MAX_SIZE_MB} مگابایت باشد.`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const urls = await uploadShipmentPhotos(files);
      onChange('photo_urls', [...photos, ...urls]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'بارگذاری تصویر با خطا مواجه شد.'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (url) => {
    onChange('photo_urls', photos.filter((p) => p !== url));
  };

  return (
    <div className="space-y-5">
      <StepHeader title="عکس و توضیحات تکمیلی" description="این مرحله اختیاری است؛ حداکثر ۵ عکس از کالا آپلود کنید." />

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-700">عکس‌های کالا</span>
        <div className="flex flex-wrap gap-3">
          {photos.map((url) => (
            <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-ink-100">
              <img src={`http://localhost:5000${url}`} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                className="absolute inset-0 flex items-center justify-center bg-ink-950/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {photos.length < 5 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-100 text-ink-300 transition-colors hover:border-amber-400 hover:text-amber-600">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              <span className="text-[10px]">افزودن</span>
              <input type="file" accept="image/*" multiple hidden onChange={handleFiles} disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      <Input
        as="textarea"
        rows={3}
        label="توضیحات تکمیلی (اختیاری)"
        value={data.notes || ''}
        onChange={(e) => onChange('notes', e.target.value)}
        placeholder="نکات مهم درباره جابه‌جایی یا نگهداری کالا"
      />
    </div>
  );
}
