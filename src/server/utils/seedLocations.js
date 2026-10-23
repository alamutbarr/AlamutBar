const { City, Zone } = require("../models");
const iranCities = require("../data/iranCities.json");

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
    // ۱. درج یکجای تمام ۱۴۸۱ شهر ایران
    await City.bulkCreate(iranCities, { ignoreDuplicates: true });
    console.log(`✅ ${iranCities.length} Iranian cities seeded successfully.`);
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
