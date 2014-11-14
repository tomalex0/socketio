var express = require('express'),
    util = require('util'),
    https = require('https'),
    http = require('http'),
    fs = require('fs');



var app = express();

var sessionStore  = new express.session.MemoryStore();
var parseCookie = require('cookie').parse;
var cookieParser  = require('cookie-parser');


//app.use(function () {
//    app.use(express.cookieParser());
//    app.use(express.session({secret: 'secret', key: 'express.sid'}));
//});

var secretStr = 'secret';
app.use(express.cookieParser());
app.use(express.session({
    secret: secretStr,
    key: 'express.sid',
    store   : sessionStore,
    cookie  : {maxAge : 60 * 60 * 1000}
}));

app.use(express.static(require('path').join(__dirname, 'public')));





var options = {
    key: fs.readFileSync('./ssl/privkey.pem'),
    cert: fs.readFileSync('./ssl/server.crt')
};



var server = https.createServer(options, app).listen(8443, function(){
    console.log("ssl started on port " + 8443);
});




var socketio = require('socket.io').listen(server);

socketio.set('authorization',function(data, accept){

    if (data.headers.cookie) {
        data.cookie = parseCookie(data.headers.cookie);
        data.sessionID = cookieParser.signedCookie(data.cookie['express.sid'], secretStr);
        // save the session store to the data object
        // (as required by the Session constructor)
        data.sessionStore = sessionStore;
        sessionStore.get(data.sessionID, function (err, session) {
            console.log(session,'session');
            if (err || !session) {
                accept('Error', false);
            } else {
                // create a session object, passing data as request and our
                // just acquired session data
                //data.session = sessionStore(data, session);
                accept(null, true);
            }
        });
    } else {
        return accept('No cookie transmitted.', false);
    }
});

socketio
    .of('/socketspace')
    .on('connection', function(socket) {
        console.log(socket.id, 'socket io connect callback');
        socket.on('disconnect', function (a) {
            //console.log(socket.id,'socket io disconnect callback');
            console.log('SocketIO Connection Disconnected', socket.id);
        });
    });


app.get('/socketspace_data',function(req, res){
    var msg = {
        username: 'myname',
        email : 'myname@gmail.com.com'
    };

    socketio.of('/socketspace').emit('sockdata', msg);
    res.json({success:true});
});
