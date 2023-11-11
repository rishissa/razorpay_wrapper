module.exports = {
  routes: [
    {
      method: "POST",
      path: "/payout/settlements",
      handler: "custom.createPayout",
      config: {
        policies: [],
        middlewares: ["api::custom.custom"],
      },
    },
    {
      method: "POST",
      path: "/order/payout/webhook",
      handler: "custom.webHook",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
