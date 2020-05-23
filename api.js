'use strict';

const debug = require('debug');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const {addAsync} = require('@awaitjs/express');
const sharp = require('sharp');

const {Note, User} = require('./db');
const secrets = require('./secrets');

const auth = passport.authenticate('jwt', {session: false});

const router = addAsync(express.Router());

router.get('/ping', (req, res) => {
  res.json({pong: "pong!"});
});

router.post('/login', (req, res, next) => {
  passport.authenticate('login', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // likely auth error
      return next(new Error('user is falsy'));
    }
    req.login(user, {session: false}, (err) => {
      if (err) {
        return next(err);
      }
      const payload = {user: {_id: user._id, username: user.username}};
      jwt.sign(payload, secrets.JWT_KEY, (err, token) => {
        if (err) {
          return next(err);
        }
        return res.json({token});
      });
    });
  })(req, res, next);
});

router.post('/register', (req, res, next) => {
  User.register(new User({username: req.body.username}), req.body.password, (err, account) => {
    if (err) {
      return next(err);
    }
    console.log('registered ', account);
    passport.authenticate('login', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        // likely auth error
        return next(new Error('user is falsy'));
      }
      req.login(user, {session: false}, (err) => {
        if (err) {
          return next(err);
        }
        const payload = {user: {_id: user._id, username: user.username}};
        jwt.sign(payload, secrets.JWT_KEY, (err, token) => {
          if (err) {
            return next(err);
          }
          return res.json({token});
        });
      });
    })(req, res, next);
  });
});

router.get('/me', auth, (req, res) => {
  res.json(req.user);
});

router.getAsync('/notes', auth, async (req, res) => {
  const docs = await Note.find({userId: req.user._id}).exec();
  const notes = docs.map((doc) => ({
    _id: doc._id,
    text: doc.text,
    pictureB64: doc.picture? doc.picture.toString('base64') : null,
    archived: doc.archived,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));
  res.json({ok: true, notes});
  // debug('kek')
});

router.postAsync('/notes', auth, async (req, res) => {
  const picture =
    req.body.imageB64?
      await sharp(Buffer.from(req.body.imageB64, 'base64'))
        .rotate()  // fix EXIF rotation tag
        .resize({width: 480, height: 640, fit: 'cover'})
        .toBuffer()
    : null;
  const noteRaw = {
    text: req.body.text,
    picture,
    archived: req.body.archived,
    userId: req.user._id,
  };
  const note = new Note(noteRaw);
  console.log(note);
  await note.save();
  res.json({ok: true, noteId: note._id});
});

router.putAsync('/notes/:id', auth, async (req, res) => {
  const note = await Note.findById(req.params.id).exec();
  if (!note || note.userId.toString() != req.user._id) {
    return res.status(404).json({ok: false, message: 'Note not found or no access'});
  }
  for (const [k, v] of Object.entries(req.body)) {
    note[k] = v;
  }
  await note.save();
  console.log(note);
  res.json({ok: true, noteId: note._id});
});

router.deleteAsync('/notes/:id', auth, async (req, res) => {
  const {deletedCount} = await Note.deleteOne({_id: req.params.id}).exec();
  if (deletedCount == 0) {
    res.status(404);
  }
  res.json({ok: true, deletedCount});
});

exports.router = router;
