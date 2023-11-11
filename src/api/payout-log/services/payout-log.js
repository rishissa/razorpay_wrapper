'use strict';

/**
 * payout-log service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::payout-log.payout-log');
