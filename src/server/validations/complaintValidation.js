const Joi = require('joi');
const commonMessages = require('../utils/joiMessages');

const uploadPath = Joi.string().pattern(/^\/uploads\/[\w.-]+$/).max(255);

const createComplaintSchema = Joi.object({
  shipment_id: Joi.number().integer().optional().allow(null).label('بار مرتبط'),
  type: Joi.string().valid('driver', 'dispatcher', 'cargo', 'delay', 'other').required().label('موضوع شکایت'),
  description: Joi.string().min(10).max(1000).required().label('توضیحات'),
  evidence_url: Joi.alternatives().try(
    uploadPath.allow('', null),
    Joi.array().items(uploadPath).max(4),
  ).optional().label('مدرک'),
  evidence_urls: Joi.array().items(uploadPath).max(4).optional().label('مدارک'),
}).messages(commonMessages);

module.exports = { createComplaintSchema };
