/**
 * Блок инициализации подключаемых библиотек
 */
const mongoose = require('mongoose')
const { extend } = require('lodash')

const { is } = require('./utils')

const ObjectId = mongoose.Schema.Types.ObjectId

/**
 * Создается новая модель/схема для работы с БД в терминах MVC.
 * @param {Object} {
 *  pollId {Object} _id опроса,
 *  value {Object} значение поля
 *  votes {Object} список проголосовавших пользователей
 * } включает конфигурацию объекта is
 * @see ./utils.js
 */
const model = new mongoose.Schema(extend({ //здесь действительно оправдано использование отдельного метода extend?
                                           // Object.assign справляется штатными методами с такой задачей
  pollId: { type: ObjectId, ref: 'Post' }, // _id опроса
  value: { type: String, required: true }, // значение поля
  //
  votes: [{ type: Number }] // список проголосовавших юзеров
}, is))

/**
 * Добавляется индекс для БД по полю pollId
 */
model.index({ 'pollId': 1 })

module.exports = mongoose.model('PollOption', model)
