/*
 * @author Philipp Bahnmüller (742233), Kevin Schrötter (742082)
 */

// Server

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var path = require('path');
var router = express.Router();

// Datenbank
// Credentials for usage of Cloudant Database
// Cloudant Username: arairephicauggressinglin
// Cloudant Password: a5cb52d6ac2bc37075ba0f174451db8f81094bd3

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

// Funktionen

var sockets = {};

app.use(express.static(path.join(__dirname,'public')));
app.use(router);
//app.use('/static',express.static(path.join(__dirname,'public')));
console.log("Public okay");

/*
 * It seems like Node JS automatically uses a file called index.html
 * for the default route '/'. There it doesn't matter, where exactly the file
 * is located as long as it is somehwhere near the main directory
 * or the public directory
 */
router.get('/login', function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});

router.get('/index', function(req, res){
	res.sendFile(__dirname + '/public/index.html');	
});
router.get('/chat', function(req, res){
	res.sendFile(__dirname + '/public/chat.html');	
});
router.get('/test', function(req,res){
	res.sendFile(__dirname + '/public/test.html');
});
io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    socket.broadcast.emit('chat message', msg);
  });
  
  socket.on('disconnect',function(){
	  io.emit('user disconnect',"User "+socket.username+" disconnected!");
	  delete sockets[socket.username];
  });
  
  socket.on('validate user',function(username){
	  socket.username = username;
	  sockets[username] = socket;
	  io.emit('user connect',"User "+username+" connected!");
  });
  
  socket.on('private message',function(data){
	  if(sockets[data.to]){
		  sockets[data.to].emit('private message',data);
	  }
	  else{
		  socket.emit('error message',{msg: "User '"+data.to+"' not found!"});
	  }
  });
  
  socket.on('get usernames',function(){
	  socket.emit('get usernames',Object.keys(sockets));
  });
  
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
  });  
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
