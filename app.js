/*
 * @author Philipp Bahnmüller (742233), Kevin Schrötter (742082)
 */

// Server

var express = require('express');
var app = express();
var fs = require('fs');
var port = process.env.PORT || 3000;
var path = require('path');
//var http = require('http').Server(app);
var https = require('https');
var httpsOptions = {
	cert: fs.readFileSync(path.join(__dirname, 'ssl','server.crt')),
	key: fs.readFileSync(path.join(__dirname, 'ssl','server.key'))
}
var server = https.createServer(httpsOptions, app)
 .listen(port, function(){
	console.log('listening on *:' + port + " using https!");
});
app.enable('trust proxy');
var io = require('socket.io').listen(server);

var router = express.Router();
/*
 * Cloudant information and credentials
 * Dashboard URL: https://f1309e1c-4774-4f1e-8621-7881c5bc0f78-bluemix.cloudant.com/dashboard.html#/
 */
var Cloudant = require('cloudant'); //for establishing connection with the ibm cloudant service
var me = 'f1309e1c-4774-4f1e-8621-7881c5bc0f78-bluemix';  //Account name
var apiKey = 'veringetneredsorytoricry';	//From Cloudant generated API Key
var apiPW = 'ac834bca3e30393e4208ac1a5aa1c56a1074f6b1';	//Password for the generated API Key


// Database connection with Cloudant. This is an example for a synchronous call!!
/*
var cloudant = Cloudant({account:username, password:password});

// Remove any existing database called "alice".
cloudant.db.destroy('alice', function(err) {

  // Create a new "alice" database.
  cloudant.db.create('alice', function() {

    // Specify the database we are going to use (alice)...
    var alice = cloudant.db.use('alice')

    // ...and insert a document in it.
    alice.insert({ crazy: true }, 'rabbit', function(err, body, header) {
      if (err) {
        return console.log('[alice.insert] ', err.message);
      }

      console.log('You have inserted the rabbit.');
      console.log(body);
    });
  });
});
*/
//MONGOOSE Connection - No longer needed due to requirements within exercise2 from cloud computing
/*
var mongoose = require('mongoose');
mongoose.connect('mongodb://CCBSHSRT:CCBSHSRT1234@ds149820.mlab.com:49820/cloudcomputing');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log('Database connected!');
});

var accountSchema = mongoose.Schema({
    username: String,
    password: String
});

var Account = mongoose.model('Account', accountSchema);
*/

// Funktionen

var sockets = {};

//Creating a static folder 'public' so that the html files are able to load local scripts and pages
app.use(express.static(path.join(__dirname,'public')));
app.use(router);
/*var httpsOptions = {
	cert: fs.readFileSync(path.join(__dirname, 'ssl','server.crt')),
	key: fs.readFileSync(path.join(__dirname, 'ssl','server.key'))
}
https.createServer(httpsOptions, app)
 .listen(port, function(){
	console.log('listening on *:' + port);
});*/
//app.use('/static',express.static(path.join(__dirname,'public')));
console.log("Public folder initialized");

/*
 * It seems like Node JS automatically uses a file called index.html
 * for the default route '/'. There it doesn't matter, where exactly the file
 * is located as long as it is somehwhere near the main directory
 * or the public directory
 */
router.get('/login', function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});

/*
 * Route that shows the login page/registration page
 */
router.get('/index', function(req, res){
	res.sendFile(__dirname + '/public/index.html');	
});

/*
 * Route that displays the chat itself
 */
router.get('/chat', function(req, res){
	res.sendFile(__dirname + '/public/chat.html');	
});

/*
 * Route uses for internal testing
 */
router.get('/test', function(req,res){
	res.sendFile(__dirname + '/public/test.html');
});

/*
 * This plays a message to a user when he connects to the chatroom
 */
io.on('connection', function(socket){
	console.log("Connected to server!");
	
	/*
	 * Function that boradcasts a message sent from a single chat user to all other users
	 */
	socket.on('chat message', function(msg){
		socket.broadcast.emit('chat message', msg);
	});
	
	/*
	 * This Method sends a broadcast to all chat users when a user disconnects. It also sends the name of the disconnected user
	 */
	socket.on('disconnect',function(){
		io.emit('user disconnect',"User "+socket.username+" disconnected!");
		delete sockets[socket.username];
	});
	
	/*
	 * Function that updates the saved user-socket-pair information whenever a already logged in user changes the html page on the client
	 * It also sends a broadcast to all users saying that a new user including its username connected
	 */
	socket.on('validate user',function(username){
		socket.username = username;
		sockets[username] = socket;
		io.emit('user connect',"User "+username+" connected!");
	});
	
	/*
	 * Function that sends a private message from a user client(the emitting socket) to a receiver(data.to)
	 */
	socket.on('private message',function(data){
		if(sockets[data.to]){
			sockets[data.to].emit('private message',data);
		}
		else{
			socket.emit('error message',{msg: "User '"+data.to+"' not found!"});
		}
	});
	
	/*
	 * This function sends all usernames to the client after it received the /list prompt from the user
	 */
	socket.on('get usernames',function(){
		socket.emit('get usernames',Object.keys(sockets));
	});
 
	/*
	 * This function searches a user given by the client in the database
	 * 0: At first, the database directly searches for the name
	 *    there are several cases that can appear then:
	 * 1: No User found + No New User Creation Request -> ERROR "No such user for login"
	 * 2: No User found + New User Creation Request -> CONFIRM "User created"
	 * 3: User Found + New User Creation Request -> ERROR "Username already taken"
	 * 4: User Found + No New User Creation Request -> ENTER PASSWORD AND Split in 2 again
	 *  4.1 Incorrect password -> ERROR "INCORRECT PASSWORD"
	 *  4.2 Correct password -> CONFIRM "LOGIN SUCCESSFUL" + Redirect to chat
	 */
	socket.on('login request', function(data){
		//Establishing Cloudant Database Connection using Account name and API Key information from Cloudant Dashboard
		Cloudant({account:me, key:apiKey, password:apiPW},function(err,cloudant){
			if(err){
				return console.log('Failed to initialize Cloudant DB cccloudchatdb: '+err.message);
			}
			console.log('');
			console.log('');
			console.log('###########################################');
			console.log("Connection to Cloudant database successful!");
			//Choosing cccloudchatdb as the database that shall be used
			var chatDB = cloudant.db.use("cccloudchatdb");//cloudchatdb is the name of the used database in Cloudant!
			/* 
			 * CASE 0 -> Search for client-given username in database
			 */
			chatDB.find({selector:{username:data.username}},function(er, result){
				console.log("Searching for user: "+data.username+"...");
				if(er){
					throw er;
				}
				//No User Found
				if(!result.docs[0]){
					console.log("user "+data.username+" is not in database!");
					/*
					* CASE 1 No Found User + No New User Creation Request -> It is a login request -> Login-ERROR
					*/
					if(data.newuser === "false"){
						console.log("You wanted to login...");
						console.log("Username "+data.username+" not found in database!");
						socket.emit('login response',{successful: "false",reason: "This name does not exist!"});
					}
					/*
					 * CASE 2 No Found User + New User Creation Request -> Creation-SUCCESS
					 */
					else{
						console.log("You wanted to register a new account...");
						    chatDB.insert({username: data.username, password: data.password}, function(err, body, header) {
								if (err) {
									return console.log('[database.insert] ', err.message);
								}
								console.log('New user '+data.username+' created!');
								socket.emit('login response', {successful: 'true'});
							});
					}
				}
				/*
				 * CASE 3 User Found + New User Creation Request -> Creation-ERROR
				 */
				else{
					console.log("User "+data.username+" found!");
					if(data.newuser === "true"){
						console.log("You wanted to create a new user...");
						console.log("Username already taken!");
						socket.emit('login response',{successful: 'false',reason: 'Username already taken!'});
					}
					/*
					 * CASE 4 User Found + No New User Creation -> It is a login request -> CHECK PASSWORD
					 */
					else{
						console.log("You wanted to login...");
						chatDB.find({selector:{password:data.password}},function(er, result){
							console.log("Checking password...");
							if(er){
								throw er;
							}
							/*
							 * CASE 4.1 INCORRECT PASSWORD -> Password-ERROR
							 */
							if(!result.docs[0]){
								console.log("Incorrect password!");
								socket.emit('login response',{successful: 'flase',reason: 'Incorrect password!'});
							}
							/*
							 * CASE 4.2 CORRECT PASSWORD -> Redirect to chat
							 */
							else{
								console.log("Correct password! "+data.username+" redirected to chatroom!");
								socket.emit('login response',{successful:'true'});
							}
						});
					}
				}
			});
		});
	});
});
 
 /*
  //OLD MONGODB CODE -> Not used anymore! Stays there in case something with Cloudant goes wrong!
  socket.on('login request', function(data){	  
	 if(data.newuser === "true"){
		 Account.findOne({username: data.username}, function(err,account){
			 if (err){
				 return console.error(err);
			 }
			 else{
				if(account === null){
					 var user = new Account({username: data.username,password: data.password});
				 	  user.save(function (err, user) {
				 		  if (err){ 
				 			  return console.error(err);
				 		  }
				 		  else{
				 			 console.log('User '+data.username+' created a new account!');
				 			 socket.emit('login response',{successful: "true"});
				 		  }
				 	});
				 	
				}
				else{
					console.log('User '+data.username+' failed to create a new account!');
					socket.emit('login response',{successful: "false",reason: "Username already exists!"});
				}
			 }			
		 });	 	 	 	  
	 } 
	 else{
		 Account.findOne({username: data.username}, function(err,account){
			 if (err){
				 return console.error(err);
			 }
			 else{
				 if(account !== null){
					 if(account.password === data.password){
						 console.log('User '+data.username+' logged in!');
						 socket.emit('login response',{successful: "true"}); 
					 }
					 else{
						 console.log('User '+data.username+' entered wrong password!');
						 socket.emit('login response',{successful: "false",reason: "Wrong password!"}); 
					 }					 
				 }
				 else{
					 console.log('User '+data.username+' entered wrong name!');
					 socket.emit('login response',{successful: "false",reason: "Wrong name!"});
				 }
			 }			
		 });
	 }
  }); */ 

/*
http.listen(port, function(){
  console.log('listening on *:' + port);
});
*/
