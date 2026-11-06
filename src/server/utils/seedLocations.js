const { City, Zone } = require("../models");
const { CITIES } = require("../services/geoData");

function cityRows() {
  const seen = new Set();
  const rows = [];
  for (const city of CITIES) {
    if (!city.name || !city.province) continue;
    const name = String(city.name).slice(0, 50);
    const province = String(city.province).slice(0, 50);
    const key = `${name}||${province}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ name, province });
  }
  return rows;
}

const TEHRAN_ZONES = [
  "مرکز، شمال و بافت متراکم",
  "غرب و شمال غرب",
  "غرب مرکزی و جنوب غرب صنعتی",
  "شرق و شمال شرق",
  "جنوب و جنوب شرق",
];

const seedLocations = async () => {
  const count = await City.count();
  if (count === 0) {
    const rows = cityRows();
    await City.bulkCreate(rows, { ignoreDuplicates: true });
    console.log(`✅ ${rows.length} Iranian cities seeded successfully.`);
  }

  // ۲. افزودن محدوده‌های اختصاصی تهران
  const tehranCity = await City.findOne({
    where: { name: "تهران", province: "تهران" },
  });
  if (tehranCity) {
    const existingZonesCount = await Zone.count({
      where: { city_id: tehranCity.id },
    });
    if (existingZonesCount === 0) {
      await Zone.bulkCreate(
        TEHRAN_ZONES.map((name) => ({ name, city_id: tehranCity.id })),
      );
      console.log("✅ Tehran special zones added.");
    }
  }
};

module.exports = seedLocations;
