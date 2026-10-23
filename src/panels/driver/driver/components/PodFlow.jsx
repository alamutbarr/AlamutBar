import { useState, useRef } from 'react';
import { Camera, CheckCircle2, AlertCircle, Upload, KeyRound } from 'lucide-react';
export function PodFlow({ mission, onComplete, }) {
    const [step, setStep] = useState('idle');
    const [otp, setOtp] = useState('');
    const [photos, setPhotos] = useState([]);
    const [exceptionReason, setExceptionReason] = useState('');
    const [error, setError] = useState('');
    const fileRef = useRef(null);
    const canStart = mission.status === 'NearDestination' || mission.status === 'POD';
    const handleRequestOtp = () => {
        setStep('request_otp');
        setTimeout(() => {
            setStep('upload_photos');
        }, 500);
    };
    const handlePhotoSelect = (e) => {
        const files = Array.from(e.target.files || []);
        const urls = files.map((f) => URL.createObjectURL(f));
        setPhotos((prev) => [...prev, ...urls].slice(0, 5));
    };
    const handleProceedToOtp = () => {
        if (photos.length < 3) {
            setError('حداقل ۳ عکس از پلمب/بار الزامی است');
            return;
        }
        setError('');
        setStep('enter_otp');
    };
    const handleVerifyOtp = () => {
        if (otp.length !== 4) {
            setError('کد ۴ رقمی را وارد کنید');
            return;
        }
        setError('');
        setStep('done');
        onComplete({ otpVerified: true, photosUploaded: photos.length });
    };
    const handleOtpNotReceived = () => {
        setStep('otp_not_received');
    };
    const handleDeliverWithoutOtp = () => {
        if (!exceptionReason.trim()) {
            setError('ذکر دلیل تحویل بدون OTP الزامی است');
            return;
        }
        setError('');
        setStep('done');
        onComplete({
            otpVerified: false,
            photosUploaded: photos.length,
            exceptionReason: exceptionReason.trim(),
        });
    };
    if (!canStart) {
        return (<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
        <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2"/>
        <p className="text-sm text-slate-500">
          تحویل بار (POD) پس از رسیدن به شعاع ۵۰۰ متر مقصد فعال می‌شود
        </p>
      </div>);
    }
    if (step === 'done' || mission.status === 'Completed') {
        return (<div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2"/>
        <p className="text-base font-bold text-green-700">تخلیه با موفقیت ثبت شد</p>
        <p className="text-sm text-green-600 mt-1">مأموریت به پایان رسید</p>
      </div>);
    }
    return (<div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
          <KeyRound className="w-4 h-4"/>
        </div>
        <h3 className="text-sm font-bold text-slate-800">فرآیند تحویل بار (POD)</h3>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs">
        <StepDot active={step !== 'idle'} label="درخواست OTP"/>
        <div className="flex-1 h-0.5 bg-slate-200"/>
        <StepDot active={photos.length >= 3} label="عکس‌ها"/>
        <div className="flex-1 h-0.5 bg-slate-200"/>
        <StepDot active={step === 'done'} label="ورود OTP"/>
      </div>

      {error && (<div className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0"/>
          {error}
        </div>)}

      {step === 'idle' && (<button onClick={handleRequestOtp} className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600 active:scale-95">
          <KeyRound className="w-4 h-4"/>
          درخواست کد تحویل (OTP)
        </button>)}

      {step === 'request_otp' && (<div className="text-center text-sm text-slate-500 py-2">
          در حال ارسال کد به تحویل‌گیرنده...
        </div>)}

      {step === 'upload_photos' && (<div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              ثبت حداقل ۳ عکس از پلمب/بار
            </p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoSelect} className="hidden"/>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (<div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                  <img src={url} alt={`عکس ${i + 1}`} className="w-full h-full object-cover"/>
                  <span className="absolute top-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                    {new Intl.NumberFormat('fa-IR').format(i + 1)}
                  </span>
                </div>))}
              {photos.length < 5 && (<button onClick={() => fileRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition">
                  <Camera className="w-6 h-6 mb-1"/>
                  <span className="text-[10px]">افزودن</span>
                </button>)}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {new Intl.NumberFormat('fa-IR').format(photos.length)} عکس ثبت شده — حداقل ۳ مورد نیاز
            </p>
          </div>
          <button onClick={handleProceedToOtp} disabled={photos.length < 3} className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
            <Upload className="w-4 h-4"/>
            ادامه — ورود کد تحویل
          </button>
        </div>)}

      {step === 'enter_otp' && (<div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              کد ۴ رقمی تحویل را وارد کنید
            </label>
            <input type="tel" inputMode="numeric" maxLength={4} value={otp} onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''));
                setError('');
            }} placeholder="----" className="w-full text-center text-2xl font-bold tracking-[0.5em] rounded-xl border-2 border-slate-200 bg-white px-4 py-3 focus:outline-none focus:border-blue-500 transition"/>
          </div>
          <button onClick={handleVerifyOtp} className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 active:scale-95">
            <CheckCircle2 className="w-4 h-4"/>
            تأیید و ثبت تخلیه
          </button>
          <button onClick={handleOtpNotReceived} className="w-full text-center text-xs text-slate-500 hover:text-slate-700 underline">
            کد دریافت نشد؟
          </button>
        </div>)}

      {step === 'otp_not_received' && (<div className="space-y-3">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
            در حال اطلاع به اپراتور... در صورت تأیید، تحویل بدون OTP با ذکر دلیل قابل ثبت است.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              دلیل تحویل بدون OTP (الزامی)
            </label>
            <textarea value={exceptionReason} onChange={(e) => {
                setExceptionReason(e.target.value);
                setError('');
            }} rows={3} placeholder="مثال: تحویل‌گیرنده کد را دریافت نکرد و اپراتور تأیید کرد..." className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition resize-none"/>
          </div>
          <button onClick={handleDeliverWithoutOtp} className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 active:scale-95">
            <AlertCircle className="w-4 h-4"/>
            ثبت تحویل بدون OTP
          </button>
        </div>)}
    </div>);
}
function StepDot({ active, label }) {
    return (<div className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-orange-500' : 'bg-slate-300'}`}/>
      <span className={`text-[10px] ${active ? 'text-slate-700' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>);
}
