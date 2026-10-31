import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import Input from '../common/Input';
import StepHeader from './StepHeader';
import { uploadShipmentPhotos } from '../../api/upload.api';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errorMessage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTOS = 4;
const MAX_SIZE_MB = 4;

function photoSrc(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return url;
}

export default function Step7_PhotosNotes({ data, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [localPreviews, setLocalPreviews] = useState([]);
  const localPreviewsRef = useRef([]);
  localPreviewsRef.current = localPreviews;
  const toast = useToast();
  const photos = data.photo_urls || [];

  useEffect(() => () => {
    localPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const handleFiles = async (e) => {
    const remaining = MAX_PHOTOS - photos.length;
    const files = Array.from(e.target.files || []).slice(0, remaining);
    if (files.length === 0) return;

    const invalid = files.find(
      (f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_SIZE_MB * 1024 * 1024
    );
    if (invalid) {
      toast.error(`فایل «${invalid.name}» باید تصویر JPG/PNG/WEBP و کمتر از ${MAX_SIZE_MB} مگابایت باشد.`);
      e.target.value = '';
      return;
    }

    const blobs = files.map((file) => URL.createObjectURL(file));
    setLocalPreviews((current) => [...current, ...blobs]);
    setUploading(true);
    try {
      const urls = await uploadShipmentPhotos(files);
      onChange('photo_urls', [...photos, ...urls]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'بارگذاری تصویر با خطا مواجه شد.'));
    } finally {
      blobs.forEach((url) => URL.revokeObjectURL(url));
      setLocalPreviews((current) => current.filter((url) => !blobs.includes(url)));
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (url) => {
    onChange('photo_urls', photos.filter((p) => p !== url));
  };

  const tiles = [
    ...photos.map((url) => ({ key: url, src: photoSrc(url), uploaded: true })),
    ...localPreviews.map((url) => ({ key: url, src: url, uploaded: false })),
  ];

  return (
    <div className="space-y-5">
      <StepHeader
        title="عکس و توضیحات تکمیلی"
        description={`تا ${MAX_PHOTOS.toLocaleString('fa-IR')} عکس از کالا بفرستید. پیش‌نمایش همان‌جا دیده می‌شود. سقف هر عکس ${MAX_SIZE_MB.toLocaleString('fa-IR')} مگابایت است.`}
      />

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-700">عکس‌های کالا</span>
        <p className="mb-2 text-xs text-ink-300">
          {photos.length.toLocaleString('fa-IR')} از {MAX_PHOTOS.toLocaleString('fa-IR')} عکس
        </p>
        <div className="flex flex-wrap gap-3">
          {tiles.map((tile) => (
            <div key={tile.key} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-ink-100 bg-[#f7f6f0]">
              <img src={tile.src} alt="پیش‌نمایش کالای بارگذاری‌شده" className="h-full w-full object-cover" />
              {tile.uploaded && (
                <button
                  type="button"
                  onClick={() => removePhoto(tile.key)}
                  className="absolute inset-0 flex items-center justify-center bg-ink-950/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-100 text-ink-300 transition-colors hover:border-amber-400 hover:text-amber-600">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              <span className="text-[10px]">افزودن</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleFiles} disabled={uploading} />
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
