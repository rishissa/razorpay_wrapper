'use strict';

/**
 * global-public service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::global-public.global-public');
