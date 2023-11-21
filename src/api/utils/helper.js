const crypto = require("crypto");

const uid = () => {
  const length = 5; // Adjust the length as needed
  const randomBytes = crypto.randomBytes(length);
  const orderID = "ORD" + randomBytes.toString("hex").toUpperCase();
  return orderID;
};

const getPagination = (page, pageSize) => {
  if (!page && !pageSize) {
    return { limit: null, offset: null };
  } else {
    const limit = pageSize ? +pageSize : 25;
    const offset = page <= 1 ? 0 * limit : (page - 1) * limit;
    return { limit, offset };
  }
};

module.exports = {
  generateOrderUid: uid,
  getPagination,
};
