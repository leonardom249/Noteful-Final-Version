'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user');

router.post('/users', (req, res, next)=>{

  //Check that all fields necessary are there:
  const requiredFields = ['username', 'password'];

  const missingField = requiredFields.find(field => !(field in req.body));

  if (missingField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Missing field',
      location: missingField
    });
  }

  //Check that the incoming are strings:
  const strings = ['username', 'password', 'fullName'];
  const nonStringField = strings.find(
    field => field in req.body && typeof req.body[field] !== 'string'
  );

  if(nonStringField){
    return res.status(422).json({
      code:422,
      reason: 'ValidationError',
      message: 'Incorrect field type',
      location: nonStringField
    });
  }

  //No White Spaces Allowed:
  const fieldsTrimmed = ['username', 'password'];
  const findNonTrimmedFields = fieldsTrimmed.find(field => req.body[field].trim() !==req.body[field]);

  if(findNonTrimmedFields){
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Cannot start or end with whitespace',
      location: findNonTrimmedFields
    });
  }

  //Must Be A Certain Size:
  const fieldSizes = {
    username: {min:1},
    password: {min:8, max:72}
  };

  const tooSmallField = Object.keys(fieldSizes).find(
    field =>
      'min' in fieldSizes[field] &&
            req.body[field].trim().length < fieldSizes[field].min
  );

  const tooLargeField = Object.keys(fieldSizes).find(
    field =>
      'max' in fieldSizes[field] &&
                req.body[field].trim().length > fieldSizes[field].max
  );
  if (tooSmallField || tooLargeField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: tooSmallField
        ? `Must be at least ${fieldSizes[tooSmallField]
          .min} characters long`
        : `Must be at most ${fieldSizes[tooLargeField]
          .max} characters long`,
      location: tooSmallField || tooLargeField
    });
  }

  //Create it then:
  let {username, password, fullName=''} = req.body;
  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullName
      };
      return User.create(newUser);
    })
    .then(user => {
      return res.status(201).location(`/api/users/${user.id}`).json(user);
    }).catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });

});

module.exports = router;