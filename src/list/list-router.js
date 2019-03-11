const express = require('express')
const ListService = require('./list-service')
const { requireAuth } = require('../middleware/jwt-auth')

const listRouter = express.Router()
const jsonBodyParser = express.json()

listRouter
  .use(requireAuth)

listRouter
  .get('/', async (req, res, next) => {
    try {
      const lists = await ListService.getUsersLists(
        req.app.get('db'),
        req.user.id,
      )

      res.json(lists)
      next()
    } catch (error) {
      next(error)
    }
  })

listRouter
  .all('/:list_id*', async (req, res, next) => {
    try {
      const list = await ListService.getListById(
        req.app.get('db'),
        req.params.list_id,
      )

      if (!list)
        return res.status(404).json({
          error: `List doesn't exist`
        })

      if (list.user_id !== req.user.id)
        return res.status(403).json({
          error: `That list doesn't belong to you! Silly!`
        })

      req.list = list
      next()
    } catch (error) {
      next(error)
    }
  })

listRouter
  .route('/:list_id')
  .get(async (req, res, next) => {
    try {
      const { list } = req
      const words = await ListService.getListWords(
        req.app.get('db'),
        req.params.list_id,
      )

      res.json(ListService.populateLinkedList(list, words))
    } catch (error) {
      next(error)
    }
  })

listRouter
  .route('/:list_id/head')
  .get(async (req, res, next) => {
    try {
      const word = await ListService.getListHead(
        req.app.get('db'),
        req.params.list_id
      )

      res.json({
        nextWord: word.original,
        listScore: word.list_score,
      })
    } catch (error) {
      next(error)
    }
  })

listRouter
  .route('/:list_id/guess')
  .post(jsonBodyParser, async (req, res, next) => {
    try {
      const { guess } = req.body
      const { list } = req
      const words = await ListService.getListWords(
        req.app.get('db'),
        req.params.list_id
      )

      const linkedList = ListService.populateLinkedList(
        list,
        words,
      )

      const node = linkedList.head
      const answer = node.value.translation

      let isCorrect
      if (guess === answer) {
        isCorrect = true
        linkedList.head
          .value.memory_value = Number(node.value.memory_value) * 2

        linkedList.score = Number(linkedList.score) + 1
      } else {
        isCorrect = false
        linkedList.head.value.memory_value = 1
      }

      linkedList.shiftHeadBy(linkedList.head.value.memory_value)

      await ListService.persistLinkedList(
        req.app.get('db'),
        linkedList
      )

      res.json({
        nextWord: linkedList.head.value.original,
        listScore: linkedList.score,
        answer,
        isCorrect,
      })
    } catch (error) {
      next(error)
    }
  })

module.exports = listRouter
