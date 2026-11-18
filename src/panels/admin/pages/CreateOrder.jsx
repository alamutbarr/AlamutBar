import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api';
import { Page } from '../components/ui';

const VARIANTS = [
  { test: (title) => title.includes('خاور') || title.includes('911'), items: ['روباز', 'بغل بازشو', 'مسقف', 'مسقف اتاق بزرگ', 'کمپرسی', 'یخچال‌دار'] },
  { test: (title) => title.includes('کامیون تک'), items: ['روباز', 'بغل بازشو', 'مسقف', 'کمپرسی', 'یخچال‌دار'] },
  { test: (title) => title.includes('کامیون جفت'), items: ['روباز', 'بغل بازشو', 'مسقف', 'کمپرسی', 'یخچال‌دار'] },
  { test: (title) => title.includes('تریلی'), items: ['کفی', 'نیم لبه', 'لبه‌دار', 'ترانزیت چادری', 'کمپرسی', 'تیغه (کانتینربر)', 'کانتینر', 'یخچال‌دار', 'کمرشکن', 'بوژی'] },
];

const empty = {
  ownerId: '',
  cargo_type_other: '',
  packaging_type: '',
  weight_kg: '',
  piece_count: '',
  length_cm: '',
  width_cm: '',
  height_cm: '',
  cargo_value: '',
  proposed_price: '',
  originQuery: '',
  destQuery: '',
  origin_city_id: '',
  dest_city_id: '',
  origin_zone_id: '',
  dest_zone_id: '',
  origin_address: '',
  dest_address: '',
  loading_date: '',
  loading_time_from: '08:00',
  loading_time_to: '12:00',
  urgency: 'scheduled',
  vehicle_type_id: '',
  vehicle_variants: [],
  loading_method: 'manual',
  unloading_method: 'manual',
  receiver_name: '',
  receiver_phone: '',
  receiver_national_id: '',
  receiver_postal_code: '',
  notes: '',
  insurance_requested: false,
  requires_inspector: false,
};

export default function CreateOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [owners, setOwners] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [dests, setDests] = useState([]);
  const [originZones, setOriginZones] = useState([]);
  const [destZones, setDestZones] = useState([]);
  const [originCity, setOriginCity] = useState(null);
  const [destCity, setDestCity] = useState(null);
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  useEffect(() => {
    api('/customers?limit=100').then((data) => setOwners(data.items || data || [])).catch(() => {});
    api('/catalog').then((data) => setVehicles(data.vehicles || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.originQuery.trim().length < 2) return undefined;
    const timer = setTimeout(() => {
      api(`/catalog?q=${encodeURIComponent(form.originQuery)}`).then((data) => setOrigins(data.cities || [])).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [form.originQuery]);

  useEffect(() => {
    if (form.destQuery.trim().length < 2) return undefined;
    const timer = setTimeout(() => {
      api(`/catalog?q=${encodeURIComponent(form.destQuery)}`).then((data) => setDests(data.cities || [])).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [form.destQuery]);

  const vehicle = vehicles.find((item) => String(item.id) === String(form.vehicle_type_id));
  const variants = VARIANTS.find((group) => vehicle && group.test(vehicle.title))?.items || [];

  async function chooseCity(kind, city) {
    const zones = city.name === 'تهران' ? await api(`/catalog/cities/${city.id}/zones`) : [];
    if (kind === 'origin') {
      setOriginCity(city);
      setOriginZones(zones);
      set({ origin_city_id: city.id, originQuery: `${city.name} ${city.province || ''}`, origin_zone_id: '' });
    } else {
      setDestCity(city);
      setDestZones(zones);
      set({ dest_city_id: city.id, destQuery: `${city.name} ${city.province || ''}`, dest_zone_id: '' });
    }
  }

  async function submit(event) {
    event.preventDefault();
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: {
          ownerId: Number(form.ownerId),
          cargo_type: 'other',
          cargo_type_other: form.cargo_type_other,
          packaging_type: form.packaging_type,
          weight_kg: Number(form.weight_kg),
          piece_count: form.piece_count ? Number(form.piece_count) : null,
          length_cm: form.length_cm ? Number(form.length_cm) : null,
          width_cm: form.width_cm ? Number(form.width_cm) : null,
          height_cm: form.height_cm ? Number(form.height_cm) : null,
          cargo_value: Number(form.cargo_value),
          proposed_price: Number(form.proposed_price),
          origin_city_id: Number(form.origin_city_id),
          dest_city_id: Number(form.dest_city_id),
          origin_zone_id: form.origin_zone_id ? Number(form.origin_zone_id) : null,
          dest_zone_id: form.dest_zone_id ? Number(form.dest_zone_id) : null,
          origin_address: form.origin_address,
          dest_address: form.dest_address,
          origin_lat: originCity?.lat,
          origin_lng: originCity?.lng,
          dest_lat: destCity?.lat,
          dest_lng: destCity?.lng,
          loading_date: form.loading_date,
          loading_time_from: form.loading_time_from,
          loading_time_to: form.loading_time_to,
          loading_time_ranges: ['08:00-12:00'],
          urgency: form.urgency,
          vehicle_type_id: Number(form.vehicle_type_id),
          vehicle_variants: form.vehicle_variants,
          loading_method: form.loading_method,
          unloading_method: form.unloading_method,
          receiver_name: form.receiver_name,
          receiver_phone: form.receiver_phone,
          receiver_national_id: form.receiver_national_id,
          receiver_postal_code: form.receiver_postal_code,
          notes: form.notes,
          insurance_requested: form.insurance_requested,
          requires_inspector: form.requires_inspector,
        },
      });
      toast.success('درخواست حمل ثبت شد');
      navigate(`/admin/orders/${order.id}`);
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <Page title="ثبت درخواست حمل">
      <form className="form-grid" onSubmit={submit}>
        <select className="select" value={form.ownerId} onChange={(e) => set({ ownerId: e.target.value })} required>
          <option value="">صاحب کالا</option>
          {owners.map((owner) => <option key={owner.id} value={owner.userId}>{owner.companyName || owner.fullName || owner.phone}</option>)}
        </select>
        <input className="field" required placeholder="نوع کالا" value={form.cargo_type_other} onChange={(e) => set({ cargo_type_other: e.target.value })} />
        <input className="field" placeholder="نوع بسته‌بندی" value={form.packaging_type} onChange={(e) => set({ packaging_type: e.target.value })} />
        <input className="field" required placeholder="وزن (کیلوگرم)" value={form.weight_kg} onChange={(e) => set({ weight_kg: e.target.value })} />
        <input className="field" placeholder="تعداد بسته" value={form.piece_count} onChange={(e) => set({ piece_count: e.target.value })} />
        <input className="field" placeholder="طول (سانتی‌متر)" value={form.length_cm} onChange={(e) => set({ length_cm: e.target.value })} />
        <input className="field" placeholder="عرض (سانتی‌متر)" value={form.width_cm} onChange={(e) => set({ width_cm: e.target.value })} />
        <input className="field" placeholder="ارتفاع (سانتی‌متر)" value={form.height_cm} onChange={(e) => set({ height_cm: e.target.value })} />
        <input className="field" required placeholder="ارزش کالا (تومان)" value={form.cargo_value} onChange={(e) => set({ cargo_value: e.target.value })} />
        <input className="field" required placeholder="کرایه پیشنهادی (تومان)" value={form.proposed_price} onChange={(e) => set({ proposed_price: e.target.value })} />
        <input className="field" placeholder="جست‌وجوی شهر مبدأ" value={form.originQuery} onChange={(e) => set({ originQuery: e.target.value })} />
        {origins.map((city) => <button type="button" key={`o-${city.id}`} className="btn secondary" onClick={() => chooseCity('origin', city)}>{city.name} — {city.province}</button>)}
        {originZones.length > 0 && (
          <select className="select" value={form.origin_zone_id} onChange={(e) => set({ origin_zone_id: e.target.value })}>
            <option value="">محدوده مبدأ</option>
            {originZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
        )}
        <input className="field" required placeholder="نشانی دقیق بارگیری" value={form.origin_address} onChange={(e) => set({ origin_address: e.target.value })} />
        <input className="field" placeholder="جست‌وجوی شهر مقصد" value={form.destQuery} onChange={(e) => set({ destQuery: e.target.value })} />
        {dests.map((city) => <button type="button" key={`d-${city.id}`} className="btn secondary" onClick={() => chooseCity('dest', city)}>{city.name} — {city.province}</button>)}
        {destZones.length > 0 && (
          <select className="select" value={form.dest_zone_id} onChange={(e) => set({ dest_zone_id: e.target.value })}>
            <option value="">محدوده مقصد</option>
            {destZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
        )}
        <input className="field" required placeholder="نشانی دقیق تخلیه" value={form.dest_address} onChange={(e) => set({ dest_address: e.target.value })} />
        <input className="field" required type="date" value={form.loading_date} onChange={(e) => set({ loading_date: e.target.value })} />
        <select className="select" value={form.urgency} onChange={(e) => set({ urgency: e.target.value })}>
          <option value="urgent">فوری</option>
          <option value="today">امروز</option>
          <option value="tomorrow">فردا</option>
          <option value="scheduled">زمان‌بندی‌شده</option>
        </select>
        <select className="select" required value={form.vehicle_type_id} onChange={(e) => set({ vehicle_type_id: e.target.value, vehicle_variants: [] })}>
          <option value="">نوع خودرو</option>
          {vehicles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        {variants.map((item) => (
          <label key={item}><input type="checkbox" checked={form.vehicle_variants.includes(item)} onChange={(e) => {
            const next = e.target.checked ? [...form.vehicle_variants, item] : form.vehicle_variants.filter((value) => value !== item);
            set({ vehicle_variants: next });
          }} /> {item}</label>
        ))}
        <select className="select" value={form.loading_method} onChange={(e) => set({ loading_method: e.target.value })}>
          <option value="forklift">لیفتراک</option>
          <option value="crane">جرثقیل</option>
          <option value="manual">دستی</option>
          <option value="ramp">رمپ</option>
          <option value="other">سایر</option>
        </select>
        <select className="select" value={form.unloading_method} onChange={(e) => set({ unloading_method: e.target.value })}>
          <option value="forklift">تخلیه با لیفتراک</option>
          <option value="crane">تخلیه با جرثقیل</option>
          <option value="manual">تخلیه دستی</option>
          <option value="ramp">تخلیه با رمپ</option>
          <option value="other">تخلیه سایر</option>
        </select>
        <input className="field" required placeholder="نام گیرنده" value={form.receiver_name} onChange={(e) => set({ receiver_name: e.target.value })} />
        <input className="field" required placeholder="موبایل گیرنده" value={form.receiver_phone} onChange={(e) => set({ receiver_phone: e.target.value })} />
        <input className="field" placeholder="کد ملی گیرنده" value={form.receiver_national_id} onChange={(e) => set({ receiver_national_id: e.target.value })} />
        <input className="field" placeholder="کد پستی گیرنده" value={form.receiver_postal_code} onChange={(e) => set({ receiver_postal_code: e.target.value })} />
        <input className="field" placeholder="توضیحات و شرایط حمل" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        <label><input type="checkbox" checked={form.insurance_requested} onChange={(e) => set({ insurance_requested: e.target.checked })} /> بیمه بار</label>
        <label><input type="checkbox" checked={form.requires_inspector} onChange={(e) => set({ requires_inspector: e.target.checked })} /> الزام متصدی</label>
        <button className="btn" type="submit">ثبت درخواست</button>
      </form>
    </Page>
  );
}
