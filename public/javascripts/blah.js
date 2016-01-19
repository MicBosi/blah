var Blah = function() 
{
    "use strict";
    var socket = io.connect('//:443');
    socket.on('error', function (data) {
        console.log('error:');
        console.log(data);
    });

    socket.on('create-channel-ok', function(channel) {
        $('#create-channel-name')[0].value = '';
        $('#create-channel-name')[0].readOnly = false;
    });

    socket.on('create-channel-error', function(data) {
        // $('#create-channel-name')[0].value = '';
        $('#create-channel-name')[0].readOnly = false;
        console.log('New channel error: ' + JSON.stringify(data));
    });

    var seen_channels = new Set();
    socket.on('append-channels', function(channels) {
        var channel_list = $('#channel-list')[0];
        var delay = 100;
        var previous_div = null;
        channels.forEach(function(channel) {
            if (!seen_channels.has(channel._id)) {
                var channel_btn_title = channel.owner == Blah.user._id ? 'Manage' : 'Leave';
                var channel_btn_class = channel.owner == Blah.user._id ? 'fa-ellipsis-v' : 'fa-sign-out';
                var template = render_template('<span class="channel-name" onclick="Blah.selectChannel({{channel_id}});">{{name}}</span><a title="{{channel_btn_title}}" class="btn btn-success channel-button pull-right"><i class="fa {{channel_btn_class}}"></i></a><div style="clear: both;"></div>', {
                    channel_id: channel._id,
                    name: channel.name,
                    channel_btn_title: channel_btn_title,
                    channel_btn_class: channel_btn_class
                });
                var div = document.createElement('div');
                $(div).html(template);
                $(div).attr('data-channel-id', channel._id);


                setTimeout(
                    (function(previous_div, div) { 
                        return function() {
                            $(div).fadeIn(800);
                            
                            if (previous_div == null) {
                                channel_list.insertBefore(div, channel_list.firstChild);
                            } else {
                                // -> insertAfter(div, previous_div.nextSibling)
                                previous_div.parentNode.insertBefore(div, previous_div.nextSibling);
                            }
                        }
                    })(previous_div, div),
                    delay
                );

                delay += 100;
                previous_div = div;
            }
        })
    });

    var seen_messages = new Set();
    socket.on('append-messages', function (new_messages) {
        var messages = $('#messages')[0];
        var delay = 100;
        var previous_p = null;
        new_messages.forEach(function(msg_data) {
            if (!seen_messages.has(msg_data._id)) {
                seen_messages.add(msg_data._id)
                var p = document.createElement('p');
                var date = new Date(msg_data.date);
                var date_string = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                var template = render_template("<blockquote><p>({{_id}}) <b>{{author}}</b>: {{message}}</p><footer>{{date_string}}</footer></blockquote>", {
                    _id: msg_data._id,
                    author: msg_data.author,
                    message: msg_data.message,
                    date_string: date_string
                });
                $(p).html(template);

                setTimeout(
                    (function(previous_p, p) { 
                        return function() {
                            $(p).fadeIn(800);
                            
                            if (previous_p == null) {
                                messages.insertBefore(p, messages.firstChild);
                            } else {
                                // -> insertAfter(p, previous_p.nextSibling)
                                previous_p.parentNode.insertBefore(p, previous_p.nextSibling);
                            }
                        }
                    })(previous_p, p),
                    delay
                );

                delay += 100;
                previous_p = p;
            }
        });
    });

    socket.on('post-message-ok', function(data) {
        $('#message')[0].value = '';
        $('#message')[0].readOnly = false;
    });

    function render_template(template, dictionary) {
        for (var name in dictionary) {
            var value = dictionary[name];
            template = template.replace(new RegExp('{{'+name+'}}', 'g'), value);
        }
        return template;
    }

    // reveal module

    return {

        // methods

        user: null,

        current_channel_id: null,

        // functions

        selectChannel: function(channel_id) {
            // select visually the channel
            $('div[data-channel-id]').removeClass('selected');
            $('div[data-channel-id=' + channel_id + ']').addClass('selected');
        },

        sendMessage: function() {
            $('#message')[0].readOnly = true;
            var message = $('#message')[0].value;
            socket.emit('post-message', {
                message: message
            });
        },

        createChannel: function() {
            var name = $('#create-channel-name')[0].value;
            socket.emit('create-channel', {
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
