/**
 * Блок инициализации переменных и подключаемых библиотек
 */
const mongoose = require('mongoose')
const { extend, isArray } = require('lodash')

const { is } = require('./utils')
const ObjectID = require('mongodb').ObjectID
const ObjectId = mongoose.Schema.Types.ObjectId

const targetModels = [ 'Post' ]

/**
 * Создается новая модель/схема для работы с БД в терминах MVC.
 * @param {Object} {
 *  userId {Object} _id пользователя,
 *  votes {Object} счетчик голосов
 *  title {Object} название опроса
 *  multi {Object} разрешение множественного выбора вариантов опроса
 *  target {Object} {
 *    model {Object} название модели связанного объекта
 *    item {Object} идентификатор связанного объекта
 *  }
 * } включает конфигурацию объекта is
 * @see ./utils.js
 */
const model = new mongoose.Schema(extend({
  userId: { type: Number, required: true }, // в реальном проекте тут – ссылка на модель Users. Чтобы ты смог тут что-то пробовать – заменил на числовое поле
  //
  votes: 0, // счетчик голосов
  //
  title: { type: String, required: true }, // название опроса
  multi: { type: Boolean, default: false }, // флаг, сообщающий о том, что в опросе может выбрано несколько вариантов ответа
  //
  target: { // привязка опроса к какой-либо внещней сущности, в данном случае – к постам
    model: { type: String, enum: targetModels },
    item: { type: Number } // тут тоже облегчил – убрал связь с сторонними моделями
  }
}, is))

/**
 * Добавляется индекс для БД по полю userId
 */
model.index({ 'userId': 1 })
/**
 * Добавляется индекс для БД по полю target.item
 */
model.index({ 'target.item': 1 })

model.virtual('options', {
  ref: 'PostPollOption',
  localField: '_id',
  foreignField: 'pollId'
})

model.statics.PollOption = require('./option')

model.statics.makePoll = async function (userId, target = {}, options = [], title, multi = false) {
  const model = this
  if (!target.model || !target.item) throw new Error('no target specified')
  if (!options.length) throw new Error('no poll options specified')
  if (!title) throw new Error('no title specified')

  let poll = await model.create({ target, userId, title, multi })
  await poll.setOptions(options)
  return poll
}

model.methods.setOptions = function (options) {
  const poll = this

  return Promise.all(options.map(option => (
    mongoose.models.PollOption.create({ pollId: poll._id, value: option })
  )))
}

model.methods.vote = function (userId, data = []) {
  const poll = this

  return mongoose.models.PollOption.update(
    {
      _id: { $in: data.map(el => ObjectID(el)) },
      pollId: poll._id
    },
    { $addToSet: { votes: userId } },
    { multi: true }
  )
}

model.methods.editOptions = async function (options = []) {
  const poll = this

  let missed = []
  let pollOptions = await Promise.all(options.map(async option => {
    let [ pollOption ] = await mongoose.models.PollOption.find({ pollId: poll._id, value: option }).select('_id value').limit(1)
    if (pollOption) return pollOption
    missed.push(option)
    return null
  }))

  await mongoose.models.PollOption.update(
    {
      pollId: poll._id,
      _id: { $nin: pollOptions.filter(el => !!el).map(el => el._id) }
    },
    { enabled: false },
    { multi: true }
  )

  return poll.setOptions(missed)
}

model.statics.getPollInfo = function (params = {}, options = {}) {
  const model = this

  return model.aggregate([
    { $match: params },
    { $lookup: {
      from: 'polloptions',
      localField: '_id',
      foreignField: 'pollId',
      as: 'options'
    }},
    { $unwind: '$options' },
    { $match: {
      'options.enabled': true
    }},
    { $project: {
      _id: 1,
      title: 1,
      multi: 1,
      target: 1,
      options: {
        _id: 1,
        value: '$options.value',
        votes: { $size: '$options.votes' },
        isVoted: { $in: [ options.userId ? options.userId : null, '$options.votes' ] }
      }
    }},
    { $group: {
      _id: {
        _id: '$_id',
        title: '$title',
        multi: '$multi',
        target: '$target'
      },
      options: { $push: '$options' },
      votes: { $sum: '$options.votes' },
      isVoted: { $push: '$options.isVoted' }
    }},
    { $project: {
      _id: '$_id._id',
      title: '$_id.title',
      multi: '$_id.multi',
      target: '$_id.target',
      isVoted: { $in: [ true, '$isVoted' ] },
      votes: 1,
      options: 1
    }}
  ])
}

model.statics.getPostPolls = async function (params = {}) {
  const model = this
  let match = {
    'target.model': 'Post',
    enabled: true
  }

  if (params.postId) match['target.item'] = { $in: isArray(params.postId) ? params.postId : [ params.postId ] }

  let data = await model.getPollInfo(match, { userId: params.userId })

  return data.reduce((obj, item) => {
    obj[item.target.item] = item
    return obj
  }, {})
}

module.exports = mongoose.model('Poll', model)
