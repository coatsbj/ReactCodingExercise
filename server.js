var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var fs = require('fs');
var request = require('request');

var app = express();
app.set('port', (process.env.PORT || 9890));

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'pub')));

// #region Configure the Stock Quote Retrieval stuff
require('./src/extensionMethods.js');

var getDateString = function (dateVal) {
	dateVal = dateVal || new Date();

	var yyyy = dateVal.getFullYear() + '';
	var MM = (dateVal.getMonth() + 1) + '';
	var dd = (dateVal.getDate() + 1) + '';

	if (MM.length < 2)
		MM = '0' + MM;
	
	if (dd.length < 2)
		dd = '0' + dd;

	return (yyyy + '-' + MM + '-' + dd);
};

var getDaysAgo = function (numDays) {
	var a = new Date();
	a.setDate(a.getDate() - numDays);
	return a;
}

var yahooFinanceApiUri = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.historicaldata%20where%20symbol%20in%20%28{0}%29%20and%20startDate%20%3D%20%22{1}%22%20and%20endDate%20%3D%20%22{2}%22&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=';
var getStockData = function (symbols, daysHistory, callback) {
	if (typeof (symbols) === 'string') {
		symbols = [symbols];
	}

	var symbolsString = '%22';
	if (Array.isArray(symbols)) {
		symbolsString +=(symbols.join('%22%2C%22') + '%22');
	}
	
	var endDateString = getDateString();
	var startDateString = getDateString(getDaysAgo(daysHistory));

	var actualFinanceApiUri = String.format(yahooFinanceApiUri, symbolsString, startDateString, endDateString);
	console.log('Stock API request URI: ' + actualFinanceApiUri);

	request(actualFinanceApiUri, function (error, response, body) {
		var err;
		if (error) {
			err = new Error('An error has occurred while calling the Yahoo Finance API: ' + error);
		}
		else if (response.statusCode !== 200) {
			err = new Error('A non-success response (' + response.statusCode + ') was returned from the Yahoo Finance API: ' + body);
		}

		if (response.statusCode == 200) {
			callback(err, body);
		}
	})
};

var handleApiRequest = function (req, res, next) {
	getStockData(req.stockSymbols, req.daysHistory, function (err, result) {
		if (err) {
			next(err);
			return;
		}

		res.status = 200;
		res.write(result);
		res.end();
	});
};

// #endregion Configure the Stock Quote Retrieval Stuff

// #region Set Up the router
// create the router
var apiRouter = express.Router();

// define a parameter for scope of data requested
apiRouter.param('daysHistory', function (req, res, next, daysHistoryVal) {
	var numDays = Number(daysHistoryVal);

	Object.defineProperty(req, 'daysHistory', { enumerable: true, value: isNaN(numDays) ? 30 : numDays });
	next();
});

// define a parameter for the stock symbols selected
apiRouter.param('stockSymbols', function (req, res, next, stockSymbolsVal) {
	var symbols = stockSymbolsVal.split(",");
	
	Object.defineProperty(req, 'stockSymbols', { enumerable: true, value: symbols || ["GOOG"] });
	next();
});

apiRouter.route('/stock-history/:daysHistory')
    .all(function (req, res, next) { next(); })
    .post(function (req, res, next) { next(new Error('This action is not available for the "POST" HTTP verb.')); })
	.put(function (req, res, next) { next(new Error('This action is not available for the "PUT" HTTP verb.')); })
    .delete(function (req, res, next) { next(new Error('This action is not available for the "DELETE" HTTP verb.')); })
    .get(function (req, res, next) {
		// Do the work...
		// Here's where we should define the stock symbols since they are not supplied in the request...but that should really be in a POST request with a body.  We'll handle that later.
		handleApiRequest(req, res, next);
});

apiRouter.route('/stock-history/:stockSymbols/:daysHistory')
    .all(function (req, res, next) { next(); })
    .post(function (req, res, next) { next(new Error('This action is not available for the "POST" HTTP verb.')); })
	.put(function (req, res, next) { next(new Error('This action is not available for the "PUT" HTTP verb.')); })
    .delete(function (req, res, next) { next(new Error('This action is not available for the "DELETE" HTTP verb.')); })
    .get(function (req, res, next) {
	// Do the work...
	// Here's where we should define the stock symbols since they are not supplied in the request...but that should really be in a POST request with a body.  We'll handle that later.
	handleApiRequest(req, res, next);
});

apiRouter.route('/stock-history')
    .all(function (req, res, next) { next(); })
    .post(function (req, res, next) { next(new Error('This action is not available for the "POST" HTTP verb.')); })
	.put(function (req, res, next) { next(new Error('This action is not available for the "PUT" HTTP verb.')); })
    .delete(function (req, res, next) { next(new Error('This action is not available for the "DELETE" HTTP verb.')); })
    .get(function (req, res, next) {
		// Do the work...
	Object.defineProperty(req, 'daysHistory', { enumerable: true, value: 5 });
	Object.defineProperty(req, 'stockSymbols', { enumerable: true, value: ["GOOG"] });
		handleApiRequest(req, res, next);
	});


app.use('/api', apiRouter);
// #endregion Set Up the router

//app.get('/stock-ticker', function (req, res) {
//	// This is our reverse proxy to the web API for stock ticker data...
//});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

var server = app.listen(app.get('port'), function () {
	console.log('Express server listening on port ' + server.address().port);
});