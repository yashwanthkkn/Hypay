// PACKAGES REQUIRED
var express               = require("express"),
    mongoose              = require("mongoose"),
    bodyparser            = require("body-parser"),
    passport              = require("passport"),
    LocalStrategy         = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose"),
    User                  = require("./models/user"),     
	Bus                  = require("./models/bus"); 


var app = express();
var check = false;

// TO ENABLE BODY PARSING
app.use(bodyparser.urlencoded({extented:true}));

app.use(require("express-session")({
	secret : "ThisIsNotMy Random_Salt",
	resave : false,
	saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());


passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// TO INTIMATE EXPRESS TO LOOK IN THAT Dir()
app.use(express.static('public'));


// CONNECTING THE DATABASE TO THE SERVER
// mongoose.connect('mongodb://localhost/HypayDb', {
	
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   useFindAndModify: false,
//   useCreateIndex:true

// }); 


mongoose.connect('mongodb+srv://user:a8LwrJEsdShxeS9c@cluster0-f0akj.mongodb.net/HypayDb?retryWrites=true&w=majority', {
	
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex:true

});

// FUNCTION TO DISPALY THE ENTIRE DB
function displayUsers(){

	User.find({},function(err,res){
		if(err){
			console.log("Cannot display all user data");
		}else{
			console.log(res);
		}
	});

}

// SETTING UP THE VIEW ENGINE
app.set("view engine","ejs");

// ************
// LOGIN ROUTES
// ************

app.get("/",function(req,res){
	//CALLING THE LOGIN PAGE
	res.render("login",{check:false});
	check = false;
});

app.get("/login",function(req,res){
	//CALLING THE LOGIN PAGE
	res.render("login",{check:false});
	check = false;
});


app.get("/login/err",function(req,res){
	//CALLING THE LOGIN PAGE
	res.render("login",{check:true});
	check = false;
});

app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login/err'}),
  function(req, res) {
	if(req.user){
		if(req.body.username == 'admin12345'){
			res.redirect("/addBus");
		}else{
			res.redirect("/logged");	
		}
	}
  });

// FUNCTION TO CHECK LOG-IN STATUS

function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	res.redirect("/");
}

app.get("/logged",isLoggedIn,function(req,res){
	
	User.findById(req.user.id,(err,user)=>{
		if(err){
			console.log(err);
		}else{
			var User = {ud:req.user.id,uname:req.user.uname};
			res.render("logged",{User:User});
		}
	})
	
});

// ************
// SIGNUP ROUTES
// ************

app.get("/signup",function(req,res){
	//CALLING THE SIGNUP PAGE
	res.render("signup",{exists:false});
	exists = false;
});


app.post("/register",function(req,res){
	User.register(new User({uname:req.body.uname,username:req.body.username}),req.body.password,function(err,user){
		if(err){
			if(err.name === "UserExistsError"){
				res.render("signup",{exists:true});
			}else{
				res.send("could not be added to the db");
			}
		}else{
			passport.authenticate('local')(req,res,function(){
				if(req.user){
					if(req.body.username == 'admin12345'){
						res.redirect("/addBus");
					}else{
						res.redirect("/logged");	
					}
				}
			})
		}
		
	});	
});

// *************
// BOOK ROUTES
// *************

app.post("/bookBus/:id",isLoggedIn,(req,res)=>{
	var User = {ud:req.params.id};
	var selector = req.body.pickup+req.body.drop;
	Bus.find({travel_id:selector},(err,buses)=>{
		if(err){
			console.log(err);
		}else{
			res.render("busList",{Buses:buses,User:User});
		}
	});
});

app.post("/getBill/:uid/:bid",isLoggedIn,(req,res)=>{
	console.log(req.params);
	User.findById(req.params.uid,(err,user)=>{
		if(err){
			console.log(err)
		}else{
			Bus.findOne({number:req.params.bid},(err,bus)=>{
				if(err){
					console.log(err);
				}else{
					res.render("billing",{User:user,Bus:bus});
				}
			})
		}
	})
	
})

app.post("/paymentGateway/:uid/:bid",isLoggedIn,(req,res)=>{
	console.log(req.params);
	console.log(req.body);
	res.render("paymentGateway");
})

// *************
// LOGOUT ROUTES
// *************

app.get("/logout",(req,res)=>{
	req.logout();
	res.redirect("/");
});


// *************
// Add Bus to Db
// *************

app.get("/addBus",isLoggedIn,(req,res)=>{
	res.render("addBus",{flag:""});
})


app.get("/updateBus",isLoggedIn,(req,res)=>{
	res.render("updateBus",{flag:""});
})


app.get("/deleteBus",isLoggedIn,(req,res)=>{
	res.render("deleteBus",{flag:""});
})

app.post("/addBus",(req,res)=>{
	var bus = new Bus({
		number:req.body.number,
		seats:req.body.seats,
		travel_id:req.body.travel_id,
		from:req.body.from,
		to:req.body.to,
		available:req.body.seats,
		ftime:req.body.ftime,
		totime:req.body.totime,
		price:req.body.price
	});
	Bus.findOne({number:req.body.number},(err,user)=>{
		if(err){
			console.log(err)
		}else if(user == null){
			bus.save((err,bus)=>{
				if(err){
					console.log(err);
				}
				else{
					res.render("addBus",{flag:"Added to db"});
				}
			});
		}else{
			res.render("addBus",{flag:"Bus already exists"});
		}
	})
	
})

app.post("/updateBus",(req,res)=>{
	Bus.findOne({number:req.body.number},(err,user)=>{
		if(err){
			console.log(err)
		}else if(user == null){
			res.render("updateBus",{flag:"No such Bus found"});
		}else{
			console.log(user);
			user.number=req.body.number;
			user.seats=req.body.seats;
			user.travel_id=req.body.travel_id;
			user.from=req.body.from;
			user.to=req.body.to;
			user.available=req.body.seats;
			user.ftime=req.body.ftime;
			user.totime=req.body.totime;
			user.price=req.body.price;
			console.log(user);
			user.save();
			res.render("updateBus",{flag:"Successfully updated"});
		}
	})
})

app.post("/deleteBus",(req,res)=>{
	console.log(req.body);
	Bus.deleteOne({number:req.body.bid},(err,bus)=>{
		if(err){
			console.log(err);
		}else{
			console.log(bus.n);
			if(bus.n == 0 ){
				res.render("deleteBus",{flag:"Bus not found"})
			}else{
				res.render("deleteBus",{flag:"Successfully deleted"})
			}
		}
	});
})
// LISTENING PORT
app.listen(process.env.PORT || 3000,function(){
	console.log("HyPaY Server started");
});
