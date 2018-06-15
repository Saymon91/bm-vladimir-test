/**
 * Тут не комментируй
 */

const R = require('ramda')

const created = {
  created: { type: Date, default: Date.now, required: true },
  updated: { type: Date, default: Date.now, required: true }
}

const is = R.merge(
  created,
  {
    enabled: { type: Boolean, default: true, required: true }
  }
)

module.exports = { created, is }
