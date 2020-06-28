var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose"); 

// DEFINING THE SCHEMA
const UserSchema = new mongoose.Schema({
  username: String,
  uname: String,
  password: String,
});

UserSchema.plugin(passportLocalMongoose);
// EXPORTING THE MODULE OBJECT
module.exports = mongoose.model("User",UserSchema);
