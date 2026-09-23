const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: {
      success: false,
      status: statusCode,
      message: err.message || "Internal Server Error",
    },
  });
};

module.exports = errorHandler; 
