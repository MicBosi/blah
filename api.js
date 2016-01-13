var model = require('./model');

// callback(err, user)
function registerUser(username, password, callback) {
    var user = new model.User({username: username, password: password});
    user.save(function(err, user) {
        if (err) {
            console.error(err);
            callback(err, null);
        } else {
            callback(null, user);
        }
    });
}

function loginUser(username, password) {
}

module.exports = {
    registerUser: registerUser,
    loginUser: loginUser,
}