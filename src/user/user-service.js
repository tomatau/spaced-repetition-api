const bcrypt = require('bcryptjs')

const REGEX_UPPER_LOWER_NUMBER_SPECIAL = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&])[\S]+/

const UserService = {
  hasUserWithUserName(db, username) {
    return db('user')
      .where({ username })
      .first()
      .then(user => !!user)
  },
  insertUser(db, newUser) {
    return db
      .insert(newUser)
      .into('user')
      .returning('*')
      .then(([user]) => user)
  },
  validatePassword(password) {
    if (password.length < 8) {
      return 'Password be longer than 8 characters'
    }
    if (password.length > 72) {
      return 'Password be less than 72 characters'
    }
    if (password.startsWith(' ') || password.endsWith(' ')) {
      return 'Password must not start or end with empty spaces'
    }
    if (!REGEX_UPPER_LOWER_NUMBER_SPECIAL.test(password)) {
      return 'Password must contain one upper case, lower case, number and special character'
    }
    return null
  },
  hashPassword(password) {
    return bcrypt.hash(password, 12)
  },
  serializeUser(user) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
    }
  },
  populateUserWords(db, user_id) {
    return db.transaction(async trx => {
      const [l33tListId, frenchListId] = await trx
        .into('list')
        .insert([
          { name: 'l337$p34k', user_id },
          { name: 'French', user_id },
        ], ['id'])

      // when inserting words,
      // we need to know the current sequence number
      // so that we can set the `next` field of the linked list
      const seq = await db
        .from('word_id_seq')
        .select('last_value')
        .first()

      const l33tListWords = [
        ['1337', 'leet', 2],
        ['h3110', 'hello', 3],
        ['c001', 'cool', 4],
        ['7r4n$l473', 'translate', 5],
        ['w3rd', 'word', 6],
        ['4m4z1n5', 'amazing', 7],
        ['d0g', 'dog', 8],
        ['c47', 'cat', null],
      ]

      const frenchListWords = [
        ['entraine toi', 'practice', 10],
        ['bonjour', 'hello', 11],
        ['maison', 'house', 12],
        ['développeur', 'developer', 13],
        ['traduire', 'translate', 14],
        ['incroyable', 'amazing', 15],
        ['chien', 'dog', 16],
        ['chat', 'cat', null],
      ]

      const [l33tHeadId] = await trx
        .into('word')
        .insert(
          l33tListWords.map(([original, translation, nextInc]) => ({
            list_id: l33tListId.id,
            original,
            translation,
            next: nextInc
              ? Number(seq.last_value) + nextInc
              : null
          })),
          ['id']
        )

      const [frenchHeadId] = await trx
        .into('word')
        .insert(
          frenchListWords.map(([original, translation, nextInc]) => ({
            list_id: frenchListId.id,
            original,
            translation,
            next: nextInc
              ? Number(seq.last_value) + nextInc
              : null
          })),
          ['id']
        )

      await Promise.all([
        trx('list')
          .where('id', l33tListId.id)
          .update({
            head: l33tHeadId.id,
          }),
        trx('list')
          .where('id', frenchListId.id)
          .update({
            head: frenchHeadId.id,
          }),
      ])
    })
  },
}

module.exports = UserService
