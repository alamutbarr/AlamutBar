const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { VehicleType } = require('../models');

const getAll = asyncHandler(async (req, res) => {
  const vehicles = await VehicleType.findAll({ where: { is_active: true }, order: [['max_weight_kg', 'ASC']] });
  success(res, { data: vehicles });
});

module.exports = { getAll };
