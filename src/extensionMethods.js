// RegExp.escape
// Escapes a string for use in a regex expression
if (!RegExp.escape) {
	RegExp.escape = function (text) {
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	};
}

// String.format
// Formats a string in the same manner as C#
// Usage: String.format("Format this {0} string {1}!", "bloody", "right now")
if (!String.format) {
	String.format = function () {
		if (arguments.length < 2 || typeof (arguments[0]) !== "string") {
			throw new Error('String.format requires at least two parameters.  Usage: String.format("Format this {0} string {1}", "bloody", "right now")');
		}
		
		var templateString = arguments[0];
		for (var arg = 1; arg < arguments.length; arg++) {
			var replacementValue = arguments[arg];
			templateString = templateString.replace(new RegExp(RegExp.escape('{' + (arg - 1).toString() + '}'), 'g'), (replacementValue ? replacementValue.toString() : ''));
		}
		
		return templateString;
	};
}

// Array contains - tries to find the supplied value in the array.  
if (!Array.prototype.contains) {
	Array.prototype.contains = function (value) {
		if (typeof (value) == "object")
			return this.some(function (arrayItem) { return Object.equals(arrayItem, value); });
		
		return (this.indexOf(value) != -1);
	};
}

// Array.find
// NOTE: Invoking this function using string criteria, as opposed to a function pointer, will result in a second compiler being spun up to do the eval,
//       thus allowing the calling function to continue execution IF the call statement was within a nested function...
if (!Array.prototype.find) {
	Array.prototype.find = function (callback) {
		// Support logical expressions
		if (typeof (callback) == "string") {
			var expr = callback;
			callback = function (item) {
				var retVal = null;
				try {
					retVal = eval(expr);
				}
                        catch (ex) {
					tracing.error(ex);
				}
				return retVal;
			};
		}
		if (!callback || !(callback instanceof Function))
			throw new Error('The Array.find method requires that a callback, accepting one parameter of object, be supplied as the sole argument');
		
		return this.filter(callback);
	};
}

// Array.sortBy [fieldname]
// Sorts the contents of an object array by the fieldName supplied (defaults to 'Id'), in the order specified (defaults to 'asc')
if (!Array.prototype.sortBy) {
	Array.prototype.sortBy = function (fieldName, sortOrder) {
		if (!fieldName)
			fieldName = 'Id';
		
		if (!sortOrder || (sortOrder.toLowerCase() !== 'asc' && sortOrder.toLowerCase() !== 'desc'))
			sortOrder = 'asc';
		
		var sortFunction = sortOrder.toLowerCase() === 'desc' ?
                    function (nameA, nameB) {
			if (nameA < nameB)
				return 1;
			else if (nameA > nameB)
				return -1;
			return 0;
		} :
                    function (nameA, nameB) {
			if (nameA < nameB)
				return -1;
			else if (nameA > nameB)
				return 1;
			return 0;
		};
		
		return this.sort(function (a, b) {
			var nameA = a[fieldName] ? a[fieldName].toString().toLowerCase() : '',
				nameB = b[fieldName] ? b[fieldName].toString().toLowerCase() : '';
			return sortFunction(nameA, nameB);
		});
	};
}