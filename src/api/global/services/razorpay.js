const Razorpay = require("razorpay");
const axios = require("axios");

const razorpayService = {
  createOrder: async (key_id, key_secret, totalAmount, account_id) => {
    var instance = new Razorpay({
      key_id: key_id,
      key_secret: key_secret,
    });

    try {
      // const initiate_order = await axios.post(
      //   "https://api.razorpay.com/v1/orders",
      //   {
      //     auth: {
      //       username: key_id,
      //       password: key_secret,
      //     },
      //   }
      // );
      var razorpayInfo = await instance.orders.create({
        amount: parseInt(totalAmount) * 100,
        currency: "INR",
        transfers: [
          {
            account: account_id.rzp_linked_account_id, //Please replace with appropriate ID.
            amount: parseInt(totalAmount) * 100,
            currency: "INR",
            notes: {
              branch: account_id.legal_business_name || "Reseller",
              name: account_id.account_contact_name || "Reseller",
            },
            linked_account_notes: ["branch"],
            on_hold: false,
          },
        ],
      });
      return razorpayInfo;
    } catch (err) {
      console.log(err.error);
      return err.error;
    }
  },
};

module.exports = razorpayService;
