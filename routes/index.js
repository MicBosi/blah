module.exports = function(io) 
{
    var express = require('express');
    var router = express.Router();

    var history = ["Welcome!"];

    var default_room = 'default-room';

    /* home page */
    router.get('/', function(req, res, next) {
        res.render('index', { title: 'Blah' });
    });

    /* socket.io */
    io.on('connection', function (socket) {
        socket.join(default_room);

        // grab current history
        socket.emit('append-messages', {
            new_messages: history
        });

        socket.on('post-message', function (data) {
            // add message to history
            var message = data.message;
            history.push(message);

            // confirm message delivery
            socket.emit('post-message-ok', {});

            // dispatch new message to me and all other clients
            socket.emit('append-messages', {
                new_messages: [message]
            });
            socket.to(default_room).emit('append-messages', {
                new_messages: [message]
            });
        });

        socket.on('disconnect', function() {
            // Will leave room automatically
            // socket.leave(default_room);
            console.log('Disconnected socket id: ' + socket.id);
        });
    });

    return router;
}
