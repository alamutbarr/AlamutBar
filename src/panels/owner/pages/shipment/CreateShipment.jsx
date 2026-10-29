import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
  { title: "بارگیری", Component: Step10_HandlingMethods },
  { title: "گیرنده", Component: Step11_Contact },
  { title: "تأیید", Component: Step12_Confirm },
  { title: "پایان", Component: Step13_Done },
];

const TOTAL_VISIBLE_STEPS = STEPS.length - 1; // بدون احتساب صفحه پایان

const REQUIRED_FIELDS_BY_STEP = {
  1: ["origin_city_id", "origin_address", "origin_lat", "origin_lng"],
  2: ["dest_city_id", "dest_lat", "dest_lng"],
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
  origin_city_name: "",
  origin_zone_id: "",
  origin_address: "",
  origin_lat: "",
  origin_lng: "",
  dest_city_id: "",
  dest_city_name: "",
  dest_zone_id: "",
  dest_address: "",
  dest_lat: "",
  dest_lng: "",
  cargo_type: "",
  cargo_type_other: "",
  packaging_type: "",
  weight_kg: "",
  piece_count: "",
  requires_inspector: false,
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

function formFromShipment(shipment) {
  if (!shipment) return emptyFormData;
  const date = shipment.loading_date ? String(shipment.loading_date).slice(0, 10) : "";
  return {
    ...emptyFormData,
    origin_city_id: shipment.origin_city_id || "",
    origin_city_name: shipment.originCity?.name || "",
    origin_zone_id: shipment.origin_zone_id || "",
    origin_address: shipment.origin_address || "",
    origin_lat: shipment.origin_lat ?? "",
    origin_lng: shipment.origin_lng ?? "",
    dest_city_id: shipment.dest_city_id || "",
    dest_city_name: shipment.destCity?.name || "",
    dest_zone_id: shipment.dest_zone_id || "",
    dest_address: shipment.dest_address || "",
    dest_lat: shipment.dest_lat ?? "",
    dest_lng: shipment.dest_lng ?? "",
    cargo_type: shipment.cargo_type || "",
    cargo_type_other: shipment.cargo_type_other || "",
    packaging_type: shipment.packaging_type || "",
    weight_kg: shipment.weight_kg ?? "",
    piece_count: shipment.piece_count ?? "",
    length_cm: shipment.length_cm ?? "",
    width_cm: shipment.width_cm ?? "",
    height_cm: shipment.height_cm ?? "",
    cargo_value: shipment.cargo_value ?? "",
    notes: shipment.notes || "",
    loading_date: date,
    loading_time_from: shipment.loading_time_from || "",
    loading_time_to: shipment.loading_time_to || "",
    loading_time_ranges: Array.isArray(shipment.loading_time_ranges) ? shipment.loading_time_ranges : [],
    urgency: shipment.urgency || "",
    vehicle_type_id: shipment.vehicle_type_id || "",
    vehicle_variants: Array.isArray(shipment.vehicle_variants) ? shipment.vehicle_variants : [],
    loading_method: shipment.loading_method || "",
    receiver_name: shipment.receiver_name || "",
    receiver_phone: shipment.receiver_phone || "",
    receiver_national_id: shipment.receiver_national_id || "",
    receiver_postal_code: shipment.receiver_postal_code || "",
    proposed_price: shipment.proposed_price ?? "",
    requires_inspector: Boolean(shipment.requires_inspector),
  };
}

export default function CreateShipment() {
  const repeat = useLocation().state?.repeat;
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(repeat ? TOTAL_VISIBLE_STEPS : 1);
  const [direction, setDirection] = useState(1);
  const [stepError, setStepError] = useState("");
  const toast = useToast();
  const [formData, setFormData] = useState(() => formFromShipment(repeat));

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
      stepNum === 1 &&
      String(formData.origin_city_name || "").trim() === "تهران" &&
      !formData.origin_zone_id
    ) {
      return false;
    }
    if (
      stepNum === 2 &&
      String(formData.dest_city_name || "").trim() === "تهران" &&
      !formData.dest_zone_id
    ) {
      return false;
    }
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
      if (
        currentStep === 1 &&
        String(formData.origin_city_name || "").trim() === "تهران" &&
        !formData.origin_zone_id
      ) {
        setStepError("برای شهر تهران، محدوده مبدأ الزامی است.");
      } else if (
        currentStep === 2 &&
        String(formData.dest_city_name || "").trim() === "تهران" &&
        !formData.dest_zone_id
      ) {
        setStepError("برای شهر تهران، محدوده مقصد الزامی است.");
      } else if (
        (currentStep === 1 && !formData.origin_lat) ||
        (currentStep === 2 && !formData.dest_lat)
      ) {
        setStepError("محل را روی نقشه، داخل شهر انتخاب‌شده، مشخص کنید.");
      } else {
        setStepError("لطفاً فیلدهای الزامی این مرحله را تکمیل کنید.");
      }
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
    delete payload.origin_city_name;
    delete payload.dest_city_name;
    ["origin_zone_id", "dest_zone_id"].forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });
    [
      "piece_count",
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
    <div className="mx-auto w-full max-w-4xl">
      {!isFinal && repeat && (
        <p className="mb-4 rounded-lg border border-[#d7b56d] bg-[#f7f6f0] px-3 py-2 text-sm text-[#17383b]">
          مشخصات از حمل {repeat.tracking_code} آمده است. وزن، تعداد، زمان و مقصد را پیش از ثبت عوض کنید. اگر تاریخ بارگیری گذشته باشد، در مرحلهٔ زمان یک تاریخ تازه بگذارید.
        </p>
      )}

      {!isFinal && (
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink-900">{repeat ? "تکرار حمل" : "ثبت بار جدید"}</h1>
          <p className="text-sm text-ink-300">
            مرحلهٔ <bdi dir="ltr" className="tabular">{currentStep.toLocaleString("fa-IR")}</bdi>
            {" "}از{" "}
            <bdi dir="ltr" className="tabular">{TOTAL_VISIBLE_STEPS.toLocaleString("fa-IR")}</bdi>
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
  const fillPercent = (current / TOTAL_VISIBLE_STEPS) * 100;
  const scrollerRef = useRef(null);

  useEffect(() => {
    const root = scrollerRef.current;
    const active = root?.querySelector('[data-active="true"]');
    if (!root || !active) return;
    const nextLeft =
      active.offsetLeft - root.clientWidth / 2 + active.clientWidth / 2;
    root.scrollTo({ left: Math.max(0, nextLeft), behavior: "smooth" });
  }, [current]);

  return (
    <div className="overflow-visible rounded-2xl border border-[#d8e1dc] bg-white px-3 py-3 shadow-panel sm:px-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[#526d70]">مسیر ثبت بار</p>
          <p className="truncate text-base font-bold text-[#17383b]">
            {STEPS[current - 1].title}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#17383b] px-2.5 py-1 text-[11px] text-[#f7f6f0]">
          <bdi dir="ltr" className="tabular">{current.toLocaleString("fa-IR")}</bdi>
          {" "}از{" "}
          <bdi dir="ltr" className="tabular">{TOTAL_VISIBLE_STEPS.toLocaleString("fa-IR")}</bdi>
        </span>
      </div>

      <div className="relative mb-3 h-1.5 overflow-hidden rounded-full bg-[#e6eeea]">
        <motion.div
          className="absolute inset-y-0 right-0 rounded-full bg-amber-gradient"
          initial={false}
          animate={{ width: `${fillPercent}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {STEPS.slice(0, TOTAL_VISIBLE_STEPS).map((step, idx) => {
          const num = idx + 1;
          const done = num < current;
          const active = num === current;
          const reachable = num <= maxReached;
          return (
            <button
              type="button"
              key={step.title}
              data-active={active ? "true" : "false"}
              onClick={() => onStepClick(num)}
              disabled={!reachable}
              title={
                reachable
                  ? `برو به «${step.title}»`
                  : "هنوز به این مرحله نرسیده‌اید"
              }
              className={`flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition ${
                active
                  ? "border-[#087f8c] bg-[#087f8c] text-[#f7f6f0]"
                  : done
                    ? "border-[#17383b] bg-[#17383b] text-[#f7f6f0]"
                    : reachable
                      ? "border-[#d8e1dc] bg-[#f7f6f0] text-[#17383b] hover:border-[#087f8c]"
                      : "cursor-not-allowed border-[#e6eeea] bg-[#f7f6f0] text-[#9aada8]"
              }`}
            >
              <span
                className={`tabular flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                  active || done ? "bg-white/15" : "bg-white text-[#526d70]"
                }`}
              >
                {done ? <Check size={13} /> : num.toLocaleString("fa-IR")}
              </span>
              <span className="whitespace-nowrap font-medium">{step.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
