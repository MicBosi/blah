// TODO:
// - escape tags from messages
// - allow line breaks in messages
// - disallow empty comments

var Blah = function() 
{
    "use strict";
    var _socket = null;
    var _seen_channels = null;
    var _seen_messages = null;

    function initialize(port) {
        _socket = io.connect('//:'+Blah.port);
        _socket.on('error', function (data) {
            console.log('error:');
            console.log(data);
        });

        _socket.on('create-channel-ok', function(channel) {
            $('#create-channel-name')[0].value = '';
            $('#create-channel-name')[0].readOnly = false;
        });

        _socket.on('create-channel-error', function(data) {
            // $('#create-channel-name')[0].value = '';
            $('#create-channel-name')[0].readOnly = false;
            console.log('New channel error: ' + JSON.stringify(data));
        });

        _seen_channels = new Set();
        _socket.on('append-channels', function(channels) {
            var select_first_channel = true; // _seen_channels.size === 0;
            var channel_list = $('#channel-list')[0];
            var delay = 100;
            var previous_div = null;
            channels = channels.filter(function(channel) {
                if (_seen_channels.has(channel._id)) {
                    return false;
                } else {
                    _seen_channels.add(channel._id);
                    return true;
                }
            });
            channels.forEach(function(channel) {
                var channel_btn_title = channel.owner == Blah.user._id ? 'Manage' : 'Leave';
                var channel_btn_class = 'fa-ellipsis-v'; // channel.owner == Blah.user._id ? 'fa-ellipsis-v' : 'fa-sign-out';
                var template = render_template('<span class="channel-name" onclick="Blah.selectChannel({{channel_id}});">{{name}}</span><a title="{{channel_btn_title}}" class="btn btn-success channel-button pull-right"><i class="fa {{channel_btn_class}}"></i></a><div style="clear: both;"></div>', {
                    channel_id: channel._id,
                    name: '# ' + channel.name,
                    channel_btn_title: channel_btn_title,
                    channel_btn_class: channel_btn_class
                });
                var div = document.createElement('div');
                $(div).html(template);
                $(div).attr('data-channel-id', channel._id);


                setTimeout(
                    (function(previous_div, div) { 
                        return function() {
                            $(div).fadeIn(400);
                            
                            if (previous_div == null) {
                                channel_list.insertBefore(div, channel_list.firstChild);
                            } else {
                                // -> insertAfter(div, previous_div.nextSibling)
                                previous_div.parentNode.insertBefore(div, previous_div.nextSibling);
                            }

                            // select top channel if _seen_channels is empty
                            if(select_first_channel && channel._id == channels[0]._id) {
                                Blah.selectChannel(channels[0]._id);
                            }
                        }
                    })(previous_div, div),
                    delay
                );

                delay += 100;
                previous_div = div;
            });
        });

        _seen_messages = new Set();
        _socket.on('append-messages', function (new_messages) {
            // Ignore messages for other channels for the moment
            if (new_messages.length) {
                if (new_messages[0].channel_id != Blah.current_channel_id) {
                    return;
                }
            }
            var messages = $('#messages')[0];
            var delay = 50;
            var previous_p = null;
            new_messages = new_messages.filter(function(msg_data) {
                if (_seen_messages.has(msg_data._id)) {
                    return false;
                } else {
                    _seen_messages.add(msg_data._id);
                    return true;
                }
            });
            new_messages.forEach(function(msg_data) {
                var p = document.createElement('p');
                var date = new Date(msg_data.date);
                var date_string = date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
                var template = render_template('<blockquote><p><b>{{author}}</b> <span class="text-muted pull-right">{{date_string}}</span><br></p><p class="message-text">{{message}}</p></blockquote>', {
                    _id: msg_data._id,
                    author: msg_data.author,
                    message: markdown.toHTML(msg_data.message),
                    date_string: date_string
                });
                $(p).html(template);

                setTimeout(
                    (function(previous_p, p) { 
                        return function() {
                            $(p).fadeIn(400);
                            
                            if (previous_p == null) {
                                messages.insertBefore(p, messages.firstChild);
                            } else {
                                // -> insertAfter(p, previous_p.nextSibling)
                                if (previous_p.parentNode) {
                                    previous_p.parentNode.insertBefore(p, previous_p.nextSibling);
                                }
                            }
                        }
                    })(previous_p, p),
                    delay
                );

                delay += 50;
                previous_p = p;
            });
        });

        _socket.on('post-message-ok', function(data) {
            $('#message')[0].value = '';
            $('#message')[0].readOnly = false;
        });
    }

    // utils

    function render_template(template, dictionary) {
        for (var name in dictionary) {
            var value = dictionary[name];
            template = template.replace(new RegExp('{{'+name+'}}', 'g'), value);
        }
        return template;
    }

    // on-ready initialization

    $(document).ready(function() {
        $('#create-channel-name').keypress(function(e) {
            if(e.which == 13) {
                Blah.createChannel();
            }
        });
    });

    // reveal module

    return {

        // methods

        user: null,

        port: null,

        current_channel_id: null,

        initialize: initialize,

        // functions

        selectChannel: function(channel_id) {
            // Make sure messages from other channels get discarded
            Blah.current_channel_id = channel_id;

            // Cleanup currently seen messages
            _seen_messages = new Set();

            // GUI feedback
            $('div[data-channel-id]').removeClass('selected');
            $('div[data-channel-id=' + channel_id + ']').addClass('selected');

            $('#messages').html('');

            // request the channel switch
            _socket.emit('select-channel', {
                channel_id: channel_id
            });
        },

        sendMessage: function() {
            $('#message')[0].readOnly = true;
            var message = $('#message')[0].value;
            _socket.emit('post-message', {
                message: message,
                channel_id: Blah.current_channel_id
            });
        },

        createChannel: function() {
            var name = $('#create-channel-name')[0].value;
            _socket.emit('create-channel', {
                name: name
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
                        $.ajax({
                            method: 'POST',
                            url: '/api/login',
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
                error: function(xhr) {
                    var data = xhr.responseJSON;
                    $('#register-error').text(data.error);
                }
            });
        },
    }
}();
