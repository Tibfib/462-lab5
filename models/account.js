let mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

const Account = new Schema({
    nickname: String,
    birthdate: Date,
    foursquare_code: String
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
