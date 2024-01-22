'use strict';

/**
 * global-public router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::global-public.global-public');
