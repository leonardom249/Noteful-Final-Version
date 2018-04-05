'use strict';

const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');
const Note = require('../models/note');
const Tag = require('../models/tag');
const Folder = require('../models/folder');


const app = express();
const passport = require('passport');

const jwtAuth = app.use(passport.authenticate('jwt', { session: false, failWithError: true }));


const validateTagUser = function (userId, tags = []){
  if(tags.length > 0){
    return Tag.find({$and : [{_id: {$in:tags}, userId}]})
      .then(result =>{
        if(tags.length !== result.length){
          return Promise.reject('Invalid tag');
        }
      });
  }
  else{
    Promise.resolve();
  }
};

const validateFolderUser = function (userId, folderId){
  if(!folderId){
    return Promise.resolve();
  }
  return Folder.findOne({_id:folderId, userId})
    .then(result => {
      if(!result){
        return Promise.reject('Invalid Folder');
      }
    });
};

/* ========== GET/READ ALL ITEMS ========== */
router.get('/notes', jwtAuth, (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const userId = req.user.id;
  let filter = {userId};

  /**
   * BONUS CHALLENGE - Search both title and content using $OR Operator
   *   filter.$or = [{ 'title': { $regex: re } }, { 'content': { $regex: re } }];
  */

  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.title = { $regex: re };
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  Note.find(filter)
    .populate('tags')
    .sort('created')
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/notes/:id', jwtAuth, (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({_id:id, userId})
    .populate('tags')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/notes', jwtAuth, (req, res, next) => {
  let { title, content, folderId=null, tags } = req.body;
  const userId = req.user.id;
  const newItem = { title, content, folderId, tags, userId };
  


  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (tags) {
    tags.forEach((tag) => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error('The `id` is not valid');
        err.status = 400;
        return next(err);
      }
    });
  }


  if (!folderId){
    folderId = null;
  }

  const valFolderIdProm = validateFolderUser(userId, folderId);
  const valTagIdsProm = validateTagUser(userId, tags);

  Promise.all([valFolderIdProm, valTagIdsProm])
    .then(()=> Note.create(newItem))
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if(err ==='Invalid Folder'){
        err = new Error('The folder is invalid');
        err.status = 400;
      }
      if(err ==='Invalid Tag'){
        err = new Error('The tag is invalid');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/notes/:id', jwtAuth, (req, res, next) => {
  const { id } = req.params;
  const { title, content, folderId, tags } = req.body;
  const userId = req.user.id;
  const updateItem = { title, content, folderId, tags };
  const options = { new: true };
  const valFolderIdProm = validateFolderUser(userId, folderId);
  const valTagIdsProm = validateTagUser(userId, tags);
  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (mongoose.Types.ObjectId.isValid(folderId)) {
    updateItem.folderId = folderId;
  }

  if (tags) {
    tags.forEach((tag) => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error('The `id` is not valid');
        err.status = 400;
        return next(err);
      }
    });
  }



  Promise.all([valFolderIdProm,valTagIdsProm])
    .then(()=> Note.findOneAndUpdate({_id:id, userId}, updateItem, options)
      .populate('tags'))
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if(err === 'Invalid Folder'){
        err = new Error('The folder is not valid');
        err.status = 400;
      }
      if(err === 'Invalid Tag'){
        err = new Error('The tag is not valid');
        err.status= 400;
      }
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/notes/:id', jwtAuth, (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  Note.findOneAndRemove({_id:id, userId})
    .then((result) => {
      if(result){
        res.status(204).end();
      }
      else{
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;