var xtend = require('xtend');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
// var flash = require('connect-flash');
var passport = require('passport');
var config = require('./config');

var app = express();

// TODO: use redisStore / mongodbStore
var MemoryStore = session.MemoryStore
var sessionStore = new MemoryStore();

var routes = null;
var users = null;

// ----------------------------------------------

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

// ----------------------------------------------

var debug = require('debug')('blah2:server');
var http = require('http');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || config.app_port);
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);
var io = require('socket.io')(server);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// ----------------------------------------------

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var sessionOptions = {
    store: sessionStore,
    name: config.session_cookie, // previously 'key'
    secret: config.session_secret,
    saveUninitialized: true,
    resave: false // or false?
}

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session(sessionOptions));
// app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

routes = require('./routes/index')(io, passport);
users = require('./routes/users');

app.use('/', routes);
app.use('/users', users);

var passportSocketIO = {
    authorize: function(options) {
        function parseCookie(cookieHeader) {
            var cookieParser = options.cookieParser(options.secret);
            var req = {
                headers: {
                    cookie: cookieHeader
                }
            };
            var result;
            cookieParser(req, {}, function (err) {
                if (err) {
                    throw err;
                }
                result = req.signedCookies || req.cookies;
            });
            return result;
        }

        return function(socket, next) {
            // socket.io v1.0 now provides socket handshake socket via `socket.request`
            if (socket.request) {
                // console.log('cookies 1: ' + socket.handshake.headers.cookie);

                var cookies = parseCookie(socket.handshake.headers.cookie || '');
                // console.log('cookies 2: ' + JSON.stringify(cookies));

                var session_id = cookies[options.name] || '';
                // console.log('session_id: ' + session_id);

                options.store.get(session_id, function(err, session) {
                    if (err) {
                        return options.callback(err, socket, null, next);
                    }
                    if (!session) {
                        return options.callback( { message: 'No session.' }, socket, null, next);
                    }
                    // console.log('Session:');
                    // console.log(session);
                    if (!session[options.passport._key]) {
                        return options.callback( { message: 'Passport not ready.' }, socket, null, next);
                    }
                    var user_key = session[options.passport._key][options.passport._userProperty];
                    // console.log('user_key:');
                    // console.log(user_key);
                    if(typeof(user_key) === 'undefined') {
                        return options.callback( { message: 'User ' + user_key + ' not authorized via Passport.' }, socket, null, next);
                    }
                    options.passport.deserializeUser(user_key, socket, function(err, user) {
                        if (err) {
                            return options.callback(err, socket, null, next);
                        }
                        if (!user) {
                            return options.callback( { message: 'User ' + user_key + ' not found.' }, socket, null, next);
                        }
                        socket.user = user;
                        options.callback(null, socket, user, next);
                    });
                });
            }
        }
    }
};

io.use(passportSocketIO.authorize(xtend(sessionOptions, {
    cookieParser: cookieParser,
    passport: passport,
    callback: function(err, data, user, next) {
        // no next() -> stop here
        // next() -> continue to next handler
        // next(error) -> continue but send 'error' packet to client
        if (err) {
            // console.log(err.message);
        } else
        if (!user) {
            // console.log('User not logged in.');
        } else {
            // console.log('User logged in: ', JSON.stringify(user));
            next();
        }
    }
})));

app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

if (app.get('env') === 'development') {
  app.locals.pretty = true;
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// ----------------------------------------------

module.exports = app;
