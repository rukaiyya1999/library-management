const mongoose = require("mongoose");
const BookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  genre: { type: String, required: true },
  publishedDate: { type: Date, required: true },
  availableCopies: { type: Number, default: 0 },
  totalCopies: { type: Number, default: 0 },
});

module.exports = mongoose.model("books", BookSchema);
