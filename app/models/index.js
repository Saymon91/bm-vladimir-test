/**
 * Тут не комментируй
 */

const mongoose = require('mongoose')

mongoose.connect('mongodb://127.0.0.1:27017/vlad-test', {
  auto_reconnect: true,
  socketOptions: {
    socketTimeoutMS: 0,
    connectTimeoutMS: 0
  }
})

exports.Users = require('./poll')