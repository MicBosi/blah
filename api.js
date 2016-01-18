var model = require('./model');

// TODO: REMOVE THIS MODULE?

// callback(err, user)
// function registerUser(username, password, callback) {
//     var user = new model.User({username: username});
//     user.setPassword(password);
//     user.save(function(err, user) {
//         if (err) {
//             console.error(err);
//             callback(err, null);
//         } else {
//             callback(null, user);
//         }
//     });
// }

function loginUser(username, password) {
}

module.exports = {
    // registerUser: registerUser,
    loginUser: loginUser,
}