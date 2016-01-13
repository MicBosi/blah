module.exports = function(io) 
{ 
    var express = require('express');
    var router = express.Router();

    var history = ["Welcome!"];
    var clients = [];

    /* home page */
    router.get('/', function(req, res, next) {
        res.render('index', { title: 'Blah' });
    });

    /* socket.io */
    io.on('connection', function (socket) {
        // add to list of clients
        clients.push(socket);
        console.log('Connected socket id: ' + socket.id);
        console.log('Sockets: ' + clients.length);

        // dispatch current history
        socket.emit('append-messages', {
            new_messages: history
        });

        // catch new history
        socket.on('post-message', function (data) {
            var message = data.message;
            history.push(message);
            socket.emit('post-message-ok', {});
            // dispatch new message to all clients
            clients.forEach(function(s) {
                s.emit('append-messages', {
                    new_messages: [message]
                });
            });
        });

        socket.on('disconnect', function() {
            // remove this socket from clients
            clients = clients.filter(function(s) {
                return s.id != socket.id;
            });
            console.log('Disconnected socket id: ' + socket.id);
            console.log('Sockets: ' + clients.length);
        });
    });

    return router;
}
