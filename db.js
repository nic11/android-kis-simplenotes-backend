'use strict';

const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('user', userSchema);
exports.User = User;

const noteSchema = new mongoose.Schema({
  text: String,
  picture: {type: Buffer, contentType: String},
  archived: Boolean,
  userId: mongoose.Schema.Types.ObjectId,
}, {
  timestamps: true
});

const Note = mongoose.model('note', noteSchema);
exports.Note = Note;
