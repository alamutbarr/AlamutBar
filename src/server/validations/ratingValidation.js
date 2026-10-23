const Joi = require('joi');
const commonMessages = require('../utils/joiMessages');

const createRatingSchema = Joi.object({
  driver_score: Joi.number().integer().min(1).max(5).optional().allow(null).label('امتیاز راننده'),
  dispatcher_score: Joi.number().integer().min(1).max(5).optional().allow(null).label('امتیاز متصدی'),
  comment: Joi.string().max(500).allow('', null).label('نظر'),
})
  .custom((value, helpers) => {
    if (!value.driver_score && !value.dispatcher_score) {
      return helpers.message('حداقل یکی از امتیاز راننده یا متصدی را وارد کنید.');
    }
    return value;
  })
  .messages(commonMessages);

module.exports = { createRatingSchema };
