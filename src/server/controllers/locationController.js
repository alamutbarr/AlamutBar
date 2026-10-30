const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const { City, Zone } = require("../models");
const { CITIES } = require("../services/geoData");

const centerByPair = new Map();
const centerByName = new Map();
for (const city of CITIES) {
  if (city.lat == null || city.lng == null) continue;
  centerByPair.set(`${city.name}\0${city.province || ""}`, city);
  if (!centerByName.has(city.name)) centerByName.set(city.name, city);
}

const getCities = asyncHandler(async (req, res) => {
  const cities = await City.findAll({
    attributes: ["id", "name", "province"],
    order: [
      ["name", "ASC"],
      ["province", "ASC"],
    ],
  });
  success(res, {
    data: cities.map((row) => {
      const plain = row.get({ plain: true });
      const center = centerByPair.get(`${plain.name}\0${plain.province || ""}`) || centerByName.get(plain.name);
      return { ...plain, lat: center ? center.lat : null, lng: center ? center.lng : null };
    }),
  });
});

const getZonesByCity = asyncHandler(async (req, res) => {
  const zones = await Zone.findAll({
    where: { city_id: req.params.cityId },
    order: [["name", "ASC"]],
  });
  success(res, { data: zones });
});

module.exports = { getCities, getZonesByCity };
