module.exports = {
  routes: [
    {
      method: "POST",
      path: "/orders/razorpay",
      handler: "global.initiateOrder",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/orders/razorpay/verify",
      handler: "global.verifyOrder",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/razorpay/webhooks",
      handler: "global.razorpay_webhooks",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/order/:id/payment-logs",
      handler: "global.paymentLogsByRzpOrderId",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
