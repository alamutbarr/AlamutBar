const Joi = require('joi');
const commonMessages = require('../utils/joiMessages');

const createComplaintSchema = Joi.object({
  shipment_id: Joi.number().integer().optional().allow(null).label('بار مرتبط'),
  type: Joi.string().valid('driver', 'dispatcher', 'cargo', 'delay', 'other').required().label('موضوع شکایت'),
  description: Joi.string().min(10).max(1000).required().label('توضیحات'),
  evidence_url: Joi.string().max(255).allow('', null).label('مدرک'),
}).messages(commonMessages);

module.exports = { createComplaintSchema };
