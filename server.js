const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const {Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');

const db = require('./db');
const secrets = require('./secrets');


passport.use(new JwtStrategy({
  secretOrKey: secrets.JWT_KEY,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
}, (payload, done) => {
  if (!payload || !payload.user) {
    return done(null, false);
  }
  return done(null, payload.user);
}));

// {usernameField, passwordField}
passport.use('login', new LocalStrategy(db.User.authenticate()));
passport.serializeUser(db.User.serializeUser());
passport.deserializeUser(db.User.deserializeUser());

mongoose.connect('mongodb://localhost/kis_simplenotes', {useNewUrlParser: true, useUnifiedTopology: true});

db.User.register(new db.User({username: 'jill'}), 'birthday', (err, account) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('registered ', account);
});


const app = express();

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(express.json());

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.use('/api', require('./api').router);

app.listen(3000, 'localhost');
