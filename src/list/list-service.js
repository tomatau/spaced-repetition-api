const { LinkedList } = require('./linked-list')

const ListService = {
  getUsersLists(db, user_id) {
    return db
      .from('list')
      .select(
        'list.id',
        'list.name',
        'list.user_id',
        'list.head',
        'list.score',
      )
      .where('list.user_id', user_id)
  },
  getListById(db, list_id) {
    return db
      .from('list')
      .select(
        'list.id',
        'list.name',
        'list.user_id',
        'list.head',
        'list.score',
      )
      .where('list.id', list_id)
      .first()
  },

  getListHead(db, list_id) {
    return db
      .from('word')
      .select(
        'word.id',
        'word.list_id',
        'word.original',
        'word.translation',
        'word.next',
        'word.memory_value',
        'list.score as list_score',
      )
      .leftJoin('list', 'list.head', 'word.id')
      .where('list.id', list_id)
      .first()
  },

  getListWords(db, list_id) {
    return db
      .from('word')
      .select(
        'id',
        'list_id',
        'original',
        'translation',
        'next',
        'memory_value',
      )
      .where({ list_id })
  },

  populateLinkedList(list, words) {
    const ll = new LinkedList({
      id: list.id,
      name: list.name,
      score: list.score,
    })

    let word = words.find(w => w.id === list.head)

    ll.insert({
      id: word.id,
      original: word.original,
      translation: word.translation,
      memory_value: word.memory_value,
    })

    while (word.next) {
      word = words.find(w => w.id === word.next)

      ll.insert({
        id: word.id,
        original: word.original,
        translation: word.translation,
        memory_value: word.memory_value,
      })
    }

    return ll
  },

  persistLinkedList(db, linkedList) {
    return db.transaction(trx => {
      Promise.all([
        db('list')
          .transacting(trx)
          .where('id', linkedList.id)
          .update({
            score: linkedList.score,
            head: linkedList.head.value.id,
          }),
        ...linkedList.map(node =>
          db('word')
            .transacting(trx)
            .where('id', node.value.id)
            .update({
              memory_value: node.value.memory_value,
              next: node.next ? node.next.value.id : null,
            })
        )
      ])
        .then(trx.commit)
        .catch(trx.rollback)
    })
  }
}

module.exports = ListService
