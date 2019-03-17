const app = require('../src/app')
const helpers = require('./test-helpers')

describe('List Endpoints', function () {
  let db

  const testUsers = helpers.makeUsersArray()
  const [testUser] = testUsers
  const [testLists, testWords] = helpers.makeListsAndWords(testUser)

  before('make knex instance', () => {
    db = helpers.makeKnexInstance()
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => helpers.cleanTables(db))

  afterEach('cleanup', () => helpers.cleanTables(db))

  /**
   * @description Endpoints for a list owned by a user
   **/
  describe(`Endpoints protected by user`, () => {
    const listSpecificEndpoint = [
      {
        title: `GET /api/list/:list_id/head`,
        path: listId => `/api/list/${listId}/head`,
        method: supertest(app).get
      },
      {
        title: `POST /api/list/:list_id/guess`,
        path: listId => `/api/list/${listId}/guess`,
        method: supertest(app).post
      },
    ]

    listSpecificEndpoint.forEach(endpoint => {
      describe(endpoint.title, () => {
        const [testList] = testLists

        beforeEach('insert users, lists and words', () => {
          return helpers.seedUsersListsWords(
            db,
            testUsers,
            testLists,
            testWords,
          )
        })

        it(`responds with 404 if list doesn't exist`, () => {
          return endpoint.method(endpoint.path(123))
            .set('Authorization', helpers.makeAuthHeader(testUser))
            .send({})
            .expect(404, {
              error: `List doesn't exist`,
            })
        })

        it(`responds with 403 if list doesn't belong to user`, () => {
          return endpoint.method(endpoint.path(testList.id))
            .set('Authorization', helpers.makeAuthHeader(testUsers[1]))
            .send({})
            .expect(403, {
              error: `That list doesn't belong to you! Silly!`,
            })
        })
      })
    })
  })

  /**
   * @description Get lists for a user
   **/
  describe(`GET /api/list`, () => {
    const usersLists = testLists.filter(l => l.user_id === testUser.id)

    beforeEach('insert users, lists and words', () => {
      return helpers.seedUsersListsWords(db, testUsers, testLists, testWords)
    })

    it(`responds with 200 and user's lists`, () => {
      return supertest(app)
        .get(`/api/list`)
        .set('Authorization', helpers.makeAuthHeader(testUser))
        .expect(200)
        .expect(res => {
          expect(res.body).to.have.length(usersLists.length)

          usersLists.forEach((usersList, idx) => {
            expect(res.body[idx]).to.have.property('id', usersList.id)
            expect(res.body[idx]).to.have.property('name', usersList.name)
            expect(res.body[idx]).to.have.property('user_id', usersList.user_id)
            expect(res.body[idx]).to.have.property('score', 0)
            expect(res.body[idx]).to.have.property('head').which.is.not.null
          })
        })
    })
  })

  /**
   * @description Get head from list
   **/
  describe(`GET /api/list/:list_id/head`, () => {
    const usersList = testLists.find(l => l.user_id === testUser.id)
    const headWord = testWords.find(w => w.list_id === usersList.id)

    beforeEach('insert users, lists and words', () => {
      return helpers.seedUsersListsWords(
        db,
        testUsers,
        testLists,
        testWords,
      )
    })

    it(`responds with 200 and user's lists`, () => {
      return supertest(app)
        .get(`/api/list/${usersList.id}/head`)
        .set('Authorization', helpers.makeAuthHeader(testUser))
        .expect(200)
        .expect({
          nextWord: headWord.original,
          listScore: 0,
        })
    })
  })

  /**
   * @description Submit a new guess for the list
   **/
  describe(`POST /api/list/:list_id/guess`, () => {
    const [testList] = testLists
    const testListsWords = testWords.filter(w => w.list_id === testList.id)

    beforeEach('insert users, lists and words', () => {
      return helpers.seedUsersListsWords(
        db,
        testUsers,
        testLists,
        testWords,
      )
    })

    it(`responds with 400 required error when 'guess' is missing`, () => {
      const postBody = {
        randomField: 'test random field',
      }

      return supertest(app)
        .post(`/api/list/${testList.id}/guess`)
        .set('Authorization', helpers.makeAuthHeader(testUser))
        .send(postBody)
        .expect(400, {
          error: `Missing 'guess' in request body`,
        })
    })

    context(`Given incorrect guess`, () => {
      const incorrectPostBody = {
        guess: 'incorrect',
      }

      it(`responds with incorrect and moves head`, () => {
        return supertest(app)
          .post(`/api/list/${testList.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(incorrectPostBody)
          .expect(200)
          .expect({
            nextWord: testListsWords[1].original,
            listScore: 0,
            answer: testListsWords[0].translation,
            isCorrect: false
          })
      })

      it(`moves the word two spaces back`, async () => {
        await supertest(app)
          .post(`/api/list/${testList.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(incorrectPostBody)

        await supertest(app)
          .post(`/api/list/${testList.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(incorrectPostBody)
          .expect({
            nextWord: testListsWords[0].original,
            listScore: 0,
            answer: testListsWords[1].translation,
            isCorrect: false
          })
      })
    })

    context(`Given correct guess`, () => {
      const testListsWords = testWords.filter(w => w.list_id === testList.id)

      it(`responds with correct and moves head`, () => {
        const correctPostBody = {
          guess: testListsWords[0].translation,
        }
        return supertest(app)
          .post(`/api/list/${testList.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(correctPostBody)
          .expect(200)
          .expect({
            nextWord: testListsWords[1].original,
            listScore: 1,
            answer: testListsWords[0].translation,
            isCorrect: true
          })
      })

      it(`moves the word three spaces back`, async () => {
        let correctPostBody = {
          guess: testListsWords[0].translation,
        }
        await supertest(app)
          .post(`/api/list/${testList.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(correctPostBody)

        correctPostBody = {
          guess: testListsWords[1].translation,
        }
        await supertest(app)
          .post(`/api/list/${testList.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(correctPostBody)
          .expect({
            nextWord: testListsWords[2].original,
            listScore: 2,
            answer: testListsWords[1].translation,
            isCorrect: true
          })

        correctPostBody = {
          guess: testListsWords[2].translation,
        }
        await supertest(app)
          .post(`/api/list/${testList.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(correctPostBody)
          .expect({
            nextWord: testListsWords[0].original,
            listScore: 3,
            answer: testListsWords[2].translation,
            isCorrect: true
          })
      })
    })
  })
})
