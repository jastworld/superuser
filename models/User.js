
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Schema = mongoose.Schema;
var config = require('../config');
const SALT_WORK_FACTOR = config.SALT_FACTOR;


var UserSchema = new Schema({
	username : {
		type: String,
		required: [true, "can't be blank"],
		match: [/^[a-zA-Z0-9]+$/, 'is invalid'],
		unique: true,
		index: true
	},
	email: {
		type: String,
		lowercase: true,
		required: [true, "can't be blank"],
		match: [/\S+@\S+\.\S+/, 'is invalid']
	},
  vtoken:{
    type: String
  },
	password: { type: String, required: true },
	enabled:{
		type: Boolean,
		default: false
	},
	followers: [{
		type: String
	}],
	following: [{
		type: String
	}],
},{timestamps: true, collection: 'userCollection'});
UserSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            user.password = hash;
            next();
        });
    });
});

UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};



module.exports = mongoose.model('User', UserSchema);
