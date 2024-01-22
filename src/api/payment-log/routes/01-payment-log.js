module.exports = {
  routes: [
    {
      method: "GET",
      path: "/payment-logs/client/:id",
      handler: "payment-log.getClientTransactions",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
