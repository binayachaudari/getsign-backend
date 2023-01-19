const router = require('express').Router();
const controller = require('../../controller/board.controller');

router.get('/:boardId', controller.getBoardFile);

module.exports = router;
