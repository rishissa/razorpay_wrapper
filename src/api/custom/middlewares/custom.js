"use strict";

const Joi = require("joi");

/**
 * `custom` middleware
 */

module.exports = (config, { strapi }) => {
  // Add your own logic here.
  return async (ctx, next) => {
    strapi.log.info("In custom middleware.");
    const body = ctx.request.body;
    const JoiSchema = Joi.object({
      mode: Joi.string().valid("bank_account", "upi"),
      log_ids: Joi.array(),
      user: Joi.required(),
    });

    let result = JoiSchema.validate(body);
    if (result.error) {
      return ctx.send(result.error.details);
    }
    await next();
  };
};
