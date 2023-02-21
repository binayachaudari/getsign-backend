const router = require('express').Router();
const controller = require('../../controller/board.controller');

router.get('/:boardId/:itemId', controller.getBoardFile);

module.exports = router;
