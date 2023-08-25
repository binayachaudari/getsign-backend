const UserModel = require('../models/User.model');

const storeOrUpdateUser = async (userDetails, token) => {
  const user = await UserModel.findOne({
    user_id: userDetails?.user?.id,
  }).exec();

  if (!user)
    return await UserModel.create({
      accessToken: token,
      account_id: userDetails?.account?.id,
      user_id: userDetails?.user?.id,
      board_id: userDetails?.boardId,
      item_id: userDetails?.itemId,
      workspace_id: userDetails?.workspaceId,
      editorOnboarded: false,
    });

  user.account_id = userDetails?.account?.id;
  user.user_id = userDetails?.user?.id;
  user.board_id = userDetails?.boardId;
  user.item_id = userDetails?.itemId;
  user.workspace_id = userDetails?.workspaceId;
  user.accessToken = token;

  user.save();

  return user;
};

const isUserAuthenticated = async (userId, accountId) => {
  const user = await UserModel.findOne({
    user_id: userId,
    account_id: accountId,
  }).exec();

  return user;
};

const updateUserToken = async (userId, token) => {
  const users = await UserModel.find({ user_id: userId }).exec();

  if (users?.length) {
    for (const user of users) {
      user.accessToken = token;
      await user.save();
    }
  }

  return users?.[0];
};

module.exports = { storeOrUpdateUser, isUserAuthenticated, updateUserToken };
