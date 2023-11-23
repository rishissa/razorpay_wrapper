"use strict";

const { payment_purpose } = require("../../utils/constants");
const { getPagination } = require("../../utils/helper");

/**
 * payment-log controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::payment-log.payment-log",
  ({ strapi }) => ({
    find: async (ctx, next) => {
      try {
        const query = ctx.request.query;

        let key = Object.keys(query);

        let client = query.client;

        let admin_sub = query.subscription;

        let client_filter = {};
        if (admin_sub == "true") {
          client_filter["purpose"] = payment_purpose.subscription;
        } else {
          client_filter["purpose"] = payment_purpose.order;
        }
        if (client === undefined) {
          client_filter["user"] = { id: { $not: null } };
        } else {
          client_filter["user"] = { id: client };
          client_filter["status"] = "CAPTURED";
          const user_data = await strapi
            .query("plugin::users-permissions.user")
            .findOne({ where: { id: client } });

          if (!user_data) {
            return ctx.send(
              { message: `No Client Found with the given ID` },
              400
            );
          }
        }

        const getLogs = async (offset, limit) => {
          const logsList = await strapi.db
            .query("api::payment-log.payment-log")
            .findWithCount({
              where: client_filter,
              // @ts-ignore
              populate: { user: { populate: { account_detail: true } } },
              limit,
              offset,
              orderBy: { id: "desc" },
            });

          return logsList;
        };

        var pagination = ctx.request.query.pagination;
        var logs;
        var allLogs;
        var meta;

        if (pagination) {
          if (Object.keys(pagination).length > 0) {
            const { offset, limit } = getPagination(
              pagination.page,
              pagination.size
            );
            allLogs = await getLogs(offset, limit);
            meta = {
              pagination: {
                page:
                  parseInt(pagination.page) < 1 ? 1 : parseInt(pagination.page),
                pageSize: parseInt(pagination.size),
                pageCount: Math.ceil(allLogs[1] / parseInt(pagination.size)),
                total: allLogs[1],
              },
            };
          }
        } else {
          allLogs = await getLogs(null, null);
          meta = {
            pagination: {
              page: 1,
              pageSize: allLogs[1],
              pageCount: 1,
              total: allLogs[1],
            },
          };
        }

        return ctx.send({ data: allLogs[0], meta }, 200);
      } catch (err) {
        console.log(err);
        return ctx.send(err, 400);
      }
    },
  })
);
