module.exports = function(io, passport) 
{
    var config = require('../config');
    var api = require('../api');
    var model = require('../model');

    // grab Message model
    var Message = model.Message;
    
    // DANGER ZONE
    // uncomment to disable persitency
    // Message.remove({}, function(err) {});

    // setup Express routing
    var express = require('express');
    var router = express.Router();

    // setup Passport
    var LocalStrategy = require('passport-local').Strategy;
    passport.use(new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password'
        },
        function(username, password, done) {
            model.User.findOne({ username: username }, function(err, user) {
                if (err) { 
                    return done(err); 
                }
                if (!user) {
                    return done(null, false, { message: 'Incorrect username.' });
                }
                if (!user.validPassword(password)) {
                    return done(null, false, { message: 'Incorrect password.' });
                }
                return done(null, user);
            });
        }
    ));

    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
        model.User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    var default_room = 'default-room';

    /* home page */
    router.get('/', function(req, res, next) {
        if (req.user) {
            res.render('index', { title: config.app_name, version: config.app_version, user: JSON.stringify({_id:req.user._id, username: req.user.username}), username: req.user.username });
        } else {
            res.redirect('/register');
            res.end();
        }
    });

    /* login page */
    router.get('/login', function(req, res, next) {
        if (req.user) {
            res.render('flash', { title: config.app_name, version: config.app_version, user: 'null', username: req.user ? req.user.username : 'guest', err_title: 'Error', message: 'Please <a href="/logout">log out</a> first.'});
        } else {
            res.render('login', { title: config.app_name, version: config.app_version, user: 'null', username: req.user ? req.user.username : 'guest' });
        }
    });

    /* register page */
    router.get('/register', function(req, res, next) {
        if (req.user) {
            res.render('flash', { title: config.app_name, version: config.app_version, user: 'null', username: req.user ? req.user.username : 'guest', err_title: 'Error', message: 'Please <a href="/logout">log out</a> first.'});
        } else {
            res.render('register', { title: config.app_name, version: config.app_version, user: 'null', username: req.user ? req.user.username : 'guest' });
        }
    });

    /* logout page */
    router.get('/logout', function(req, res, next) {
        /* logout logic */
        req.session.destroy();
        req.logout();
        res.clearCookie('connect.sid');
        /* redirect to home page */
        res.redirect('/register');
        res.end();
    });

    /* register page */
    router.post('/api/register', function(req, res, next) {
        console.log('----');
        model.registerUser(
            req.body.username, 
            req.body.password, 
            function(err, user) {
                var ok = !err && user != null;
                var error = null;
                if (err) {
                    error = err.name == 'ValidationError' ? 'Invalid username or password.' : err.message;
                    error = err.code == 11000 ? 'Username already taken.' : error;
                    error = err.message;
                }
                res.type('application/json');
                res.status(ok ? 200 : 400);
                res.end(JSON.stringify({
                    ok: ok,
                    error: error
                }));
            }
        );
    });

    /* register page */
    router.post('/api/login', passport.authenticate('local', { 
            successRedirect: '/',
            failureRedirect: '/login',
            failureFlash: false
        })
    );
    // router.post('/api/login', function(req, res, next) {
    //     var ok = api.loginUser(req.body.username, req.body.password);
    //     res.type('application/json');
    //     res.end(JSON.stringify({
    //         ok: ok
    //     }));
    // });

    /* socket.io */
    io.on('connection', function (socket) {
        if (socket.user) {
            // console.log("Connected as user:", socket.user.username);
        } else {
            // console.log("Connected as user: <none>");
            return;
        }
        
        socket.join(default_room);

        // Send list of channels
        model.getChannels(
            socket.user._id,
            function(err, channels) {
                if(err) {
                    console.error(err);
                } else {
                    // grab current history
                    socket.emit('append-channels', channels);
                }
            }   
        );

        // TODO: FIXME
        var channel_id = 1; // choose highest channel?
        model.getMessages(
            channel_id,
            function(err, messages) {
                if(err) {
                    console.error(err);
                } else {
                    // grab current history
                    socket.emit('append-messages', messages);
                }
            }   
        );

        socket.on('create-channel', function (data) {
            model.createChannel(socket.user._id, data.name, function(err, channel) {
                if (err) {
                    var msg = err.message;
                    console.error(msg);
                    return socket.emit('create-channel-error', {message:msg});
                }
                socket.emit('create-channel-ok', channel);
                socket.emit('append-channels', [channel]);
            });
        });

        socket.on('post-message', function (data) {
            model.postMessage({
                    // TODO: 
                    // - author should be user_id -> cached via Redis
                    // - select username
                    // - select channel_id
                    author: socket.user.username,
                    channel_id: 1,
                    type: 'message',
                    message: data.message,
                    attachment_path: '',
                    attachment_name: '',
                    attachment_size: 0,
                    deleted: false,
                    date: new Date().getTime(), // now
                },
                function(err, message) {
                    if (err) {
                        return console.error(err);
                    } else {
                        // confirm message delivery
                        socket.emit('post-message-ok', {});

                        // dispatch new message to me and all other clients
                        socket.emit('append-messages', [message]);
                        socket.to(default_room).emit('append-messages', [message]);
                    }
                }
            );
        });

        socket.on('disconnect', function() {
            // no need to call socket.leave
            console.log('Disconnected socket id: ' + socket.id);
        });
    });

    return router;
}
