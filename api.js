'use strict';

const debug = require('debug');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const {addAsync} = require('@awaitjs/express');

const {Note} = require('./db');
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

router.get('/me', auth, (req, res) => {
  res.json(req.user);
});

router.getAsync('/notes', auth, async (req, res) => {
  const docs = await Note.find({userId: req.user._id}).exec();
  res.json({ok: true, notes: docs});
  // debug('kek')
});

router.postAsync('/notes', auth, async (req, res) => {
  const note = new Note({...req.body, userId: req.user._id});
  console.log(note);
  await note.save();
  res.json({ok: true, noteId: note._id});
});

router.putAsync('/notes/:id', auth, async (req, res) => {
  const note = await Note.findById(req.params.id).exec();
  console.log(note);
  if (!note || note.userId.toString() != req.user._id) {
    return res.status(404).json({ok: false, message: 'Note not found or no access'});
  }
  for (const [k, v] of Object.entries(req.body)) {
    note[k] = v;
  }
  await note.save();
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
