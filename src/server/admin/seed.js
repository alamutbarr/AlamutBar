const { Op } = require('sequelize');
const {
  Admin, User, CargoOwner, Driver, Shipment, City, VehicleType,
  Inspector, InspectionReport, OrderEvent, SystemSetting, Complaint, AdminAuditLog,
} = require('../models');
const { legacyPatch } = require('./workflow');
const { hashPassword } = require('./authService');

const SEED_PASSWORD = 'Alamut@1234';

function resolveSeedPassword() {
  const fromEnv = String(process.env.ADMIN_SEED_PASSWORD || '').trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') return null;
  return SEED_PASSWORD;
}

const ADMINS = [
  { phone: '09120000000', username: 'admin', fullName: 'مدیر سامانه', roles: ['SUPER_ADMIN'] },
  { phone: '09120000001', username: 'dispatch', fullName: 'اپراتور دیسپچ', roles: ['DISPATCH_OPERATOR'] },
  { phone: '09120000002', username: 'security', fullName: 'اپراتور امنیت', roles: ['SECURITY_OPERATOR'] },
  { phone: '09120000003', username: 'inspection', fullName: 'سرپرست بازرسی', roles: ['INSPECTION_SUPERVISOR'] },
  { phone: '09120000004', username: 'support', fullName: 'پشتیبان مدارک', roles: ['SUPPORT_AGENT'] },
  { phone: '09120000005', username: 'shift', fullName: 'اپراتور شیفت', roles: ['DISPATCH_OPERATOR', 'SECURITY_OPERATOR'] },
];

const COORDS = {
  تهران: { lat: 35.7219, lng: 51.3347 },
  اصفهان: { lat: 32.6546, lng: 51.668 },
  شیراز: { lat: 29.5918, lng: 52.5837 },
  نیشابور: { lat: 36.214, lng: 58.796 },
  مشهد: { lat: 36.297, lng: 59.606 },
  تبریز: { lat: 38.08, lng: 46.292 },
};

function nationalId(nine) {
  const digits = String(nine).padStart(9, '0').slice(0, 9);
  const sum = digits.split('').reduce((acc, digit, index) => acc + Number(digit) * (10 - index), 0);
  const remainder = sum % 11;
  return `${digits}${remainder < 2 ? remainder : 11 - remainder}`;
}

function docs(status = 'PENDING') {
  const item = (key, title) => ({ key, title, status, note: '', url: null });
  return {
    personal: [item('license', 'گواهینامه'), item('national_card', 'کارت ملی')],
    vehicle: [item('smart_card', 'کارت هوشمند ناوگان'), item('vehicle_card', 'کارت خودرو')],
    insurance: [item('third_party', 'بیمه شخص ثالث')],
  };
}

async function ensureAdmins() {
  if (await Admin.count() > 0) return;
  const password = resolveSeedPassword();
  const passwordHash = password ? await hashPassword(password) : null;
  if (!passwordHash) {
    throw new Error('ADMIN_SEED_PASSWORD is required to create operators in production.');
  }
  for (const item of ADMINS) {
    await Admin.create({ ...item, passwordHash, isActive: true });
  }
}

const PROVINCES = {
  تهران: 'تهران',
  اصفهان: 'اصفهان',
  شیراز: 'فارس',
  نیشابور: 'خراسان رضوی',
  مشهد: 'خراسان رضوی',
  تبریز: 'آذربایجان شرقی',
};

async function markDemoSeeded() {
  const [flag] = await SystemSetting.findOrCreate({
    where: { key: 'demo_seeded' },
    defaults: { value: 'true', description: 'داده نمونه پنل ادمین' },
  });
  if (flag.value !== 'true') {
    flag.value = 'true';
    await flag.save();
  }
}

async function ensureDemo() {
  const shipmentCount = await Shipment.count();
  if (shipmentCount > 0) {
    await markDemoSeeded();
    return;
  }
  const cities = {};
  for (const name of Object.keys(COORDS)) {
    cities[name] = await City.findOne({ where: { name } });
    if (!cities[name]) {
      cities[name] = await City.create({ name, province: PROVINCES[name] || '' });
    }
  }
  const trailer = await VehicleType.findOne({ where: { title: { [Op.like]: '%تریلی%' }, is_active: true } });
  const khavar = await VehicleType.findOne({ where: { title: { [Op.like]: '%خاور%' }, is_active: true } });
  const vehicle = trailer || khavar || await VehicleType.findOne({ where: { is_active: true } });
  if (!vehicle) throw new Error('نوع خودرو برای داده نمونه پیدا نشد.');
  const variants = String(vehicle.title).includes('تریلی') ? ['کفی'] : ['روباز'];

  const [ownerUser] = await User.findOrCreate({
    where: { phone_number: '09121111111' },
    defaults: { phone_number: '09121111111', role: 'cargo_owner', is_phone_verified: true, is_active: true },
  });
  const [owner] = await CargoOwner.findOrCreate({
    where: { user_id: ownerUser.id },
    defaults: {
      user_id: ownerUser.id,
      first_name: 'کارخانه',
      last_name: 'خیام',
      company_name: 'فولاد خیام نیشابور',
      national_id: nationalId('049937089'),
      require_inspector: true,
      price_ceiling: 80000000,
      verification_status: 'VERIFIED',
    },
  });
  const [ownerUser2] = await User.findOrCreate({
    where: { phone_number: '09122222222' },
    defaults: { phone_number: '09122222222', role: 'cargo_owner', is_phone_verified: true, is_active: true },
  });
  await CargoOwner.findOrCreate({
    where: { user_id: ownerUser2.id },
    defaults: {
      user_id: ownerUser2.id,
      first_name: 'بازرگانی',
      last_name: 'پارس',
      company_name: 'بازرگانی پارس',
      national_id: nationalId('123456789'),
      require_inspector: false,
      verification_status: 'PENDING',
    },
  });

  const drivers = [];
  const driverSeed = [
    ['09123000001', 'رضا', 'نوری', 'VERIFIED', 'BUSY', docs('APPROVED'), COORDS.تهران, true],
    ['09123000002', 'مجید', 'کاظمی', 'VERIFIED', 'BUSY', docs('APPROVED'), { lat: 34.2, lng: 51.95 }, true],
    ['09123000003', 'حسین', 'مرادی', 'VERIFIED', 'BUSY', docs('APPROVED'), { lat: 34.9, lng: 51.5 }, false],
    ['09123000004', 'سعید', 'اکبری', 'PENDING_VERIFICATION', 'OFFLINE', docs('PENDING'), null, false],
    ['09123000005', 'کامران', 'صالحی', 'REJECTED', 'OFFLINE', docs('REJECTED'), null, false],
    ['09123000006', 'نادر', 'حیدری', 'VERIFIED', 'OFFLINE', docs('APPROVED'), COORDS.تبریز, false],
    ['09123000007', 'جواد', 'صفری', 'VERIFIED', 'READY', docs('APPROVED'), COORDS.نیشابور, true],
  ];
  for (const [phone, firstName, lastName, verificationStatus, availability, documents, loc, gps] of driverSeed) {
    const [driver] = await Driver.findOrCreate({
      where: { phoneNumber: phone },
      defaults: {
        phoneNumber: phone,
        firstName,
        lastName,
        nationalId: nationalId(String(100000000 + drivers.length)),
        licenseNumber: String(2000000000 + drivers.length).slice(0, 10),
        profileStep: 4,
        smartCardNumber: String(3000000 + drivers.length).slice(0, 7),
        tractorType: 'تریلی',
        trailerType: 'کفی',
        plate: `11-ع-22${drivers.length}-33`,
        verificationStatus,
        availability,
        documents,
        rejectionReason: verificationStatus === 'REJECTED' ? 'بیمه شخص ثالث منقضی است.' : null,
        lastLat: loc?.lat || null,
        lastLng: loc?.lng || null,
        lastLocationAt: loc ? new Date(Date.now() - (gps ? 2 : 40) * 60 * 1000) : null,
        isGpsActive: gps,
      },
    });
    drivers.push(driver);
  }

  const day = new Date().toISOString().slice(0, 10);
  async function shipment(code, workflow, extra) {
    const origin = cities[extra.origin];
    const dest = cities[extra.dest];
    const patch = legacyPatch(workflow);
    const row = await Shipment.create({
      tracking_code: code,
      origin_city_id: origin.id,
      origin_address: extra.originAddress,
      origin_lat: COORDS[extra.origin].lat,
      origin_lng: COORDS[extra.origin].lng,
      dest_city_id: dest.id,
      dest_address: extra.destAddress,
      dest_lat: COORDS[extra.dest].lat,
      dest_lng: COORDS[extra.dest].lng,
      cargo_type: extra.cargo || 'فلزات',
      packaging_type: 'پالت',
      weight_kg: extra.weight || 18000,
      cargo_value: extra.value || 650000000,
      loading_date: day,
      loading_time_from: '08:00',
      loading_time_to: '14:00',
      loading_time_ranges: ['08:00-14:00'],
      urgency: extra.urgency || 'scheduled',
      vehicle_type_id: vehicle.id,
      vehicle_variants: variants,
      loading_method: 'forklift',
      unloading_method: 'forklift',
      receiver_name: 'انبار مقصد',
      receiver_phone: '09123334455',
      proposed_price: extra.proposed || 18000000,
      operator_price: extra.estimated ?? extra.proposed ?? 18000000,
      final_price: extra.final || null,
      price_status: 'proposed',
      status: patch.status || 'pending_review',
      driver_status: patch.driver_status,
      owner_id: extra.ownerId || ownerUser.id,
      driver_id: extra.driverId || null,
      notes: extra.notes || null,
      workflow_status: workflow,
      eta: extra.eta || null,
      requires_inspector: Boolean(extra.requiresInspector),
      waybill_number: extra.waybill || null,
      delivery_otp: extra.otp || null,
      deviation_since: extra.deviationSince || null,
      priority_score: extra.priority || 0,
    });
    await OrderEvent.create({
      shipmentId: row.id,
      eventType: 'STATUS_CHANGED',
      description: `پرونده نمونه در وضعیت «${workflow}» ساخته شد.`,
      metadata: { demo: true },
    });
    return row;
  }

  const hourAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const devSince = new Date(Date.now() - 20 * 60 * 1000);
  await shipment('ADM-DEMO-01', 'UNDER_REVIEW', {
    origin: 'نیشابور', dest: 'تهران', originAddress: 'شهرک صنعتی خیام', destAddress: 'شورآباد', cargo: 'ورق فولادی', estimated: null, requiresInspector: true,
  });
  await shipment('ADM-DEMO-02', 'PRICE_ESTIMATED', {
    origin: 'نیشابور', dest: 'مشهد', originAddress: 'شهرک صنعتی عطار', destAddress: 'جاده کلات', estimated: 14500000,
  });
  await shipment('ADM-DEMO-03', 'DRIVER_ASSIGNMENT', {
    origin: 'تهران', dest: 'اصفهان', originAddress: 'بازار آهن', destAddress: 'شهرک صنعتی محمودآباد', urgency: 'urgent', estimated: 22000000,
  });
  await shipment('ADM-DEMO-04', 'DRIVER_ACCEPTED', {
    origin: 'تهران', dest: 'شیراز', originAddress: 'کهریزک', destAddress: 'شهرک صنعتی بزرگ', driverId: drivers[0].id, eta: hourAgo, estimated: 26000000, priority: 40,
  });
  const deviated = await shipment('ADM-DEMO-05', 'IN_TRANSIT', {
    origin: 'تهران', dest: 'اصفهان', originAddress: 'اسلامشهر', destAddress: 'منطقه صنعتی', driverId: drivers[1].id, waybill: 'WB-1405-1005', otp: '4455', estimated: 24000000, final: 24500000, deviationSince: devSince, priority: 80,
  });
  await shipment('ADM-DEMO-06', 'IN_TRANSIT', {
    origin: 'نیشابور', dest: 'تهران', originAddress: 'خیام، سوله ۴', destAddress: 'غرب تهران', driverId: drivers[2].id, waybill: 'WB-1405-1006', otp: '7788', estimated: 19000000, requiresInspector: true, value: 900000000, priority: 100,
  });
  await shipment('ADM-DEMO-07', 'AT_LOADING_INSPECTION', {
    origin: 'اصفهان', dest: 'شیراز', originAddress: 'محمودآباد', destAddress: 'شهرک صنعتی', driverId: drivers[5] ? null : null, estimated: 11000000, requiresInspector: true, weight: 9000,
  });
  await shipment('ADM-DEMO-08', 'COMPLETED', {
    origin: 'مشهد', dest: 'نیشابور', originAddress: 'کلات', destAddress: 'خیام', estimated: 8000000, final: 8000000, waybill: 'WB-1405-0901', otp: '1200', ownerId: ownerUser2.id,
  });

  const [inspector] = await Inspector.findOrCreate({
    where: { phone: '09124000001' },
    defaults: { fullName: 'متصدی بارگیری خیام', notes: 'شیفت صبح شهرک صنعتی' },
  });
  await Inspector.findOrCreate({
    where: { phone: '09124000002' },
    defaults: { fullName: 'متصدی بارگیری عطار' },
  });
  deviated.assigned_inspector_id = inspector.id;
  await deviated.save();
  await InspectionReport.create({
    shipmentId: deviated.id,
    inspectorId: inspector.id,
    checklist: [
      { key: 'seal', label: 'پلمب سالم است', checked: true },
      { key: 'tie', label: 'مهار بار درست است', checked: true },
      { key: 'match', label: 'خودرو با مأموریت می‌خواند', checked: false },
    ],
    photos: [],
    weightEmpty: 14200,
    weightFull: 32100,
    weightNet: 17900,
    discrepancies: [{ field: 'vehicle', expected: 'کفی', actual: 'لبه‌دار' }],
    decision: 'PENDING',
  });

  const sample = await Shipment.findOne({ where: { tracking_code: 'ADM-DEMO-04' } });
  if (sample) {
    await Complaint.findOrCreate({
      where: { description: 'راننده با تأخیر به بارگیری رسید و هماهنگی نداشت.' },
      defaults: {
        owner_id: ownerUser.id,
        shipment_id: sample.id,
        type: 'delay',
        status: 'pending',
      },
    });
  }
  const seededAdmin = await Admin.findOne({ where: { username: 'admin' } });
  await AdminAuditLog.findOrCreate({
    where: { action: 'demo.seed', entity: 'shipment' },
    defaults: {
      entityId: 'ADM-DEMO-01',
      performedBy: seededAdmin?.id || null,
      details: { note: 'داده نمونه در بانک خالی ساخته شد' },
    },
  });

  await markDemoSeeded();
  console.log('داده نمونه پنل ادمین ساخته شد. ورود: admin / Alamut@1234');
}

async function backfillWorkflow() {
  const rows = await Shipment.findAll({ where: { workflow_status: null } });
  for (const row of rows) {
    const { deriveWorkflow } = require('./workflow');
    row.workflow_status = deriveWorkflow(row);
    await row.save();
  }
}

module.exports = { ensureAdmins, ensureDemo, backfillWorkflow, ADMINS, SEED_PASSWORD, resolveSeedPassword };
