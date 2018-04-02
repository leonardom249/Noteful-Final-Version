'use strict';

const express = require('express');
const router = express.Router();
const passport= require('passport');



const options = {session: false, failWithError: true};
const localAuth = passport.authenticate('local', options);

router.post('/login', localAuth, function(req, res) {
  console.log(`${req.user.username} successfully logged in.`);
  return res.json('Hello ' + req.user.username +' ' + req.user);

});

module.exports = router;