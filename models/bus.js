var mongoose = require("mongoose");
 

// DEFINING THE SCHEMA
const BusSchema = new mongoose.Schema({
  number: String,
  seats: Number,
  available: Number,
  travel_id: String,
  from: String,
  to:String,
  ftime:String,
  totime:String,
  price:String,
  key:String,
  need:Number,
  reqs:[]
});


// EXPORTING THE MODULE OBJECT
module.exports = mongoose.model("Bus",BusSchema);
