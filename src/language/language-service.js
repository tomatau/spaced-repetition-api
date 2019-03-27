const { LinkedList } = require('./linked-list')

const LanguageService = {
  getUsersLanguage(db, user_id) {
    return db
      .from('language')
      .select(
        'language.id',
        'language.name',
        'language.user_id',
        'language.head',
        'language.total_score',
      )
      .where('language.user_id', user_id)
      .first()
  },

  getLanguageById(db, language_id) {
    return db
      .from('language')
      .select(
        'language.id',
        'language.name',
        'language.user_id',
        'language.head',
        'language.total_score',
      )
      .where('language.id', language_id)
      .first()
  },

  getLanguageHead(db, language_id) {
    return db
      .from('word')
      .select(
        'word.id',
        'word.language_id',
        'word.original',
        'word.translation',
        'word.next',
        'word.memory_value',
        'word.correct_count',
        'word.incorrect_count',
        'language.total_score',
      )
      .leftJoin('language', 'language.head', 'word.id')
      .where('language.id', language_id)
      .first()
  },

  getLanguageWords(db, language_id) {
    return db
      .from('word')
      .select(
        'id',
        'language_id',
        'original',
        'translation',
        'next',
        'memory_value',
        'correct_count',
        'incorrect_count',
      )
      .where({ language_id })
  },

  populateLinkedList(language, words) {
    const ll = new LinkedList({
      id: language.id,
      name: language.name,
      total_score: language.total_score,
    })

    let word = words.find(w => w.id === language.head)

    ll.insert({
      id: word.id,
      original: word.original,
      translation: word.translation,
      memory_value: word.memory_value,
      correct_count: word.correct_count,
      incorrect_count: word.incorrect_count,
    })

    while (word.next) {
      word = words.find(w => w.id === word.next)

      ll.insert({
        id: word.id,
        original: word.original,
        translation: word.translation,
        memory_value: word.memory_value,
        correct_count: word.correct_count,
        incorrect_count: word.incorrect_count,
      })
    }

    return ll
  },

  persistLinkedList(db, linkedLanguage) {
    return db.transaction(trx =>
      Promise.all([
        db('language')
          .transacting(trx)
          .where('id', linkedLanguage.id)
          .update({
            total_score: linkedLanguage.total_score,
            head: linkedLanguage.head.value.id,
          }),
        ...linkedLanguage.map(node =>
          db('word')
            .transacting(trx)
            .where('id', node.value.id)
            .update({
              memory_value: node.value.memory_value,
              correct_count: node.value.correct_count,
              incorrect_count: node.value.incorrect_count,
              next: node.next ? node.next.value.id : null,
            })
        )
      ])
    )
  }
}

module.exports = LanguageService
