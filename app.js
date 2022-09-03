require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://" + process.env.ADMIN + ":" + process.env.PASSWORD + "@cluster0-shard-00-00.8inlw.mongodb.net:27017,cluster0-shard-00-01.8inlw.mongodb.net:27017,cluster0-shard-00-02.8inlw.mongodb.net:27017/dearuDB?ssl=true&replicaSet=atlas-yfz8e9-shard-0&authSource=admin&retryWrites=true&w=majority", {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
});

userSchema.plugin(passportLocalMongoose); // Hashes and salts the user's password

const letterSchema = new mongoose.Schema({
  from: String,
  to: String,
  content: String,
  date: Date,
});

const User = new mongoose.model("User", userSchema);
const Letter = new mongoose.model("Letter", letterSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get("/", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local", { failureRedirect: "/" })(
        req,
        res,
        function () {
          res.redirect("/received");
        }
      );
    }
  });
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", (req, res) => {
  User.register(
    {
      username: req.body.username,
    },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/signup");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/received");
        });
      }
    }
  );
});

app.get("/compose", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("compose", { username: req.user.username });
  } else {
    res.redirect("/");
  }
});

app.post("/compose", (req, res) => {
  User.findOne({ username: req.body.to }, (err, foundUser) => {
    if (err) {
      console.log(err);
      res.send("Something is wrong. Try again.");
    }
    if (foundUser) {
      const letter = new Letter({
        from: req.user.username,
        to: req.body.to,
        content: req.body.content,
        date: new Date(),
      });

      letter.save(() => {
        res.redirect("/sent");
      });
    } else {
      res.send("Recipient does not exist. Check the spelling of the username.");
    }
  });
});

app.get("/received", (req, res) => {
  if (req.isAuthenticated()) {
    Letter.find(
      { to: req.user.username },
      null,
      { sort: { date: -1 } },
      (err, foundLetters) => {
        if (err) {
          console.log(err);
          res.send("Something is wrong. Try again.");
        }
        if (foundLetters) {
          console.log(foundLetters);
          res.render("received", {
            username: req.user.username,
            receivedLetters: foundLetters,
          });
        } else {
          res.render("received", {
            username: req.user.username,
            receivedLetters: [],
          });
        }
      }
    );
  } else {
    res.redirect("/");
  }
});

app.get("/sent", (req, res) => {
  if (req.isAuthenticated()) {
    Letter.find(
      { from: req.user.username },
      null,
      { sort: { date: -1 } },
      (err, foundLetters) => {
        if (err) {
          console.log(err);
          res.send("Something is wrong. Try again.");
        }
        if (foundLetters) {
          console.log(foundLetters);
          res.render("sent", {
            username: req.user.username,
            sentLetters: foundLetters,
          });
        } else {
          res.render("sent", { username: req.user.username, sentLetters: [] });
        }
      }
    );
  } else {
    res.redirect("/");
  }
});

app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.log(err);
    }
  });
  res.redirect("/");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
