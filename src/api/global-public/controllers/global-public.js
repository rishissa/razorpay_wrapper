'use strict';

/**
 * global-public controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::global-public.global-public');
