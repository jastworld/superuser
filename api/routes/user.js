var http = require('http'); 
const winston = require('winston');
var verifyToken  = require('../../verifyToken');
const jwt = require('jsonwebtoken');
const config = require('../../config');

require('winston-syslog').Syslog;

const logger = winston.createLogger({
    format: winston.format.prettyPrint(),
    transports: [
        new winston.transports.Syslog({handleExceptions: true, level: 'error' })
    ]
});

const express = require('express');
const nodemailer = require('nodemailer');
const router  = express.Router();
const randomstring  = require("randomstring");
const User = require('../../models/User');
var mongoose = require('mongoose');
var connStr = 'mongodb://192.168.1.17:27017/twitter';
//const connStr = 'mongodb://130.245.168.77:27017/twitter';

mongoose.connect(connStr,{ mongos: true },function(err) {
    if (err) throw err;
});
router.post('/adduser',function(req,res,next){
  //{ username:, password:, email: }
  var access = "abracadabra";
  var newUser = new User({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    vtoken: access
  });

  newUser.save(function(err) {
    if (err){
      return res.json({status:"error", error: err.errmsg } );
    }else{
      res.json({status:"OK" });
      let transporter = nodemailer.createTransport({
          host: 'localhost',
          port: 25,
          secure: false,
          ignoreTLS: true
      });

    transporter.sendMail({
      from: 'ubuntu@tamuneke.cse356.compas.cs.stonybrook.edu',
      to: req.body.email,
      subject: 'Please confirm your account with Twitter Clone',
      text: 'validation key: <'+access+'>'
    }, function(error){
	if (error) {
          //return res.json({status:"error", error: error } );
//          console.log("Error"+ error)
        }
      });
        //res.json({status:"OK" });
  //      console.log("All done")
    }
  });


});

router.post("/verify",function(req,res,next){
  //{ email:, key: }

    User.findOne({ email: req.body.email }, function(err, user) {
    //  console.log(user);
      if(err)
        return res.json({status:"error", error: err.errmsg});
      if (user == null){
        return res.json({status:"error", error: "email does not exist"});
      }else if(user.enabled){
        return res.json({status:"OK" });
      }else{
        if(req.body.key == user.vtoken ){
            user.enabled = true;
            //Deletes the vtoken from memory
            user.vtoken = undefined;
            user.save(function (err) {
				if (err) {
					logger.error(err);
					return res.json({status: "ERROR", error: err });
				} else {
					return res.json({status:"OK" });
				};
			});
	
          }else{
            return res.json({status:"error", error: "Invalid Token" });
          }
    }});
});


router.get("/verify",function(req,res,next){
  //{ email:, key: }

    User.findOne({ email: req.query.email }, function(err, user) {
      //console.log(user);
      if(err)
        return res.json({status:"error", error: err.errmsg});
      if (user == null){
        return res.json({status:"error", error: "User does not exist"});
      }else if(user.enabled){
        return res.json({status:"OK" });
      }else{
        if(req.body.key == user.vtoken ){
            user.enabled = true;
            user.vtoken = undefined;
            user.save();

            return res.json({status:"OK" });
          }else{
            return res.json({status:"ERROR", error: "Invalid Token" } );
          }
    }});
});

router.post("/login",function(req,res,next){
  ///login, { username:, password: }
    User.findOne({ username: req.body.username }, function(err, user) {
      if(err)
        return res.json({status:"error", error: err.errmsg});
      if (user == null){
        return res.json({status:"error", error: "User does not exist"});
      }else if(!user.enabled){
        return res.json({status:"error", error: "User is not enabled" });
      }else{
        user.comparePassword(req.body.password, function(err, isMatch) {
              if (err)
                return res.json({status:"error",error: err});
      //        console.log(req.body.password, isMatch); // -> Password123: true
              if(isMatch){
	          var token = jwt.sign({_id: user._id, username: user.username}, config.secret, {});
                  var timeless = 3153600000;
                  res.cookie('jwt', token,{maxAge: timeless});
                  return res.json({status:"OK"});
              }else{
                  return res.json({status:"error",error: "Wrong username or password"});
              }
        });

      }
    });
});

router.post("/follow",verifyToken, (req,res,next)=>{
    var username = req.user.username;
  // console.log(username)
    if(req.body.username == null){
        return res.json({status: "error"});
    }
    //else
        //res.json({status: "OK"});


    if(req.body.follow == null || req.body.follow === true){

        User.update({ username: req.body.username },{ $addToSet: { followers: username } },(err,result)=>{
//	    console.log(result)
            if(err || !result || result.nModified ==0){
                //console.log("No user");
				logger.error(err);
                return res.json({status: 'error'});
            }
        //    console.log(result)
	    
            User.update({ username: username },{ $addToSet: { following: req.body.username } },(err,result)=>{
              if(err || !result || result.nModified == 0){
                  //console.log(err);
				  logger.error(err);
                  return res.json({status: 'error'});
              }
          //    console.log(result)
		  return res.json({status: "OK"})

            });
	
        });
    }else{
      User.update({ username: req.body.username },{ $pull: { followers: username } },(err,result)=>{
        if(err || !result || result.nModified == 0){
		console.log("No user");

            return res.json({status: 'error'});
        }
	
        User.update({ username: username },{ $pull: { following: req.body.username } },(err,result)=>{
          if(err || !result || result.nModified == 0){
            //  console.log(err);
              return res.json({status: 'error'});
          }
		 return res.json({status: "OK"})

        });
      });
    }
});
router.get("/user/:username/following",(req,res,next)=>{
  var limit = 50;
  if(req.query.limit
    && req.query.limit <= 200
    && Number.isInteger(parseInt(req.query.limit, 10))
    && req.query.limit >= 0)
      limit = req.query.limit;
  if(req.query.limit)
      if(req.query.limit.includes("."))
          limit = 50;
  User.findOne({ username: req.params.username },(err,result)=>{
      //console.log(result.following);
     if(!result || err){
     	//console.log(err)
	return;
      }
      if(result.following.length<limit)
        res.json({
          status: "OK",
          users: result.following
        });
      else{
        res.json({
          status: "OK",
          users: result.following.slice(0,limit)
        });
      }
  });
  //res.json({status: "OK"})
});


router.get("/user/:username/followers",(req,res,next)=>{
  var limit = 50;

  if(req.query.limit
    && req.query.limit <= 200
    && Number.isInteger(parseInt(req.query.limit, 10))
    && req.query.limit >= 0)
      limit = req.query.limit;
  if(req.query.limit)
      if(req.query.limit.includes("."))
          limit = 50;
  User.findOne({ username: req.params.username },(err,result)=>{
      //console.log(result.following);
      if(err || !result)
        return res.json({status: "error"})
      if(result.followers.length<limit)
        res.json({
          status: "OK",
          users: result.followers
        });
      else{
        res.json({
          status: "OK",
          users: result.followers.slice(0,limit)
        });
      }
  });
});



router.get("/user/:username",(req,res,next)=>{
  ///user/<username>
  User.findOne({ username: req.params.username },(err,user)=>{
      //console.log(result.following);
      if(err || !user)
        return res.json({status: "error"})

        res.json({
          status: "OK",
          users: {
            email:user.email,
            followers: user.followers.length,
            following: user.following.length
          }
        });
  });

});


module.exports = router;
