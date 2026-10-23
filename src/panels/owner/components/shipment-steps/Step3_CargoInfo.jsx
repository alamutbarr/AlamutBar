import Step3_CargoType from "./Step3_CargoType";
import Step4_Weight from "./Step4_Weight";
import Step5_Dimensions from "./Step5_Dimensions";

// صفحه‌ی واحد «اطلاعات کالا»: همان سه صفحه‌ی قبلی (نوع کالا، وزن، ابعاد) بدون تغییر منطق،
// به‌ترتیب زیر هم. <form> باعث می‌شود Enter بین فیلدهای هر سه بخش جابه‌جا شود
// (Input و SearchableSelect هر دو ابتدا closest("form") را برای پیدا کردن فیلد بعدی می‌گیرند).
export default function Step3_CargoInfo({ data, onChange }) {
  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-8">
      <Step3_CargoType data={data} onChange={onChange} />
      <div className="border-t border-ink-100 pt-8">
        <Step4_Weight data={data} onChange={onChange} />
      </div>
      <div className="border-t border-ink-100 pt-8">
        <Step5_Dimensions data={data} onChange={onChange} />
      </div>
    </form>
  );
}