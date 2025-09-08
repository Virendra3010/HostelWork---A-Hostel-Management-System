const checkActiveUser = (req, res, next) => {
  if (req.user && !req.user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your account is deactivated. You can view information but cannot perform actions.',
      code: 'ACCOUNT_DEACTIVATED'
    });
  }
  next();
};

module.exports = { checkActiveUser };