var http = require('http');
var path = require('path');
var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var session = require('express-session');
var MongoClient = require("mongodb").MongoClient;
var url = "mongodb://localhost:27017/";

var app = express(); 


app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'ejs');

var entries = [];

//app.locals.entries = entries; //storing in local array

app.use(logger("dev"));

app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());
app.use(session({
	secret:"secretSession",
	resave:true,
	saveUninitialized:true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done){
	done(null, user);
});

passport.deserializeUser(function(user, done){
	done(null, user);
});

var userHost;

LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy({
	usernameField:'',
	passwordField:''
	},
	function(username, password, done){
		MongoClient.connect(url, function(err, db){
			if(err) throw err;

			var dbObj = db.db("users");
			dbObj.collection("users").findOne({username:username}, function(err, results){
				if(err) throw err;
				if(results){
					if(results.password === password){
					var user = results;
					userHost = user;
					done(null, user);
				}
				else{
					done(null, false,{mesage:'Bad Password'});
				}
			}
			else done(null, false, {mesage: 'User not found'});
			});
		});
	}
	));

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		next();
	}
	else{
		res.redirect("/sign-in");
	}
}

app.get('/logout', function(req, res){
	req.logout();
	res.redirect("/sign-in");
});

app.get("/", ensureAuthenticated,function(request,response){
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		var dbObj = db.db(userHost.username.toString());
		dbObj.collection("movies").find().sort({rank:1}).toArray(function(err, results){
			console.log("Site Served");
			db.close();
			response.render("index", {movies:results});
		});
	});
});

app.get("/new-entry", ensureAuthenticated, function(request,response){
	response.render("new-entry");
});

app.get("/sign-in", function(request,response){
	response.render("sign-in");

});

app.post("/new-entry", function(request,response){
	if(!request.body.rank||!request.body.name){
		response.status(400).send("Entries must have some text!");
		return;
	}

	MongoClient.connect(url, function(err, db){
		if(err) throw err;

		var dbObj = db.db(userHost.username.toString());

		dbObj.collection("movies").save(request.body, function(err, results){
			if(err) throw err;

			console.log("Data Saved");
			db.close;
			response.redirect("/");
		});
	});

/*	entries.push({
		title:request.body.title,
		body:request.body.body,
		published:new Date()
	});
	response.redirect("/"); */
});

app.post("/sign-up", function(request, response){
	console.log(request.body);

	MongoClient.connect(url, function(err, db){
		if(err) throw err;

		var dbObj = db.db("users");
		
		var user = {
			username: request.body.username,
			password: request.body.password
		};

		dbObj.collection("users").insert(user, function(err, results){
			if(err) throw err;

			request.login(request.body, function(){
			response.redirect('/sign-in');
			});
		});
	});

});

app.post("/sign-in", passport.authenticate('local', {
	failureRedirect:'/sign-in'
	}), function(request, response){
			response.redirect('/');
	});

app.get('/profile', function(request, response){
		response.json(request.user);
	});

app.use(function(request, response){
	response.status(404).render("404");
});


http.createServer(app).listen(3000, function(){
	console.log("Game library server started on port 3000");
});





