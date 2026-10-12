import { Truck, Plus, Weight, Ruler, Calendar, Fuel, CircleDot, ShieldCheck, ShieldAlert, ShieldX, } from 'lucide-react';
export function DriverVehicles({ vehicles }) {
    return (<div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">خودروها</h2>
        <button className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-95">
          <Plus className="w-4 h-4"/>
          افزودن خودرو
        </button>
      </div>

      {vehicles.map((v) => (<VehicleCard key={v.id} vehicle={v}/>))}

      {vehicles.length === 0 && (<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3"/>
          <p className="text-sm text-slate-500">هنوز خودرویی ثبت نشده است</p>
        </div>)}
    </div>);
}
function VehicleCard({ vehicle }) {
    const verifyConfig = {
        verified: { icon: <ShieldCheck className="w-4 h-4"/>, cls: 'text-green-600 bg-green-50 border-green-200', text: 'تأیید شده' },
        pending: { icon: <ShieldAlert className="w-4 h-4"/>, cls: 'text-amber-600 bg-amber-50 border-amber-200', text: 'در انتظار تأیید' },
        rejected: { icon: <ShieldX className="w-4 h-4"/>, cls: 'text-red-600 bg-red-50 border-red-200', text: 'رد شده' },
    };
    const vc = verifyConfig[vehicle.verifiedStatus];
    return (<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Truck className="w-6 h-6"/>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{vehicle.typeName}</h3>
            <p className="text-xs text-slate-500" dir="ltr">{vehicle.plate}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${vc.cls}`}>
            {vc.icon}
            {vc.text}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${vehicle.active
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
            <CircleDot className="w-3 h-3"/>
            {vehicle.active ? 'فعال' : 'غیرفعال'}
          </span>
        </div>
      </div>

      {/* Specs */}
      <div className="grid grid-cols-2 gap-2">
        <SpecItem icon={<Weight className="w-3.5 h-3.5"/>} label="ظرفیت" value={`${new Intl.NumberFormat('fa-IR').format(vehicle.capacityTons)} تن`}/>
        <SpecItem icon={<Ruler className="w-3.5 h-3.5"/>} label="حجم" value={`${new Intl.NumberFormat('fa-IR').format(vehicle.volumeM3)} م³`}/>
        <SpecItem icon={<CircleDot className="w-3.5 h-3.5"/>} label="محور" value={`${new Intl.NumberFormat('fa-IR').format(vehicle.techSpec.axleCount)} محور`}/>
        <SpecItem icon={<Fuel className="w-3.5 h-3.5"/>} label="سوخت" value={vehicle.techSpec.fuelType}/>
        <SpecItem icon={<Calendar className="w-3.5 h-3.5"/>} label="سال ساخت" value={new Intl.NumberFormat('fa-IR').format(vehicle.techSpec.year)}/>
        <SpecItem icon={<ShieldCheck className="w-3.5 h-3.5"/>} label="انقضای بیمه" value={vehicle.techSpec.insuranceExpiry}/>
      </div>
    </div>);
}
function SpecItem({ icon, label, value }) {
    return (<div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-700">{value}</span>
    </div>);
}
