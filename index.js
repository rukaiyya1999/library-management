require("./database/config");
const mongoose = require("mongoose");
const express = require("express");
const User = require("./database/Models/UserModel");
const Book = require("./database/Models/BookModel");
const JWT = require("jsonwebtoken");
const cors = require("cors");
const Checkout = require("./database/Models/CheckoutModel");
const app = express();
app.use(cors());
app.use(express.json());
const jwtSecret = "ruksJwtSecret";
const cron = require("node-cron");

//CRON--------------
cron.schedule("0 0 * * *", async () => {
  const overdueCheckouts = await Checkout.find({
    returnDate: { $lt: new Date() },
    status: "issued",
  });
  if (overdueCheckouts) {
    for (let user of overdueCheckouts) {
      const userId = user.userId;
      await User.findByIdAndUpdate(userId, { $inc: { lateReturnFine: 10 } });
    }
  }
});


 //MiddleWares-------------
const authenticateToken = async (req, resp, next) => {
  const token = req.header("Authorization");
  if (!token) {
    resp.status(401).json({ message: "Not authorized" });
  }
  try {
    const decoded = JWT.verify(token, jwtSecret);
    req.user = await decoded.role;
    next();
  } catch (error) {
    return resp.status(401).json({ message: "Unauthorized - Invalid token" });
  }
};

const adminAuthenticate = (req, resp, next) => {
    if (req.user !== "admin") {
      return resp
        .status(403)
        .json({ message: "Forbidden - Insufficient privileges" });
    }
    next();
  };


//Sign Up Route----------
app.post("/library/signUp", async (req, resp) => {
  try {
    const { name, email, password } = req.body;
    if (!(name && email && password)) {
      return resp.status(400).send("please enter required fields");
    }
    const isEmailAlreadyExist = await User.findOne({ email: req.body.email });
    if (isEmailAlreadyExist) {
      return resp.status(400).send("user already exist");
    }
    const newUser = new User(req.body);
    const saveUser = await newUser.save();
    const accessToken = JWT.sign(
      { name: saveUser.name, email: saveUser.email, role: saveUser.role },
      jwtSecret,
      { expiresIn: "15m" }
    );
    const refreshToken = JWT.sign(
      { name: saveUser.name, email: saveUser.email, role: saveUser.role },
      jwtSecret,
      { expiresIn: "3d" }
    );
    resp.status(200).json({ accessToken, refreshToken, role: saveUser.role });
  } catch (error) {
    throw new Error(error);
  }
});


//Sign In Route----------
app.post("/library/signIn", async (req, resp) => {
  try {
    const { name, email, password } = req.body;
    if (!(name && email && password)) {
      return resp.status(400).send("please enter required fields");
    }
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const matchPassword = password === findUser.password;
      if (matchPassword) {
        const accessToken = JWT.sign(
          { name: findUser.name, email: findUser.email, role: findUser.role },
          jwtSecret,
          {
            expiresIn: "15m",
          }
        );
        const refreshToken = JWT.sign(
          { name: findUser.name, email: findUser.email, role: findUser.role },
          jwtSecret,
          {
            expiresIn: "3d",
          }
        );
        resp
          .status(200)
          .json({ accessToken, refreshToken, role: findUser.role });
      } else {
        resp.status(400).send("invalid password");
      }
    } else {
      resp.status(404).send("user not found");
    }
  } catch (error) {
    throw new Error(error);
  }
});


//Books Route----------
app.get("/library/books", authenticateToken, async (req, resp) => {
  try {
    const getBooks = await Book.find();
    resp.status(200).json({ response: getBooks });
  } catch (error) {
    throw new Error(error);
  }
});

app.get("/library/books/:bookId", authenticateToken, async (req, resp) => {
  try {
    const bookId = req.params.bookId;
    const getBook = await Book.findOne({ _id: bookId });
    resp.status(200).json({ response: getBook });
  } catch (error) {
    throw new Error(error);
  }
});

app.post("/library/checkout/:bookId", authenticateToken, async (req, resp) => {
  try {
    const bookId = req.params.bookId;
    if (!mongoose.isValidObjectId(bookId)) {
      return resp.status(400).json({ message: "Invalid bookId" });
    }
    const newCheckout = new Checkout({
      bookId: bookId,
      userId: req.body.userId,
      checkoutDate: new Date(),
      returnDate: req.body.returnDate,
      status: "issued",
    });
    const saveCheckout = await newCheckout.save();
    resp.status(200).json({ response: saveCheckout });
  } catch (error) {
    throw new Error(error);
  }
});

app.post(
  "/library/checkout/return-book/:bookId",
  authenticateToken,
  async (req, resp) => {
    try {
      const bookId = req.params.bookId;
      if (!mongoose.isValidObjectId(bookId)) {
        return resp.status(400).json({ message: "Invalid bookId" });
      }
      const returnBook = new Checkout({
        bookId: bookId,
        userId: req.body.userId,
        returnDate: new Date(),
        status: "returned",
      });
      const saveReturn = await returnBook.save();
      resp.status(200).json({ response: saveReturn });
    } catch (error) {
      throw new Error(error);
    }
  }
);

app.post(
  "/library/book",
  [authenticateToken, adminAuthenticate],
  async (req, resp) => {
    try {
      const {
        title,
        author,
        genre,
        publishedDate,
        availableCopies,
        totalCopies,
      } = req.body;
      if (!(title && author && genre && publishedDate)) {
        return resp
          .status(400)
          .json({ message: "please provide require data" });
      }
      const newBook = new Book(req.body);
      const saveBook = await newBook.save();
      resp.status(200).json({ response: saveBook });
    } catch (error) {
      throw new Error(error);
    }
  }
);

app.put(
  "/library/:bookId",
  [authenticateToken, adminAuthenticate],
  async (req, resp) => {
    try {
      const bookId = req.params.bookId;
      if (!mongoose.isValidObjectId(bookId)) {
        return resp.status(400).json({ message: "Invalid bookId" });
      }
      const updateBook = await Book.updateOne(
        { _id: bookId },
        { $set: req.body }
      );
      resp.status(200).json({ updatedData: updateBook });
    } catch (error) {
      throw new Error(error);
    }
  }
);

app.patch(
  "/library/:bookId",
  [authenticateToken, adminAuthenticate],
  async (req, resp) => {
    try {
      const bookId = req.params.bookId;
      if (!mongoose.isValidObjectId(bookId)) {
        return resp.status(400).json({ message: "Invalid bookId" });
      }
      const updateBook = await Book.updateOne(
        { _id: bookId },
        { $set: req.body }
      );
      resp.status(200).json({ updatedData: updateBook });
    } catch (error) {
      throw new Error(error);
    }
  }
);

app.listen(8000, () => {
  console.log("listening on port 8000");
});
