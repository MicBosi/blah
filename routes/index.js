var express = require('express');
var router = express.Router();

var messages = ["Welcome!"];
var clients = [];

/* home page */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Blah' });
});

/* poll new messages */
router.get('/poll/:count', function(req, res, next) {
    var count = req.params.count;
    if(messages.length > count) {
        res.type('application/json');
        res.send(JSON.stringify({
            count: messages.length,
            new_messages: messages.slice(count)
        }));
    } else {
        clients.push(res);
    }
});

/* send new message */
router.post('/msg/', function(req, res, next) {
    var message = req.body.message;
    messages.push(message);
    while(clients.length > 0) {
        var client = clients.pop();
        client.type('application/json');
        client.end(JSON.stringify({
            count: messages.length,
            new_messages: [message]
        }));
    }
    res.end();
});

module.exports = router;
