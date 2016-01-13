module.exports = function(io, passport) 
{
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
        res.render('index', { title: 'Blah', version: 'v1.2.0', username: req.user ? req.user.username : 'guest' });
    });

    /* login page */
    router.get('/login', function(req, res, next) {
        res.render('login', { title: 'Blah', version: 'v1.2.0' });
    });

    /* register page */
    router.get('/register', function(req, res, next) {
        res.render('register', { title: 'Blah', version: 'v1.2.0' });
    });

    /* logout page */
    router.get('/logout', function(req, res, next) {
        /* logout logic */
        // ...
        /* redirect to home page */
        res.redirect('/login');
        res.end();
    });

    /* register page */
    router.post('/api/register', function(req, res, next) {
        api.registerUser(req.body.username, req.body.password, function(err, user) {
            var ok = !err && user != null;
            var error = null;
            if (err) {
                error = err.name == 'ValidationError' ? 'Invalid username or password.' : err.message;
                error = err.code == 11000 ? 'Username already taken.' : error;
            }
            res.type('application/json');
            res.status(ok ? 200 : 400);
            res.end(JSON.stringify({
                ok: ok,
                error: error
            }));
        });
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
        socket.join(default_room);

        // Messge.find({ author: /^Michele/ }, callback);
        Message.find(
            null, // filters
            null, // columns
            {     // options
                sort: {'_id': +1}
            }, 
            function(err, messages) {
                if(err) {
                    console.error(err);
                } else {
                    // grab current history
                    socket.emit('append-messages', {
                        new_messages: messages
                    });
                }
            }   
        );

        socket.on('post-message', function (data) {
            // add message to history
            var msg_data = {
                message: data.message,
                author: 'guest',
                time: new Date().getTime()
            };

            var message = new Message(msg_data);
            message.save(function(err, m) {
                if (err) {
                    return console.error(err);
                } else {
                    msg_data._id = m._id;

                    // confirm message delivery
                    socket.emit('post-message-ok', {});

                    // dispatch new message to me and all other clients
                    socket.emit('append-messages', {
                        new_messages: [msg_data]
                    });
                    socket.to(default_room).emit('append-messages', {
                        new_messages: [msg_data]
                    });
                }
            });
        });

        socket.on('disconnect', function() {
            // no need to call socket.leave
            console.log('Disconnected socket id: ' + socket.id);
        });
    });

    return router;
}
