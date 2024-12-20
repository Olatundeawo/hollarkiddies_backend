var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
require('dotenv').config();
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const productRouter = require('./routes/products');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Allow cross origin
app.use(cors({
  origin: 'https://hollartkiddies.onrender.com', // Allow your frontend URL
  // origin: 'http://localhost:5173', // Allow your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods if needed
  credentials: true // If you need to send cookies or auth headers
}));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Server the images folder as static directory. 
app.use('/images', express.static(path.join(__dirname, 'controllers/images')));

app.use('/api', productRouter);
app.use('/users', usersRouter);




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
const PORT =  5000;
app.listen(PORT, () => {
  console.log(`Now running on port ${PORT}`);
});

module.exports = app;
