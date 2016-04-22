var React = require('react');
var ReactDom = require('react-dom');

require('./extensionMethods.js');

var reactChart = require("react-chartjs");
var LineChart = reactChart.Line;

var Select = require('react-select');
var Slider = require('rc-slider');

const sliderTooltipFormatter = function(v) {
	return v + ' days';
};

var ChartOptionsComponent = React.createClass( {
	getInitialState: function () {
		return { 
			daysHistory: this.props.daysHistory, 
			controlsCollapsed: false
		};
	},
	onSliderChanged: function (rangeVal) {
		var newVal = { daysHistory: rangeVal, controlsCollapsed: this.state.controlsCollapsed };
		this.setState(newVal);
		this.props.onChartOptionsChanged(newVal);
	},
	onSymbolsChanged: function (symbolsArray) {
		//this.setState({ stockSymbolsString: symbolsString, stockSymbols: symbolsArray, daysHistory: this.state.daysHistory });
		var symbolsString = '';
		symbolsArray = symbolsArray.map(function (item) { return item.value; });
		if (symbolsArray.length)
			symbolsString = symbolsArray.join(',');
		this.props.onChartOptionsChanged({ stockSymbolsString: symbolsString, stockSymbols: symbolsArray });
	},
	toggleControls: function(){ this.setState({ controlsCollapsed: !this.state.controlsCollapsed }); },
	render: function () { 
		var stockSelectionLabel = 'Selected Symbols: ';
		var sliderLabel = 'Length of History: ';
		var stockSelectionOptions = [{ value: "GOOG", label: "Google" }, { value: "AAPL", label: "Apple" }, { value: "INTC", label: "Intel" }];
		
		return (
			<div className="container chart-controls-container">
				<button className="btn btn-default btn-toggle-chart-controls pull-right"  title={(this.state.controlsCollapsed === true ? 'Show ' : 'Hide ') + 'Chart Controls'} onClick={this.toggleControls}><span aria-hidden="true" className={ 'glyphicon ' + (this.state.controlsCollapsed === true ? 'glyphicon-menu-down' : 'glyphicon-menu-up')} /></button>
				<div className={'row chart-control-labels' + (this.state.controlsCollapsed === true ? ' hide' : '')}>
					<div className="col-xs-2 col-md-2">{stockSelectionLabel}</div>
					<div className="col-xs-6 col-md-6">&nbsp;</div>
					<div className="col-xs-2 col-md-2 length-history-label">{sliderLabel}</div>
					<div className="col-xs-2 col-md-2">&nbsp;</div>
				</div>
				<div className={'row chart-controls' + (this.state.controlsCollapsed === true ? ' hide' : '')}>
					<Select className="col-xs-3 col-md-3" name="stockSymbolsInput" multi={true} delimiter="," value={this.props.stockSymbolsString} options={stockSelectionOptions} onChange={this.onSymbolsChanged}/>
					<div className="col-xs-5 col-md-5">&nbsp;</div>
					<Slider className="col-xs-4 col-md-4" value={this.state.daysHistory} max={30} step={5} tipFormatter={sliderTooltipFormatter} tipTransitionName="rc-slider-tooltip-zoom-down" onChange={this.onSliderChanged} />
				</div>
			</div>
		);
	}
});

const randomColorFactor = function() {
	return Math.round(Math.random() * 255);
};
const randomColor = function(opacity) {
	return 'rgba(' + randomColorFactor() + ',' + randomColorFactor() + ',' + randomColorFactor() + ',' + (opacity || '.3') + ')';
};

const buildChartData = function(responseData) {
	if (typeof(responseData) === 'string')
		responseData = JSON.parse(responseData);

	var stocksData = responseData.query.results;
	if (stocksData) {
		stocksData = stocksData.quote;
	}

	if (!(Array.isArray(stocksData) && stocksData.length))
		return {labels: [], datasets: []};

	var labels = [];
	var datasets = [];
	var symbolEntries = {};

	stocksData.sort(function(entry1, entry2) {
		return (new Date(entry1.Date).valueOf() - new Date(entry2.Date).valueOf());
	});

	stocksData.forEach(function(stockEntry) {
		var quoteDate = stockEntry.Date;
		var symbol = stockEntry.Symbol;

		var label = (typeof(quoteDate) === 'string' ? new Date(quoteDate) : quoteDate).toLocaleDateString();
		if (!labels.contains(label)) {
			labels.push(label);
		}

		if (!symbolEntries.hasOwnProperty(symbol)) {
			Object.defineProperty(symbolEntries, symbol, {enumerable: true, value: []});
		}

		symbolEntries[symbol].push(stockEntry.Close);
	});

	// Now translate the sorted items into the dataset stuff that the chartjs tool wants...
	Object.getOwnPropertyNames(symbolEntries).forEach(function(symbol){
		var dataPoints = symbolEntries[symbol];
		var fillColor = randomColor(0.2);
		var strokeColor = randomColor(1.0);
		var dataset = Object.freeze({
			label: symbol,
			data: dataPoints,
			fill: false,
			fillColor: fillColor,
			strokeColor: strokeColor,
			pointColor: strokeColor,
			pointStrokeColor: "#fff",
			pointHighlightFill: "#fff",
			pointHighlightStroke: strokeColor
		});
		datasets.push(dataset);
	});
	return Object.freeze({
		labels: labels, 
		datasets: datasets
	});
};

const localStorageKey = 'persistedChartOptions';

const getPersistedOptions = function() {
	var storedSettings = window.localStorage && window.localStorage.getItem(localStorageKey);
	if (!storedSettings)
		return null;

	return JSON.parse(storedSettings);
};

const persistOptions = function(optionsObj) {
	if (!(optionsObj && window.localStorage))
		return;

	if (typeof(optionsObj) !== 'string')
		optionsObj = JSON.stringify(optionsObj);

	window.localStorage.setItem(localStorageKey, optionsObj);
};

var ChartApplication = React.createClass({
	updateStockHistory: function (optionsData) { 
		var selectedSymbols = optionsData.stockSymbols || this.state.stockSymbols;
		if (!selectedSymbols.length)
			return;
		var stockSymbolsString = optionsData.stockSymbolsString || this.state.stockSymbolsString;	
		var daysHistory = optionsData.daysHistory || this.state.daysHistory;

		// Need to go ahead and make the HTTP request to pull the appropriate data...
		($ || jQuery).get('api/stock-history/' + stockSymbolsString + '/' + daysHistory, function(data, status, jqXhr) {
			var persistableOptions = {
				stockSymbolsString: stockSymbolsString, 
				stockSymbols: selectedSymbols, 
				daysHistory: daysHistory
			};

			persistOptions(persistableOptions);

			Object.defineProperties(persistableOptions, {
				stockData: {enumerable: true, value: data},
				chartData: {enumerable: true, value: buildChartData(data)}
			});
			this.setState(persistableOptions);
		}.bind(this), 'json');
	},
	componentDidMount: function() {
		this.updateStockHistory(this.state);
	},
	getInitialState: function () { 
		var persistedOptions = getPersistedOptions() || {};

		return { 
			stockSymbolsString: persistedOptions.stockSymbolsString || 'GOOG', 
			stockSymbols: persistedOptions.stockSymbols || ['GOOG'], 
			daysHistory: persistedOptions.daysHistory || 5, 
			stockData: {}, 
			chartData: { labels: [new Date().toLocaleDateString()], datasets: [{data: [0]}] }
		};
	},
	render: function () { 
		var chartOptions = {
			datasetFill: false,
			pointDotStrokeWidth: 4,
			scaleShowVerticalLines: false,
			responsive: true
		};

		var chartStyles = {maxHeight: 650};

		return (
			<div className="row app-content-wrapper">
				<ChartOptionsComponent stockSymbolsString={this.state.stockSymbolsString} daysHistory={this.state.daysHistory} onChartOptionsChanged={this.updateStockHistory}/>
				<LineChart ref="line-graph" data={this.state.chartData} options={chartOptions} style={chartStyles} redraw />
			</div>
		);
	}
});

ReactDom.render(<ChartApplication />, ($ || jQuery)('.react-app')[0]);