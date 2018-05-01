process.env.UV_THREADPOOL_SIZE = 128;
var http = require('http');    
http.globalAgent.maxSockets = 100;
const numCPUs = require('os').cpus().length;
    // You could also set it to unlimited (Node v0.12 does by default):
http.globalAgent.maxSockets = Infinity;
const express = require("express");
const app = express();
var cookieParser = require('cookie-parser');
app.use(cookieParser());
//var logger = require('morgan');

const winston = require('winston');

require('winston-syslog').Syslog;

const logger = winston.createLogger({
    format: winston.format.prettyPrint(),
    transports: [
        new winston.transports.Syslog({handleExceptions: true, level: 'error' })
    ]
});

const bodyParser = require('body-parser');


app.use(bodyParser.urlencoded({extended: false}));

app.use(bodyParser.json());
//app.use(logger('dev'));

const userRoute = require('./api/routes/user');
app.use(userRoute);

app.use(function(req, res, next){
    const error = new Error("Not found");
    error.status = 404;
    next(error);
});

app.use(function(error,req,res, next){
    res.status(error.status || 500);
    res.json({
        error:{
            message:error.message
        }
    });
  //  console.log("ERR "+ error.status);
});

const port = process.env.port || 80;
app.listen(port, () => logger.info(`Example app listening on port ${port}!`))
