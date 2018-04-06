'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { TEST_MONGODB_URI } = require('../config');
const User = require('../models/user');
const seedUsers = require('../db/seed/users'); 
const expect = chai.expect;
const { JWT_SECRET } = require('../config');
chai.use(chaiHttp);

describe('Noteful API Login for Users', function(){
  
  const fullname = 'User Zero';
  const username = 'user0';
  const password = 'password0';
  const id = '333333333333333333333300';

  before(function(){
    return mongoose.connect(TEST_MONGODB_URI)
      .then(()=> mongoose.connection.db.dropDatabase());
  });

  beforeEach(function(){
    const testUser = seedUsers[0];
    return User.hashPassword(testUser.password)
      .then(digest => 
        User.create({
          _id: testUser._id,
          username: testUser.username,
          password: digest,
          fullname: testUser.fullname
        })
      );
  });

  afterEach(function(){
    return User.remove();
  });

  after(function(){
    return mongoose.disconnect();
  });


  describe('Local Auth Testing', function(){

    describe('Testing POST to Username and Password /api/login', function(){
      
      it('Should return a valid auth token', function () {
        return chai.request(app)
          .post('/api/login')
          .send({ username, password })
          .then(res => {
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('object');
            expect(res.body.authToken).to.be.a('string');
          
            const payload = jwt.verify(res.body.authToken, JWT_SECRET);
            expect(payload.user).to.not.have.property('password');
            expect(payload.user).to.deep.equal({ id, username, fullname });
          });
      });

      it('Should reject requests with no credentials', function(){

        return chai.request(app).post('/api/login').send({})
          .then(()=> expect.fail(null,null, 'Should not function'))
          .catch(err=>err.response)
          .then(res=>{
            expect(res.body.message).to.equal('Bad Request');
            expect(res).to.have.status(400);
          });
      });


      it('Should reject requests with incorrect usernames', function(){

        return chai.request(app).post('/api/login').send({username: 'Philly', password})
          .then(()=> expect.fail(null, null, 'Should not function'))
          .catch(err=>err.response)
          .then(res=>{
            expect(res.body.message).to.equal('Unauthorized');
            expect(res).to.have.status(401);
          });


      });


      it('Should reject requests with incorrect passwords', function(){

        return chai.request(app).post('/api/login').send({username, password:'helllloooooo'})
          .then(()=> expect.fail(null, null, 'Should not function'))
          .catch(err=>err.response)
          .then(res=>{
            expect(res.body.message).to.equal('Unauthorized');
            expect(res).to.have.status(401);
          });
      });


    });
  });


});
