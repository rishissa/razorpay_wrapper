// @ts-nocheck
"use strict";

const axios = require("axios");
const crypto = require("crypto");
/**
 * A set of functions called "actions" for `custom`
 */

module.exports = {
  createPayout: async (ctx, next) => {
    try {
      const body = ctx.request.body;
      const payment_log_id = body.payment_log_id;

      let order;
      const razorpay_keys = await strapi.db
        .query("api::global.global")
        // @ts-ignore
        .findOne();

      const username = razorpay_keys.razorpay_key;
      const password = razorpay_keys.razorpay_secret;

      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { id: body.user },
          populate: {
            account_detail: true,
          },
        });

      const payment_log = await strapi.db
        .query("api::payment-log.payment-log")
        .findOne({
          where: {
            id: payment_log_id,
            user: { id: body.user },
          },
          populate: { user: { select: ["id"] } },
        });
      //check if order is reseller and COD order
      //check if order products of order all are delivered
      if (payment_log.payout_required === false) {
        return ctx.send(
          {
            message: `Payout is not required in this log`,
          },
          400
        );
      }
      // console.log(user);
      switch (body.mode) {
        case "upi":
          if (
            !user.account_detail.upi_id ||
            user.account_detail.upi_id.length == 0
          ) {
            return ctx.send(
              {
                message: `Admin ${user.id} Name ${user.username} has no VPA Field enabled`,
              },
              400
            );
          }
          break;

        case "bank_account":
          if (
            !user.account_detail.account_number ||
            user.account_detail.account_number.length == 0
          ) {
            return ctx.send(
              {
                message: `Admin ${user.id} Name ${user.username} has no Bank Acc enabled`,
              },
              400
            );
          }
          break;

        default:
          break;
      }

      const mode = body.mode;

      //find all logs

      // console.log(payment_logs);
      // const missingIds = payment_log_ids.filter(
      //   (id) => !payment_logs.some((obj) => obj.id === id)
      // );

      // if (missingIds.length > 0) {
      //   return ctx.send(
      //     {
      //       message: `ID: ${missingIds} either not found or not associated to the user`,
      //     },
      //     400
      //   );
      // }
      let totalAmount = 0;
      totalAmount += payment_log.payout_amount;

      // const base64 = btoa(`${username}:${password}`);
      let payload;

      let data;

      switch (mode) {
        case "bank_account":
          payload = {
            account_number: razorpay_keys.razorpayX_account_number,
            amount: totalAmount * 100,
            currency: "INR",
            purpose: "payout",
            mode: "NEFT",
            fund_account: {
              account_type: "bank_account",
              bank_account: {
                name: user.account_detail.account_name,
                ifsc: user.account_detail.ifsc_code,
                account_number: user.account_detail.account_number,
              },
              contact: {
                name: user.account_detail.account_name,
                email: user.email,
              },
            },
            queue_if_low_balance: true,
          };
          break;
        case "upi":
          payload = {
            account_number: razorpay_keys.razorpayX_account_number,
            amount: totalAmount * 100,
            currency: "INR",
            purpose: "payout",
            mode: "UPI",
            fund_account: {
              account_type: "vpa",
              vpa: {
                address: user.account_detail.upi_id,
              },
              contact: {
                name: user.account_detail.account_name || "razorpay",
                email: user.email,
              },
            },
            queue_if_low_balance: true,
          };

          break;
        default:
          break;
      }

      let payout;
      try {
        payout = await axios.post(
          `https://api.razorpay.com/v1/payouts`,
          payload,
          {
            auth: {
              username: username,
              password: password,
            },
          }
        );
      } catch (err) {
        console.log(err);
        return ctx.send(err, 400);
      }
      // console.log(JSON.stringify(payout.data));

      switch (mode) {
        case "bank_account":
          data = {
            payout_id: payout.data.id,
            account_number:
              payout.data.fund_account.bank_account.account_number,
            amount: payout.data.amount / 100,
            currency: payout.data.currency,
            mode: payout.data.mode,
            purpose: payout.data.purpose,
            account_type: payout.data.fund_account.account_type,
            status: payout.data.status,
            fund_account_id: payout.data.fund_account_id,
            fund_bank_account_ifsc: payout.data.fund_account.bank_account.ifsc,
            fund_account_contact_id: payout.data.fund_account.contact_id,
            fund_contact_name: payout.data.fund_account.contact.name,
            fund_contact_email: payout.data.fund_account.contact.email,
            fund_contact_contact: payout.data.fund_account.contact.contact,
            fund_contact_type: payout.data.fund_account.contact.type,
            fund_bank_account_name:
              payout.data.fund_account.bank_account.bank_name,
            user: user.id,
            payment_log: body.payment_log_id,
          };
          break;

        case "upi":
          data = {
            payout_id: payout.data.id,
            amount: payout.data.amount / 100,
            currency: payout.data.currency,
            mode: payout.data.mode,
            purpose: payout.data.purpose,
            account_type: payout.data.fund_account.account_type,
            vpa_address: payout.data.fund_account.vpa.address,
            status: payout.data.status,
            fund_account_id: payout.data.fund_account_id,
            fund_account_contact_id: payout.data.fund_account.contact_id,
            fund_contact_name: payout.data.fund_account.contact.name,
            fund_contact_email: payout.data.fund_account.contact.email,
            fund_contact_contact: payout.data.fund_account.contact.contact,
            fund_contact_type: payout.data.fund_account.contact.type,
            user: user.id,
            payment_log: body.payment_log_id,
          };
          break;

        default:
          break;
      }
      if (payout.status === 200) {
        const payoutLog = await strapi.db
          .query("api::payout-log.payout-log")
          .create({
            data: data,
          });

        // const settlement = await strapi.db
        //   .query("api::settlement.settlement")
        //   .create({
        //     data: {
        //       payment_logs: body.log_ids,
        //       payout_log: payoutLog.id,
        //       user: user.id,
        //       net_amount: totalAmount,
        //       status: payout.data.status,
        //     },
        //   });

        return ctx.send(payout.data, 200);
      } else {
        console.log(payout.data);
        return ctx.send({ error: payout.data }, 500);
      }
    } catch (error) {
      console.log(error);
      return ctx.send(error, 500);
    }
  },

  webHook: async (ctx) => {
    try {
      console.log("From Payout Webhook");
      const body = ctx.request.body;

      console.log(JSON.stringify(body));
      const secret = "razor@123";
      const shasum = crypto.createHmac("sha256", secret);
      shasum.update(JSON.stringify(ctx.request.body));
      const digest = shasum.digest("hex");

      const rzp_signature = ctx.request.headers["x-razorpay-signature"];

      if (digest === rzp_signature) {
        console.log("Signature Verified");

        const payout_log = await strapi.db
          .query("api::payout-log.payout-log")
          .findOne({
            where: {
              payout_id: body.payload.payout.entity.id,
            },
          });

        if (payout_log) {
          //update
          const payoutLog = await strapi.db
            .query("api::payout-log.payout-log")
            .update({
              data: {
                status: body.payload.payout.entity.status,
              },
              where: {
                payout_id: body.payload.payout.entity.id,
              },
            });

          const settlement = await strapi.db
            .query("api::settlement.settlement")
            .update({
              data: { status: body.payload.payout.entity.status },
              where: { id: payout_log.id },
            });
        }
        return ctx.send("OK", 200);
      }
    } catch (error) {
      console.log(error);
      return ctx.send(error, 500);
    }
  },
};
