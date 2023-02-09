const {
  authenticateBoard,
  isAlreadyAuthenticated,
} = require('../services/authenticatedBoard');

module.exports = {
  authorize: (req, res, next) => {
    const payload = req.body;
    var raw = JSON.stringify(payload);

    var requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: raw,
      redirect: 'follow',
    };

    fetch('https://auth.monday.com/oauth2/token', requestOptions)
      .then((response) => response.json())
      .then((result) => {
        if (result.error) {
          return next({ error: result, statusCode: 400 });
        }

        authenticateBoard(payload.boardId, result.access_token);
        return res
          .json({ data: { ...result, boardId: payload.boardId } })
          .status(200);
      })
      .catch((error) => next({ message: error, statusCode: 400 }));
  },
  isAuthorized: async (req, res, next) => {
    const { boardId } = req.params;

    try {
      const result = await isAlreadyAuthenticated(boardId);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },
};
