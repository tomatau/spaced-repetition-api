const express = require('express')
const LanguageService = require('./language-service')
const { requireAuth } = require('../middleware/jwt-auth')

const languageRouter = express.Router()
const jsonBodyParser = express.json()

languageRouter
  .use(requireAuth)

languageRouter
  .get('/', async (req, res, next) => {
    try {
      const languages = await LanguageService.getUsersLanguages(
        req.app.get('db'),
        req.user.id,
      )

      res.json(languages)
      next()
    } catch (error) {
      next(error)
    }
  })

languageRouter
  .all('/:language_id*', async (req, res, next) => {
    try {
      const language = await LanguageService.getLanguageById(
        req.app.get('db'),
        req.params.language_id,
      )

      if (!language)
        return res.status(404).json({
          error: `Language doesn't exist`
        })

      if (language.user_id !== req.user.id)
        return res.status(403).json({
          error: `That language doesn't belong to you! Silly!`
        })

      req.language = language
      next()
    } catch (error) {
      next(error)
    }
  })

languageRouter
  .route('/:language_id/head')
  .get(async (req, res, next) => {
    try {
      const word = await LanguageService.getLanguageHead(
        req.app.get('db'),
        req.params.language_id
      )

      res.json({
        nextWord: word.original,
        wordScore: word.score,
        languageTotalScore: word.language_total_score,
      })
    } catch (error) {
      next(error)
    }
  })

languageRouter
  .route('/:language_id/guess')
  .post(jsonBodyParser, async (req, res, next) => {
    try {
      const { guess } = req.body
      const { language } = req

      if (!guess)
        return res.status(400).json({
          error: `Missing 'guess' in request body`
        })

      const words = await LanguageService.getLanguageWords(
        req.app.get('db'),
        req.params.language_id
      )

      const linkedLanguage = LanguageService.populateLinkedList(
        language,
        words,
      )

      const node = linkedLanguage.head
      const answer = node.value.translation

      let isCorrect
      if (guess === answer) {
        isCorrect = true

        linkedLanguage.head
          .value.memory_value = Number(node.value.memory_value) * 2

        linkedLanguage.head.value.score = Number(linkedLanguage.head.value.score) + 1

        linkedLanguage.total_score = Number(linkedLanguage.total_score) + 1
      } else {
        isCorrect = false

        linkedLanguage.head.value.memory_value = 1
      }

      linkedLanguage.shiftHeadBy(linkedLanguage.head.value.memory_value)

      await LanguageService.persistLinkedList(
        req.app.get('db'),
        linkedLanguage
      )

      res.json({
        nextWord: linkedLanguage.head.value.original,
        wordScore: linkedLanguage.head.value.score,
        languageTotalScore: linkedLanguage.total_score,
        answer,
        isCorrect,
      })
    } catch (error) {
      next(error)
    }
  })

module.exports = languageRouter
