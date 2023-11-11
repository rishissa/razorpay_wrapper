"use strict";

const { generateOrderUid } = require("../../utils/helper");
const razorpayService = require("../services/razorpay");
const crypto = require("crypto");
const Razorpay = require("razorpay");

/**
 * global controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::global.global", ({ strapi }) => ({
  initiateOrder: async (ctx, next) => {
    try {
      //get x-verify header value
      //check in db
      const headerID = ctx.request.headers["x-verify"];
      const data = ctx.request.body;
      
      if (!headerID) {
        return ctx.send({ message: "No VerifyID passed in the header" }, 400);
      }
      //search in db
      const user = await strapi
        .query("plugin::users-permissions.user")
        .findOne({ where: { personal_id: headerID } });
      if (!user) {
        return ctx.send({ message: "Invalid VerifyID passed" }, 400);
      }

      const razorpay_keys = await strapi.db
        .query("api::global.global")
        // @ts-ignore
        .findOne();

      var razorpayInfo = await razorpayService.createOrder(
        razorpay_keys.razorpay_key,
        razorpay_keys.razorpay_secret,
        data.totalAmount
      );

      if (razorpayInfo.status == "created") {
        //set entry in payment logs
        const payment_log_data = {
          rz_order_creationId: razorpayInfo.id,
          amount: razorpayInfo.amount / 100,
          user: user.id,
          order_id: "",
        };

        const create_log = await strapi.db
          .query("api::payment-log.payment-log")
          .create({ data: payment_log_data });
        return ctx.send(razorpayInfo, 200);
      }
    } catch (err) {
      console.log(err);
      return ctx.send(err, 400);
    }
  },

  verifyOrder: async (ctx, next) => {
    try {
      console.log("Inside Verify Order From RzpWrapper");
      const razorpay_order_id = ctx.request.headers["razorpay_order_id"];
      const razorpay_payment_id = ctx.request.headers["razorpay_payment_id"];
      const razorpay_signature = ctx.request.headers["razorpay_signature"];

      const order_id = ctx.request.body.order_id;
      const razorpay_keys = await strapi.db
        .query("api::global.global")
        // @ts-ignore
        .findOne();

      var generated_signature = crypto
        .createHmac("sha256", razorpay_keys.razorpay_secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      if (generated_signature === razorpay_signature) {
        var instance = new Razorpay({
          key_id: razorpay_keys.razorpay_key,
          key_secret: razorpay_keys.razorpay_secret,
        });

        const rzOrder = await instance.orders.fetch(razorpay_order_id);

        let payment_log_data = {
          rz_payment_id: razorpay_payment_id,
          order_id: order_id,
          status: "CAPTURED",
        };

        //find log
        const log = await strapi.db
          .query("api::payment-log.payment-log")
          .findOne({
            where: {
              rz_order_creationId: razorpay_order_id,
            },
          });

        console.log("Log From Verify order");
        if (log) {
          if (!log.method) {
            console.log(log);
            const update_log = await strapi.db
              .query("api::payment-log.payment-log")
              .update({
                where: { rz_order_creationId: razorpay_order_id },
                data: payment_log_data,
              });
          }
        } else {
          //create
          const create_log = await strapi.db
            .query("api::payment-log.payment-log")
            .create({
              data: payment_log_data,
            });
        }
        return ctx.send(rzOrder, 200);
      }
      console.log("Unable to verify Payment");
      return ctx.send({ message: "Unable to Verify Payment" }, 400);
    } catch (err) {
      console.log(err);
      return ctx.send(err, 400);
    }
  },

  razorpay_webhooks: async (ctx, next) => {
    try {
      console.log("Inside RzpWrapper WebHooks");
      const webhook_data = ctx.request.body;

      // console.log(webhook_data.payObject);
      //verify webhooks using secret key
      const secret = "razor@123";
      const shasum = crypto.createHmac("sha256", secret);
      shasum.update(webhook_data.data);
      const digest = shasum.digest("hex");

      const rzp_signature = ctx.request.headers["x-razorpay-signature"];
      // console.log(digest);
      // console.log(rzp_signature);
      if (digest == rzp_signature) {
        console.log("Signature mAtched in Webhooks");
        //check if the log is already present
        //if yes update it
        //else create
        const log = await strapi.db
          .query("api::payment-log.payment-log")
          .findOne({
            where: {
              rz_order_creationId: webhook_data.payObject.rz_order_creationId,
            },
          });

        // console.log(log);

        let data_to_update;

        //update log
        data_to_update = webhook_data.payObject;
        // console.log(data_to_update);
        switch (data_to_update.status) {
          case "CAPTURED":
            if (log) {
              console.log(log);
              if (!log.method) {
                console.log("Update Log");
                const update_log = await strapi.db
                  .query("api::payment-log.payment-log")
                  .update({
                    where: {
                      rz_order_creationId: data_to_update.rz_order_creationId,
                    },
                    data: data_to_update,
                  });
              } else if (log.status === "FAILED") {
                console.log("Create Log");
                const create_log = await strapi.db
                  .query("api::payment-log.payment-log")
                  .create({
                    data: data_to_update,
                  });
              }
            } else {
              console.log("Create Log");
              const create_log = await strapi.db
                .query("api::payment-log.payment-log")
                .create({
                  data: data_to_update,
                });
            }
            break;

          case "FAILED":
            console.log("From Webhooks Failed");
            if (log.status !== "FAILED") {
              const update_log = await strapi.db
                .query("api::payment-log.payment-log")
                .update({
                  where: {
                    rz_order_creationId: data_to_update.rz_order_creationId,
                  },
                  data: data_to_update,
                });
              // if (!log.method) {
              //   console.log("Update Log");
              // }
            } else {
              console.log("Create Log");
              const create_log = await strapi.db
                .query("api::payment-log.payment-log")
                .create({
                  data: data_to_update,
                });
            }
            break;

          default:
            break;
        }

        return ctx.send({ verified: true }, 200);
      }
      return ctx.send({ verified: false }, 200);
    } catch (err) {}
  },

  paymentLogsByRzpOrderId: async (ctx, next) => {
    try {
      const rz_order_id = ctx.request.params.id;
      const personal_id = ctx.request.headers["x-verify"];

      const user = await strapi
        .query("plugin::users-permissions.user")
        .findOne({ where: { personal_id: personal_id } });

      if (!user) {
        return ctx.send({ message: `Invalid VerifyID passed` }, 400);
      }

      const logs = await strapi.db
        .query("api::payment-log.payment-log")
        .findOne({
          where: {
            rz_order_creationId: rz_order_id,
            status: "CAPTURED",
          },
        });

      return ctx.send(logs, 200);
    } catch (err) {
      console.log(err);
      return ctx.send(err, 400);
    }
  },
}));
