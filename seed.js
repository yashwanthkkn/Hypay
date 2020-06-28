var mongoose = require("mongoose");

mongoose.connect('mongodb://localhost/HypayDb', {
	
  useNewUrlParser: true,
  useUnifiedTopology: true

});

// MODEL REQUIREMENTS
const User = require("./models/user")

User.deleteMany({},function(err,res){
	if(err){
		console.log("could not delete db");
	}else{
		console.log(res);
	}
});