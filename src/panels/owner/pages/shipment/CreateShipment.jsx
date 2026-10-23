import { useState } from "react";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createShipment } from "../../api/shipment.api";
import Button from "../../components/common/Button";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../utils/errorMessage";

import Step1_Origin from "../../components/shipment-steps/Step1_Origin";
import Step2_Destination from "../../components/shipment-steps/Step2_Destination";
import Step3_CargoInfo from "../../components/shipment-steps/Step3_CargoInfo";
import Step6_Insurance from "../../components/shipment-steps/Step6_Insurance";
import Step7_PhotosNotes from "../../components/shipment-steps/Step7_PhotosNotes";
import Step8_DateUrgency from "../../components/shipment-steps/Step8_DateUrgency";
import Step9_Vehicle from "../../components/shipment-steps/Step9_Vehicle";
import Step10_HandlingMethods from "../../components/shipment-steps/Step10_HandlingMethods";
import Step11_Contact from "../../components/shipment-steps/Step11_Contact";
import Step12_Confirm from "../../components/shipment-steps/Step12_Confirm";
import Step13_Done from "../../components/shipment-steps/Step13_Done";
import {
  isValidIranNationalId,
  isValidIranPostalCode,
} from "../../utils/receiverValidation";

const STEPS = [
  { title: "مبدأ", Component: Step1_Origin },
  { title: "مقصد", Component: Step2_Destination },
  { title: "اطلاعات کالا", Component: Step3_CargoInfo },
  { title: "ارزش کالا", Component: Step6_Insurance },
  { title: "عکس و توضیح", Component: Step7_PhotosNotes },
  { title: "زمان", Component: Step8_DateUrgency },
  { title: "خودرو", Component: Step9_Vehicle },
  { title: "بارگیری/تخلیه", Component: Step10_HandlingMethods },
  { title: "گیرنده", Component: Step11_Contact },
  { title: "تأیید", Component: Step12_Confirm },
  { title: "پایان", Component: Step13_Done },
];

const TOTAL_VISIBLE_STEPS = STEPS.length - 1; // بدون احتساب صفحه پایان

const REQUIRED_FIELDS_BY_STEP = {
  1: ["origin_city_id", "origin_address", "origin_lat", "origin_lng"],
  2: ["dest_city_id"],
  3: ["cargo_type", "weight_kg"],
  4: ["cargo_value"],
  6: ["loading_date", "loading_time_from", "loading_time_to", "urgency"],
  7: ["vehicle_type_id", "vehicle_variants"],
  8: ["loading_method"],
  9: ["receiver_name", "receiver_phone"],
};

const emptyFormData = {
  receiver_national_id: "",
  receiver_postal_code: "",
  origin_city_id: "",
  origin_zone_id: "",
  origin_address: "",
  origin_lat: "",
  origin_lng: "",
  dest_city_id: "",
  dest_zone_id: "",
  dest_address: "",
  dest_lat: "",
  dest_lng: "",
  cargo_type: "",
  cargo_type_other: "",
  packaging_type: "",
  weight_kg: "",
  length_cm: "",
  width_cm: "",
  height_cm: "",
  cargo_value: "",
  photo_urls: [],
  notes: "",
  loading_date: "",
  loading_time_from: "",
  loading_time_to: "",
  loading_time_ranges: [],
  urgency: "",
  vehicle_type_id: "",
  vehicle_variants: [],
  loading_method: "",
  receiver_name: "",
  receiver_phone: "",
  proposed_price: "",
  trackingCode: "",
};

export default function CreateShipment() {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [direction, setDirection] = useState(1);
  const [stepError, setStepError] = useState("");
  const toast = useToast();
  const [formData, setFormData] = useState(emptyFormData);

  const updateFormData = (key, value) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  // حداقل ارزش کالا: ۱۰,۰۰۰,۰۰۰ تومان = ۱۰۰,۰۰۰,۰۰۰ ریال
  const MIN_CARGO_VALUE_RIAL = 100000000;

  const isStepValid = (stepNum) => {
    const required = REQUIRED_FIELDS_BY_STEP[stepNum] || [];
    const allFilled = required.every((key) => {
      const value = formData[key];
      return Array.isArray(value)
        ? value.length > 0
        : value !== "" && value !== undefined && value !== null;
    });
    if (!allFilled) return false;
    if (
      stepNum === 4 &&
      !(Number(formData.cargo_value) >= MIN_CARGO_VALUE_RIAL)
    )
      return false;
    if (stepNum === 9 && !/^09\d{9}$/.test(String(formData.receiver_phone))) {
      return false;
    }
    return true;
  };

  // پیدا کردن اولین مرحله‌ی ناقص، برای هدایت مستقیم کاربر بدون نیاز به حدس زدن
  const findFirstInvalidStep = () => {
    for (let i = 1; i <= TOTAL_VISIBLE_STEPS; i++) {
      if (!isStepValid(i)) return i;
    }
    return null;
  };

  // امکان جابه‌جایی آزاد: همیشه می‌شود به مراحل قبلی برگشت، و تا هر مرحله‌ای که قبلاً
  // با موفقیت رد شده هم می‌شود جلو رفت - بدون نیاز به یکی‌یکی «مرحله بعد» زدن
  const goToStep = (targetStep) => {
    if (targetStep === currentStep) return;
    if (targetStep < currentStep) {
      setDirection(-1);
      setStepError("");
      setCurrentStep(targetStep);
      return;
    }
    if (targetStep <= maxStepReached) {
      setDirection(1);
      setStepError("");
      setCurrentStep(targetStep);
    }
  };

  const nextStep = () => {
    if (!isStepValid(currentStep)) {
      setStepError("لطفاً فیلدهای الزامی این مرحله را تکمیل کنید.");
      return;
    }
    setStepError("");
    setDirection(1);
    const next = Math.min(currentStep + 1, STEPS.length);
    setCurrentStep(next);
    setMaxStepReached((prev) => Math.max(prev, next));
  };

  const prevStep = () => {
    setStepError("");
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // چک نهایی سرتاسری قبل از ارسال - اگر جایی ناقص مانده، مستقیم کاربر را همان‌جا می‌بریم
    const firstInvalid = findFirstInvalidStep();
    if (firstInvalid) {
      toast.error(
        `مرحله «${STEPS[firstInvalid - 1].title}» هنوز کامل نشده. شما را به آن مرحله می‌بریم.`,
      );
      setMaxStepReached((prev) => Math.max(prev, firstInvalid));
      setCurrentStep(firstInvalid);
      return;
    }

    const payload = { ...formData };
    delete payload.trackingCode;
    if (payload.cargo_type !== "other") delete payload.cargo_type_other;
    ["origin_zone_id", "dest_zone_id"].forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });
    [
      "length_cm",
      "width_cm",
      "height_cm",
      "dest_address",
      "dest_lat",
      "dest_lng",
    ].forEach((k) => {
      if (payload[k] === "") delete payload[k];
    });

    try {
      const { shipment, needsManualReview } = await createShipment(payload);
      updateFormData("trackingCode", shipment.tracking_code);
      updateFormData("needsManualReview", needsManualReview);
      toast.success("بار با موفقیت ثبت شد.");
      setCurrentStep(STEPS.length);
    } catch (err) {
      toast.error(getErrorMessage(err, "خطا در ثبت بار"));
    }
  };

  const ActiveStep = STEPS[currentStep - 1].Component;
  const isFinal = currentStep === STEPS.length;

  return (
    <div className="mx-auto max-w-2xl">
      {!isFinal && (
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink-900">ثبت بار جدید</h1>
          <p className="tabular text-sm text-ink-300">
            مرحله {currentStep} از {TOTAL_VISIBLE_STEPS}
          </p>
        </div>
      )}

      {!isFinal && (
        <RouteProgress
          current={currentStep}
          maxReached={maxStepReached}
          onStepClick={goToStep}
        />
      )}

      <div className="relative mt-6 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-panel">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 28 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="p-6 sm:p-8"
          >
            <ActiveStep
              data={formData}
              onChange={updateFormData}
              onSubmit={handleSubmit}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {stepError && !isFinal && (
        <p className="mt-3 text-center text-sm text-red-600">{stepError}</p>
      )}

      {!isFinal && currentStep < TOTAL_VISIBLE_STEPS && (
        <div className="mt-5 flex justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 1}
            icon={ChevronRight}
          >
            مرحله قبل
          </Button>
          <Button variant="accent" onClick={nextStep} icon={ChevronLeft}>
            مرحله بعد
          </Button>
        </div>
      )}

      {currentStep === TOTAL_VISIBLE_STEPS && (
        <div className="mt-5 flex justify-start">
          <Button variant="ghost" onClick={prevStep} icon={ChevronRight}>
            مرحله قبل
          </Button>
        </div>
      )}
    </div>
  );
}

function RouteProgress({ current, maxReached, onStepClick }) {
  const fillPercent = ((current - 1) / (TOTAL_VISIBLE_STEPS - 1)) * 100;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative flex items-center justify-between px-1">
        <div className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-dash-line bg-[length:18px_1px] bg-repeat-x" />
        <motion.div
          className="absolute right-1 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-amber-gradient"
          initial={false}
          animate={{ width: `${fillPercent}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
        />
        {STEPS.slice(0, TOTAL_VISIBLE_STEPS).map((step, idx) => {
          const num = idx + 1;
          const done = num < current;
          const active = num === current;
          const reachable = num <= maxReached;
          return (
            <button
              type="button"
              key={step.title}
              onClick={() => onStepClick(num)}
              disabled={!reachable}
              title={
                reachable
                  ? `برو به «${step.title}»`
                  : "هنوز به این مرحله نرسیده‌اید"
              }
              className={`relative flex flex-col items-center gap-1.5 bg-transparent ${
                reachable ? "cursor-pointer" : "cursor-not-allowed"
              }`}
            >
              <motion.span
                animate={active ? { scale: 1.12 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={`tabular flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  done
                    ? "border-ink-900 bg-ink-900 text-white"
                    : active
                      ? "border-[#087f8c] bg-[#087f8c] text-[#f7f6f0] shadow-glow"
                      : reachable
                        ? "border-ink-300 bg-white text-ink-500 hover:border-amber-400 hover:text-amber-600"
                        : "border-ink-100 bg-white text-ink-300"
                }`}
              >
                {done ? <Check size={14} /> : num}
              </motion.span>
              <span
                className={`hidden whitespace-nowrap text-[11px] lg:block ${
                  active
                    ? "font-medium text-ink-900"
                    : reachable
                      ? "text-ink-400"
                      : "text-ink-200"
                }`}
              >
                {step.title}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs font-medium text-ink-900 lg:hidden">
        {STEPS[current - 1].title}
      </p>
    </div>
  );
}
