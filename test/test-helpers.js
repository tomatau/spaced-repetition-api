const knex = require('knex')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

/**
 * create a knex instance connected to postgres
 * @returns {knex instance}
 */
function makeKnexInstance() {
  return knex({
    client: 'pg',
    connection: process.env.TEST_DB_URL,
  })
}

/**
 * create a knex instance connected to postgres
 * @returns {array} of user objects
 */
function makeUsersArray() {
  return [
    {
      id: 1,
      username: 'test-user-1',
      name: 'Test user 1',
      password: 'password',
    },
    {
      id: 2,
      username: 'test-user-2',
      name: 'Test user 2',
      password: 'password',
    },
  ]
}

/**
 * generate fixtures of lists and words for a given user
 * @param {object} user - contains `id` property
 * @returns {Array(lists, words)} - arrays of lists and words
 */
function makeListsAndWords(user) {
  const lists = [
    {
      id: 1,
      name: 'Test list 1',
      user_id: user.id,
    },
    {
      id: 2,
      name: 'Test list 2',
      user_id: user.id,
    },
  ]

  const words = [
    {
      id: 1,
      original: 'original 1',
      translation: 'translation 1',
      list_id: 1,
      next: 2,
    },
    {
      id: 2,
      original: 'original 2',
      translation: 'translation 2',
      list_id: 1,
      next: 3,
    },
    {
      id: 3,
      original: 'original 3',
      translation: 'translation 3',
      list_id: 1,
      next: 4,
    },
    {
      id: 4,
      original: 'original 4',
      translation: 'translation 4',
      list_id: 1,
      next: 5,
    },
    {
      id: 5,
      original: 'original 5',
      translation: 'translation 5',
      list_id: 1,
      next: null,
    },
    // list 2
    {
      id: 6,
      original: 'original 6',
      translation: 'translation 6',
      list_id: 2,
      next: 7,
    },
    {
      id: 7,
      original: 'original 7',
      translation: 'translation 7',
      list_id: 2,
      next: 8,
    },
    {
      id: 8,
      original: 'original 8',
      translation: 'translation 8',
      list_id: 2,
      next: 9,
    },
    {
      id: 9,
      original: 'original 9',
      translation: 'translation 9',
      list_id: 2,
      next: 10,
    },
    {
      id: 10,
      original: 'original 10',
      translation: 'translation 10',
      list_id: 2,
      next: null,
    },
  ]

  return [lists, words]
}

/**
 * make a bearer token with jwt for authorization header
 * @param {object} user - contains `id`, `username`
 * @param {string} secret - used to create the JWT
 * @returns {string} - for HTTP authorization header
 */
function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
  const token = jwt.sign({ user_id: user.id }, secret, {
    subject: user.username,
    algorithm: 'HS256',
  })
  return `Bearer ${token}`
}

/**
 * remove data from tables and reset sequences for SERIAL id fields
 * @param {knex instance} db
 * @returns {Promise} - when tables are cleared
 */
function cleanTables(db) {
  return db.transaction(trx =>
    trx.raw(
      `TRUNCATE
        "word",
        "list",
        "user"`
      )
      .then(() =>
        Promise.all([
          trx.raw(`ALTER SEQUENCE word_id_seq minvalue 0 START WITH 1`),
          trx.raw(`ALTER SEQUENCE list_id_seq minvalue 0 START WITH 1`),
          trx.raw(`ALTER SEQUENCE user_id_seq minvalue 0 START WITH 1`),
          trx.raw(`SELECT setval('word_id_seq', 0)`),
          trx.raw(`SELECT setval('list_id_seq', 0)`),
          trx.raw(`SELECT setval('user_id_seq', 0)`),
        ])
      )
  )
}

/**
 * insert users into db with bcrypted passwords and update sequence
 * @param {knex instance} db
 * @param {array} users - array of user objects for insertion
 * @returns {Promise} - when users table seeded
 */
function seedUsers(db, users) {
  const preppedUsers = users.map(user => ({
    ...user,
    password: bcrypt.hashSync(user.password, 1)
  }))
  return db.transaction(async trx => {
    await trx.into('user').insert(preppedUsers)

    await trx.raw(`SELECT setval('user_id_seq', ?)`, [users[users.length - 1].id])
  })
}

/**
 * seed the databases with words and update sequence counter
 * @param {knex instance} db
 * @param {array} users - array of user objects for insertion
 * @param {array} lists - array of lists objects for insertion
 * @param {array} words - array of words objects for insertion
 * @returns {Promise} - when all tables seeded
 */
async function seedUsersListsWords(db, users, lists, words) {
  await seedUsers(db, users)

  await db.transaction(async trx => {
    await trx.into('list').insert(lists)
    await trx.into('word').insert(words)

    const list1Head = words.find(w => w.list_id === lists[0].id)
    const list2Head = words.find(w => w.list_id === lists[1].id)

    await Promise.all([
      trx('list').update({ head: list1Head.id }).where('id', lists[0].id),
      trx('list').update({ head: list2Head.id }).where('id', lists[1].id),
    ])

    await Promise.all([
      trx.raw(`SELECT setval('list_id_seq', ?)`, [lists[lists.length - 1].id]),
      trx.raw(`SELECT setval('word_id_seq', ?)`, [words[words.length - 1].id]),
    ])
  })
}

module.exports = {
  makeKnexInstance,
  makeUsersArray,
  makeListsAndWords,
  makeAuthHeader,
  cleanTables,
  seedUsers,
  seedUsersListsWords,
}
