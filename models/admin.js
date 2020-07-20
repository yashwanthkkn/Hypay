var mongoose = require("mongoose");
 

// DEFINING THE SCHEMA
const AdminSchema = new mongoose.Schema({
  name: String,
  ticketsBooked: Number,
  ticketsUsed: Number,
  flowReq: Number,
  minFlow: Number,
  
});


// EXPORTING THE MODULE OBJECT
module.exports = mongoose.model("Admin",AdminSchema);