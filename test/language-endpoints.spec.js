const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Language Endpoints', function () {
  let db

  const testUsers = helpers.makeUsersArray()
  const [testUser] = testUsers
  const [testLanguages, testWords] = helpers.makeLanguagesAndWords(testUser)

  before('make knex instance', () => {
    db = helpers.makeKnexInstance()
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => helpers.cleanTables(db))

  afterEach('cleanup', () => helpers.cleanTables(db))

  /**
   * @description Endpoints for a language owned by a user
   **/
  describe(`Endpoints protected by user`, () => {
    const languageSpecificEndpoint = [
      {
        title: `GET /api/language/:language_id/head`,
        path: languageId => `/api/language/${languageId}/head`,
        method: supertest(app).get
      },
      {
        title: `POST /api/language/:language_id/guess`,
        path: languageId => `/api/language/${languageId}/guess`,
        method: supertest(app).post
      },
    ]

    languageSpecificEndpoint.forEach(endpoint => {
      describe(endpoint.title, () => {
        const [testLanguage] = testLanguages

        beforeEach('insert users, languages and words', () => {
          return helpers.seedUsersLanguagesWords(
            db,
            testUsers,
            testLanguages,
            testWords,
          )
        })

        it(`responds with 404 if language doesn't exist`, () => {
          return endpoint.method(endpoint.path(123))
            .set('Authorization', helpers.makeAuthHeader(testUser))
            .send({})
            .expect(404, {
              error: `Language doesn't exist`,
            })
        })

        it(`responds with 403 if language doesn't belong to user`, () => {
          return endpoint.method(endpoint.path(testLanguage.id))
            .set('Authorization', helpers.makeAuthHeader(testUsers[1]))
            .send({})
            .expect(403, {
              error: `That language doesn't belong to you! Silly!`,
            })
        })
      })
    })
  })

  /**
   * @description Get languages for a user
   **/
  describe(`GET /api/language`, () => {
    const usersLanguages = testLanguages.filter(l => l.user_id === testUser.id)

    beforeEach('insert users, languages and words', () => {
      return helpers.seedUsersLanguagesWords(db, testUsers, testLanguages, testWords)
    })

    it(`responds with 200 and user's languages`, () => {
      return supertest(app)
        .get(`/api/language`)
        .set('Authorization', helpers.makeAuthHeader(testUser))
        .expect(200)
        .expect(res => {
          expect(res.body).to.have.length(usersLanguages.length)

          usersLanguages.forEach((usersLanguage, idx) => {
            expect(res.body[idx]).to.have.property('id', usersLanguage.id)
            expect(res.body[idx]).to.have.property('name', usersLanguage.name)
            expect(res.body[idx]).to.have.property('user_id', usersLanguage.user_id)
            expect(res.body[idx]).to.have.property('total_score', 0)
            expect(res.body[idx]).to.have.property('head').which.is.not.null
          })
        })
    })
  })

  /**
   * @description Get head from language
   **/
  describe(`GET /api/language/:language_id/head`, () => {
    const usersLanguage = testLanguages.find(l => l.user_id === testUser.id)
    const headWord = testWords.find(w => w.language_id === usersLanguage.id)

    beforeEach('insert users, languages and words', () => {
      return helpers.seedUsersLanguagesWords(
        db,
        testUsers,
        testLanguages,
        testWords,
      )
    })

    it(`responds with 200 and user's languages`, () => {
      return supertest(app)
        .get(`/api/language/${usersLanguage.id}/head`)
        .set('Authorization', helpers.makeAuthHeader(testUser))
        .expect(200)
        .expect({
          nextWord: headWord.original,
          languageTotalScore: 0,
        })
    })
  })

  /**
   * @description Submit a new guess for the language
   **/
  describe(`POST /api/language/:language_id/guess`, () => {
    const [testLanguage] = testLanguages
    const testLanguagesWords = testWords.filter(w => w.language_id === testLanguage.id)

    beforeEach('insert users, languages and words', () => {
      return helpers.seedUsersLanguagesWords(
        db,
        testUsers,
        testLanguages,
        testWords,
      )
    })

    it(`responds with 400 required error when 'guess' is missing`, () => {
      const postBody = {
        randomField: 'test random field',
      }

      return supertest(app)
        .post(`/api/language/${testLanguage.id}/guess`)
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
          .post(`/api/language/${testLanguage.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(incorrectPostBody)
          .expect(200)
          .expect({
            nextWord: testLanguagesWords[1].original,
            languageTotalScore: 0,
            answer: testLanguagesWords[0].translation,
            isCorrect: false
          })
      })

      it(`moves the word two spaces back`, async () => {
        await supertest(app)
          .post(`/api/language/${testLanguage.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(incorrectPostBody)

        await supertest(app)
          .post(`/api/language/${testLanguage.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(incorrectPostBody)
          .expect({
            nextWord: testLanguagesWords[0].original,
            languageTotalScore: 0,
            answer: testLanguagesWords[1].translation,
            isCorrect: false
          })
      })
    })

    context(`Given correct guess`, () => {
      const testLanguagesWords = testWords.filter(w => w.language_id === testLanguage.id)

      it(`responds with correct and moves head`, () => {
        const correctPostBody = {
          guess: testLanguagesWords[0].translation,
        }
        return supertest(app)
          .post(`/api/language/${testLanguage.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(correctPostBody)
          .expect(200)
          .expect({
            nextWord: testLanguagesWords[1].original,
            languageTotalScore: 1,
            answer: testLanguagesWords[0].translation,
            isCorrect: true
          })
      })

      it(`moves the word three spaces back`, async () => {
        let correctPostBody = {
          guess: testLanguagesWords[0].translation,
        }
        await supertest(app)
          .post(`/api/language/${testLanguage.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(correctPostBody)

        correctPostBody = {
          guess: testLanguagesWords[1].translation,
        }
        await supertest(app)
          .post(`/api/language/${testLanguage.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(correctPostBody)
          .expect({
            nextWord: testLanguagesWords[2].original,
            languageTotalScore: 2,
            answer: testLanguagesWords[1].translation,
            isCorrect: true
          })

        correctPostBody = {
          guess: testLanguagesWords[2].translation,
        }
        await supertest(app)
          .post(`/api/language/${testLanguage.id}/guess`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(correctPostBody)
          .expect({
            nextWord: testLanguagesWords[0].original,
            languageTotalScore: 3,
            answer: testLanguagesWords[2].translation,
            isCorrect: true
          })
      })
    })
  })
})
