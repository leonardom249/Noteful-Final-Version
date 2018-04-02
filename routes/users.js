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

  if( nonStringField){
    return res.status(422).json({
      code:422,
      reason: 'ValidationError',
      message: 'Incorrect field type',
      location: nonStringField
    });
  }
  //Create it then:
  let {username, password, fullName=''} = req.body;

  //   return User.find({username}).count()
  //     .then(count=>{
  //       if(count>0){
  //         return Promise.reject({
  //           code: 422,
  //           reason: 'ValidationError',
  //           message: 'Username already taken',
  //           location: 'username'
  //         });  
  //       }
  //     })
  //     .then(()=>{
  return User.hashPassword(password)
    // })
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