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

// Message
var messageSchema = mongoose.Schema({
    channel:         { type: String, required: true},  // the channel this message belongs to
    type:            { type: String, required: true},  // type of message: message|attachment
    message:         { type: String, required: false},  // message text
    attachment_path: { type: String, required: false},  // path to the attachment
    attachment_name: { type: String, required: false},  // user friendly name of the attachment
    attachment_size: { type: Number, required: false},  // size in bytes of the attachment
    deleted:         { type: Boolean, required: true}, // whether the message has been deleted
    author:          { type: String, required: true},  // the username of this message
    date:            { type: Number, required: true}  // timestamp of the message
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

// DANGER ZONE
// uncomment to disable persitency
// Message.remove({}, function(err) {});
// User.remove({}, function(err) {});

module.exports = {
    Message: Message,
    User: User
}