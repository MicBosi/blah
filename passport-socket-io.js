module.exports = {
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
