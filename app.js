// PACKAGES REQUIRED
var express               = require("express"),
    mongoose              = require("mongoose"),
    bodyparser            = require("body-parser"),
    passport              = require("passport"),
    LocalStrategy         = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose"),
    User                  = require("./models/user"),     
	Bus                   = require("./models/bus"),
	Admin                 = require("./models/admin"),
	QRCode = require('qrcode');

	var AWS               = require("aws-sdk");
const multer              = require('multer');
const multerS3            = require('multer-s3');
var BucketName            = "bucketforsbml";

AWS.config.region = 'ap-south-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'ap-south-1:bdc6bae3-952d-4a50-b94e-fabd18a34d9d',
});

const s3 = new AWS.S3({
  accessKeyId: 'AKIAQKY2NO7W7UFWM6XI',
  secretAccessKey: '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',
  Bucket: BucketName,
  apiVersion: '2006-03-01'
 });

 //  // Call S3 to list the buckets
s3.listBuckets(function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data.Buckets);
  }
});



 const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type, only JPEG and PNG is allowed!'), false);
    }
  }
  
  const upload = multer({
    fileFilter,
    storage: multerS3({
      acl: 'public-read',
      s3:s3,
      bucket: BucketName,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: function (req, file, cb) {
        cb(null, {fieldName: 'TESTING_METADATA'});
      },
      key: function (req, file, cb) {
        cb(null, Date.now().toString())
      }
    })
  });



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
			res.redirect("/home");
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
						var admin = new Admin({
							name:req.body.username,
							ticketsBooked:0,
							ticketsUsed:0,
							minFlow:30
						})
						admin.save();
						res.redirect("/home");
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

app.post("/myReqs/:uid",(req,res)=>{
	User.findById(req.params.uid,(err,user)=>{
		res.render("myReqs",{user:user});
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

app.post("/needRide/:uid/:bid",isLoggedIn,(req,res)=>{
	User.findById(req.params.uid,(err,user)=>{
		if(err) throw err;
		else{
			Bus.findOne({number:req.params.bid},(err,bus)=>{
				if(err){
					console.log(err);
				}else{
					// user.reqs.push({bus:bus});
					// bus.need+=1;
					// user.save();
					// bus.save();
					res.render("reqRide",{bus:bus,user:user,flag:false});
				}
			})
		}
	})
})

app.post("/putReq/:uid/:bid",upload.single("image"),(req,res)=>{
	Bus.findOne({number:req.params.bid},(err,bus)=>{
		if(err){
			console.log(err);
		}else{
			bus.reqs.push({user:req.params.uid,reason:req.body.reason,proof:req.file.location,seats:req.body.seats})
			bus.need+=1;
			bus.save();
			res.render("reqRide",{bus:bus,flag:true});
		}
	})
})

app.get("/confirmBill/:uid/:bid/:seats",isLoggedIn,(req,res)=>{
	User.findById(req.params.uid,(err,user)=>{
		if(err){
			console.log(err)
		}else{
			Bus.findOne({number:req.params.bid},(err,bus)=>{
				if(err){
					console.log(err);
				}else{
					res.render("billing",{User:user,Bus:bus,seats:req.params.seats,flag:true});
				}
			})
		}
	})
	
})

app.post("/getBill/:uid/:bid",isLoggedIn,(req,res)=>{
	User.findById(req.params.uid,(err,user)=>{
		if(err){
			console.log(err)
		}else{
			Bus.findOne({number:req.params.bid},(err,bus)=>{
				if(err){
					console.log(err);
				}else{
					res.render("billing",{User:user,Bus:bus,seats:0,flag:false});
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


// @route GET /home

app.get("/home",(req,res)=>{
	Bus.find({},(err,buses)=>{
		if(err) throw err;
		else{
			Admin.findOne({name:"admin12345"},(err,admin)=>{
				res.render("adminHome",{buses:buses,admin:admin});
			})
			
		}
	})
	
})

app.get("/viewReq/:id",(req,res)=>{
	Bus.findOne({number:req.params.id},(err,bus)=>{
		res.render("viewReq",{bus:bus});	
	})
})

app.get("/acceptReq/:uid/:bid/:seats",(req,res)=>{
	User.findById(req.params.uid,(err,user)=>{
		user.accepts.push({bus:req.params.bid,seats:req.params.seats});
		user.save();
		var temp = [];
		Bus.findOne({number:req.params.bid},(err,bus)=>{
			bus.reqs.forEach((x)=>{
				if(x.user == req.params.uid && x.seats == req.params.seats){
					temp.push(x);
				}
			})
			bus.reqs = temp;
			bus.save();
			res.redirect("/viewReq/"+req.params.bid);
		})
		
	})
	
})

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
		key:req.body.conductorKey,
		need:0
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

app.get("/busData/:number",(req,res)=>{
	Bus.findOne({number:req.params.number},(err,bus)=>{
		res.render("busData",{bus:bus});
	})
	
})

app.get("/reset/:number",(req,res)=>{
	Bus.findOne({number:req.params.number},(err,bus)=>{
		bus.available = bus.seats;
		bus.save();
		res.render("busData",{bus:bus});
	})
	
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
					Admin.findOne({name:"admin12345"},(err,admin)=>{
						admin.ticketsBooked++;	
						admin.save();	
						res.render("transSuccess",{tid:req.body.TXNID,oid:req.body.ORDERID,amt:req.body.TXNAMOUNT,tdate:req.body.TXNDATE});
					})
					
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
	Admin.findOne({name:"admin12345"},(err,admin)=>{
		admin.ticketsBooked--;
		admin.ticketsUsed++;	
		admin.save();				
		res.render("scanSuccess");
	})
	
})

app.get("/scanFail",(req,res)=>{
	res.render("scanFail");
})

// LISTENING PORT
app.listen(process.env.PORT || 3000,function(){
	console.log("HyPaY Server started");
});
