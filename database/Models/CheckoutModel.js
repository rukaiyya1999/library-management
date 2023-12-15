const mongoose = require("mongoose");
const { Schema } = mongoose;
const CheckoutSchema = new mongoose.Schema({
  bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  checkoutDate: { type: Date, default: Date.now },
  returnDate: { type: Date },
  status: { type: String, enum: ["issued", "returned"], default: "issued" },
});

module.exports = mongoose.model('checkouts', CheckoutSchema)