var Blah = function() 
{
    "use strict";
    var socket = io.connect('//:3000');

    // chat view route
    if (document.location.pathname == '/') {
        var seen_messages = new Set();
        socket.on('append-messages', function (data) {
            // counter = data.count;
            var messages = $('#messages')[0];
            data.new_messages.forEach(function(msg_data) {
                if (!seen_messages.has(msg_data._id)) {
                    seen_messages.add(msg_data._id)
                    var p = document.createElement('p');
                    var date = new Date(msg_data.time);
                    var date_string = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                    var template = _.template("<blockquote><p>(<%= _id %>) <b><%= author %></b>: <%= message %></p><footer><%= date_string %></footer></blockquote>");
                    $(p).html(template({
                        _id: msg_data._id,
                        author: msg_data.author,
                        message: msg_data.message,
                        date_string: date_string
                    }));
                    // $(p).html(msg_data._id + ': ' + msg_data.message + '<br><footer>' + date_string + '</footer>');
                    messages.insertBefore(p, messages.firstChild);
                }
            });
        });
        socket.on('post-message-ok', function(data) {
            $('#message')[0].value = '';
            $('#message')[0].readOnly = false;
        });
    }

    // self reveal Blah module

    return {
        sendMessage: function() {
            $('#message')[0].readOnly = true;
            var message = $('#message')[0].value;
            socket.emit('post-message', {
                message: message
            });
        },
        
        register: function() {
            $.ajax({
                method: 'POST',
                url: '/api/register',
                data: {
                    username: $('#username')[0].value,
                    password: $('#password')[0].value,
                },
                success: function(data) {
                    $('#register-error').text('');
                    document.location = '/';
                },
                error: function(xhr) {
                     var data = xhr.responseJSON;
                    $('#register-error').text(data.error);
                }
            });
        },
    }
}();