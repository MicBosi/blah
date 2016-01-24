// TODO:
// - Show login & logout errors
// - Access control
// - Don't index fields we dont query agains

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/blah');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    // ok
});

var crypto = require('crypto');
var sha1sum = function(input){
    return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex')
}

// setup auto increment
var autoIncrement = require('mongoose-auto-increment');
autoIncrement.initialize(mongoose);

// Channel
var channelSchema = mongoose.Schema({
    name:    { type: String, required: true, unique: true }, // the name of the channel
    owner:   { type: Number, required: true},  // username of owner
    users:   [Number],                         // list of user ids participating to the channel, including owner
    public:  { type: Boolean, required: true}, // whether the channel is deleted
    deleted: { type: Boolean, required: true}, // whether the channel is deleted
});
channelSchema.plugin(autoIncrement.plugin, {
    model: 'Channel',
    field: '_id',
    startAt: 1,
    incrementBy: 1
});

// Message
var messageSchema = mongoose.Schema({
    channel_id:      { type: Number, required: true},  // the channel id this message belongs to
    type:            { type: String, required: true},  // type of message: message|attachment
    message:         { type: String, required: false}, // message text
    attachment_path: { type: String, required: false}, // path to the attachment
    attachment_name: { type: String, required: false}, // user friendly name of the attachment
    attachment_size: { type: Number, required: false}, // size in bytes of the attachment
    deleted:         { type: Boolean, required: true}, // whether the message has been deleted
    author:          { type: String, required: true},  // the username of this message
    date:            { type: Number, required: true}   // timestamp of the message
});
messageSchema.plugin(autoIncrement.plugin, {
    model: 'Message',
    field: '_id',
    startAt: 1,
    incrementBy: 1
});

// User
var userSchema = mongoose.Schema({
    username: { type: String , unique: true,  required: true, dropDups: false },
    password: { type: String , unique: false, required: true, dropDups: false },
});
userSchema.plugin(autoIncrement.plugin, {
    model: 'User',
    field: '_id',
    startAt: 1,
    incrementBy: 1
});
userSchema.methods.validPassword = function(password) {
    return this.password == sha1sum(password);
}
userSchema.methods.setPassword = function(password) {
    this.password = sha1sum(password);
}

// grab Message model
var Message = mongoose.model('Message', messageSchema);
var User = mongoose.model('User', userSchema);
var Channel = mongoose.model('Channel', channelSchema);

// DANGER ZONE
// uncomment to disable persitency
User.remove({}, function(err) {});
Message.remove({}, function(err) {});
Channel.remove({}, function(err) {});

function registerUser(username, password, callback) {
    // TODO: check permissions
    // - user is not logged in
    // - validate name
    // - validate password
    // - name must != 'guest'
    // - must be unique name
    var user = new User({username: username});
    user.setPassword(password);
    user.save(function(err, user) {
        if (err) {
            console.error(err);
            callback(err, null);
        } else {
            callback(null, user);
        }
    });
}

// callback: function(err, channel)
function createChannel(user_id, channel_name, callback) {
    // TODO: check permissions
    // - user is logged in
    // - validate name
    // - must be unique
    var channel = new Channel({
        name: channel_name,
        owner: user_id,
        users: [user_id],
        deleted: false,
        public: true,
    });
    channel.save(callback);
}

// callback: function(err, messages)
function getChannels(user_id, callback) {
    // TODO: check permissions
    // - user is logged in
    Channel.find(
        { $or: [ { public: true }, { users: user_id } ] }, // find "user_id" in "users" array
        null, // columns
        {     // options
            sort: {'_id': -1}
        }, 
        callback // function(err, messages)
    );
}

// callback: function(err, messages)
function getMessages(channel_id, callback) {
    // TODO: check permissions
    // - user is logged in
    // - user is subscribed (incl. owner)
    Message.find(
        {channel_id: channel_id}, // filters
        null, // columns
        {     // options
            sort: {'_id': -1}
        }, 
        callback // function(err, messages)
    );
}

function deleteChannel(channel_id, callback) {
    // TODO: check permissions
    // - user is logged in
    // - owns channel
    Channel.update(
        // filter condition
        {_id: channel_id},
        { deleted: true},
        callback // function(err, raw)
    );
}

// callback(err, message)
function postMessage(params, callback) {
    // TODO: check permissions
    // - user is logged in
    // - must be subscribed
    var message = new Message(params);
    message.save(callback);
}

function deleteMessage(channel_id, message_id, callback) {
    // TODO: check permissions
    // - user is logged in
    // - only owner or user can do it
    Message.update(
        {_id: message_id, channel_id: channel_id},
        {deleted: true},
        callback // function(err, raw)
    );
}

function subscribeUser(user_id, channel_id, callback) {
    // TODO: check permissions
    // - user is logged in
    // - only owner can do it
    Channel.update(
        // filter condition
        {_id: channel_id},
        // operation: add user_id to users if not already there
        { $addToSet: {users: user_id } },
        // options
        {
            safe: true,
            upsert: false,
            multi: false,
            strict: false,
            overwrite: false
        },
        // errors callback
        callback
        // function(err, raw) {
        //     if (err) {
        //         return handleError(err);
        //     }
        //     console.log('subscribeUser(): The raw response from Mongo was:\n', raw);        
        // }
    );
}

function unsubscribeUser(user_id, channel_id, callback) {
    // TODO: check permissions
    // - user is logged in
    // - only owner or user can do it
    Channel.update(
        // filter condition
        {_id: channel_id},
        // operation: remove user_id from users
        { $pull: {users: user_id } },
        // options
        {
            safe: true,
            upsert: false,
            multi: false,
            strict: false,
            overwrite: false
        },
        // errors callback
        callback
        // function(err, raw) {
        //     if (err) {
        //         return handleError(err);
        //     }
        //     console.log('unsubscribeUser(): The raw response from Mongo was:\n', raw);        
        // }
    );
}

module.exports = {
    // docs
    User: User,
    Channel: Channel,
    Message: Message,

    // methods
    registerUser: registerUser,
    createChannel: createChannel,
    getChannels: getChannels,
    getMessages: getMessages,
    deleteChannel: deleteChannel,
    subscribeUser: subscribeUser,
    unsubscribeUser: unsubscribeUser,
    postMessage: postMessage,
    deleteMessage: deleteMessage,
}