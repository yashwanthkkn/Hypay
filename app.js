// PACKAGES REQUIRED
var express               = require("express"),
    mongoose              = require("mongoose"),
    bodyparser            = require("body-parser"),
    passport              = require("passport"),
    LocalStrategy         = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose"),
    User                  = require("./models/user"),     
	Bus                  = require("./models/bus"),
	QRCode = require('qrcode');

const checksum_lib = require("./paytm/lib/checksum");
const port = 3000; 

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

mongoose.connect('mongodb+srv://user:nN6JAsww5cMup1Ai@cluster0-f0akj.mongodb.net/HypayDb?retryWrites=true&w=majority', {
	
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
	User.register(new User({uname:req.body.uname,orders:0,username:req.body.username}),req.body.password,function(err,user){
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
// MY Trips ROUTE
// *************

app.post("/mytrips/:uid",isLoggedIn,(req,res)=>{
	User.findById(req.params.uid,(err,user)=>{
		if(err){
			console.log(err);
		}
		else{
			if(user.txns.length == 0){
				res.render("mytripsemt");
			}else{
				res.render("mytrips",{User:user});
			}
		}
	})
})

// *************
// ABOUT ROUTE
// *************

app.get("/about",(req,res)=>{
	
	res.render("about");
})

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
		price:req.body.price,
		key:req.body.conductorKey
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

// *************
// Payment gateway
// // *************

app.post("/paymentGateway/:uid/:bid",(req,res)=>{
	User.findById(req.params.uid,(err,user)=>{
		if(err){
			console.log(err);
		}else{
			Bus.findOne({number:req.params.bid},(err,bus)=>{
				if(err){
					console.log(err);
				}else{
					if(user.orders == undefined){
						user.orders = 0;
						
					}
					var orders = user.orders;
					orders++;
					user.orders++;
					user.save();
					let params = {}
					params['MID'] = "WAMbVz76726588946815",
					params['WEBSITE'] = "WESTAGING",
					params['CHANNEL_ID'] = 'WEB',
					params['INDUSTRY_TYPE_ID'] = 'Retail',
					params['ORDER_ID'] = 'ORD'+user.id+orders,
					params["CUST_ID"] = "CUST"+user.id,
					params['TXN_AMOUNT'] = req.body.netcost,
					params["CALLBACK_URL"] = "https://hypay.herokuapp.com/callback/"+user.id+"/"+bus.number+"/"+req.body.seats,
					// params["CALLBACK_URL"] = "http://localhost:3000/callback/"+user.id+"/"+bus.number+"/"+req.body.seats,
					params["EMAIL"] = 'xyz@gmail.com',
					params["MOBILE_NO"] = user.username
				
					checksum_lib.genchecksum(params,"jBP8D58qRBMqBj&t",(err,checksum)=>{
						let txn_url = "https://securegw-stage.paytm.in/order/process"
				
						let form_fields = ""
				
						for(x in params){
							form_fields += "<input type='hidden' name='"+x+"' value='"+params[x]+"'/>"
						}
				
						form_fields += "<input type='hidden' name='CHECKSUMHASH' value='"+checksum+"'>"
				
						var html = '<html><body><center><h1>Please wait ..Do not refresh this page</h1></center><form method="POST" action="'+txn_url+'" name="f1">'+form_fields+'</form><script type="text/javascript">document.f1.submit()</script></body></html>'
						res.writeHead(200,{'Content-Type':"text/html"})
						res.write(html)
						res.end()
					})
				}
			})
		}
	})

})

app.post("/callback/:uid/:bid/:seats",(req,res)=>{
	if(req.body.STATUS == 'TXN_SUCCESS'){
		User.findById(req.params.uid,(err,user)=>{
			if(err){
				console.log(err);
			}
			Bus.findOne({number:req.params.bid},(err,bus)=>{		
				req.body.bus = req.params.bid;
				req.body.seats = req.params.seats;
				req.body.from = bus.from;
				req.body.to = bus.to;
				req.body.ftime = bus.ftime;
				req.body.totime = bus.totime;
				var qrtext = user.username+" "+req.body.TXNID;
				QRCode.toDataURL(qrtext, function (err, url) {
					req.body.qr64 = url;
				})
				user.txns.push(req.body);
				user.save();
				if(err){
					console.log(err);
				}else{
					bus.available--;
					bus.save();
					res.render("transSuccess",{tid:req.body.TXNID,oid:req.body.ORDERID,amt:req.body.TXNAMOUNT,tdate:req.body.TXNDATE});
				}					
			})
		})
		
	}else{
		res.render("transFail",{res:req.body.RESPMSG});
	}

});

app.get("/cLogin",(req,res)=>{
	res.render("conductorLogin",{check:false});
});

app.post('/conductorLogin',(req,res)=>{
	Bus.findOne({number:req.body.username},(err,bus)=>{
		if(err) throw err;
		else{
			if(bus.key == req.body.password){
				res.redirect("/scanQR");
			}else{
				res.render("conductorLogin",{check:true});
			}
		}
	})
	
})

app.get("/scanQR",(req,res)=>{
	res.render("codeScanner");
})

app.post('/checkqr/:qrtext',(req,res)=>{
	var split = req.params.qrtext.split(" ");
	var username = split[0];
	var tid = split[1];
	User.findOne({username:username},(err,user)=>{
		if(err) throw err;
		else{
			var n = -1;
			for(var i = 0 ;i<user.txns.length;i++){
				if(user.txns[i].TXNID == tid ){
					res.redirect("/scanSuccess");
					n=i;
					user.txns.splice(n,1);
					user.save();
					break;
				}
			}
			if(n == -1){
				res.redirect("/scanFail");
			}
		}
	})

});

app.get("/scanSuccess",(req,res)=>{
	res.render("scanSuccess");
})

app.get("/scanFail",(req,res)=>{
	res.render("scanFail");
})

// LISTENING PORT
app.listen(process.env.PORT || 3000,function(){
	console.log("HyPaY Server started");
});
