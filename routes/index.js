module.exports = function(io) 
{
    var mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost/blah');
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
        // ok
    });

    // define Message schema
    var messageSchema = mongoose.Schema({
        message: String,
        author: String,
        time: Number
    });

    // setup document auto increment so we have unique ids
    var autoIncrement = require('mongoose-auto-increment');
    autoIncrement.initialize(mongoose);
    messageSchema.plugin(autoIncrement.plugin, {
        model: 'Message',
        field: '_id',
        startAt: 1,
        incrementBy: 1
    });

    // grab Message model
    var Message = mongoose.model('Message', messageSchema);
    
    // DANGER ZONE
    // uncomment to disable persitency
    // Message.remove({}, function(err) {});

    // setup Express routing
    var express = require('express');
    var router = express.Router();

    var default_room = 'default-room';

    /* home page */
    router.get('/', function(req, res, next) {
        res.render('index', { title: 'Blah' });
    });

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
