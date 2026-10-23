const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const { City, Zone } = require("../models");

const getCities = asyncHandler(async (req, res) => {
  const cities = await City.findAll({
    attributes: ["id", "name", "province"],
    order: [
      ["name", "ASC"],
      ["province", "ASC"],
    ],
  });
  success(res, { data: cities });
});

const getZonesByCity = asyncHandler(async (req, res) => {
  const zones = await Zone.findAll({
    where: { city_id: req.params.cityId },
    order: [["name", "ASC"]],
  });
  success(res, { data: zones });
});

module.exports = { getCities, getZonesByCity };
