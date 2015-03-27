espresso.util = {
		
	// Given an object, return the value of the first property we find
	getFirstProperty: function(obj) {
		for (var prop in obj) {
			if (obj.hasOwnProperty(prop)) {
				return obj[prop];
			}
		}
	},

	// Given an object, get the name of the first property we find
	getFirstPropertyName: function(obj) {
		for (var prop in obj) {
			if (obj.hasOwnProperty(prop)) {
				return prop;
			}
		}
	},
	
	// Given an array, find the object with obj's ident in the array and replace it with obj
	replaceInArray: function(arr, obj) {
		for (var i = 0; i < arr.length; i++) {
			if (arr[i].ident == obj.ident) {
				arr[i] = obj;
				break;
			}
		}
	},
	
	// Get the $rootScope for this application
	rootScope: function() {
		return angular.element('body').scope().$parent;
	},
	
	// Set a value in the given scope, forcing it in if necessary
	setInScope: function(scope, name, obj) {
		if (scope.$$phase) {
			scope[name] = obj;
		}
		else {
			scope.$apply(function(){
				scope[name] = obj;
			});
		}
	},
	
	// Modify the given scope in the given function
	setInScopeFun: function(scope, fun) {
		if (scope.$$phase) {
			fun();
		}
		else {
			scope.$apply(fun);
		}
	},
	
	/////////////////////////////////////////////////////////////////////////////////////////////
	// Set a value in the given scope, forcing it in if necessary
	setInRootScope: function(name, obj) {
		var scope = espresso.util.rootScope();
		if (scope.$$phase) {
			scope[name] = obj;
		}
		else {
			scope.$apply(function(){
				scope[name] = obj;
			});
		}
	},
	
	/////////////////////////////////////////////////////////////////////////////////////////////
	// Set a value in the root scope, using the given function
	setInRootScopeFun: function(f) {
		var scope = espresso.util.rootScope();
		if (scope.$$phase) {
				f();
		}
		else {
			scope.$apply(f);
		}
	},
	
	/////////////////////////////////////////////////////////////////////////////////////////////
	// Get an object from the root scope
	getFromRootScope : function(name) {
		var scope = espresso.util.rootScope();
		return scope[name];
	},

	/////////////////////////////////////////////////////////////////////////////////////////////
	// Make a deep copy of the given object
	cloneObject: function(obj) {
	    // Handle the 3 simple types, and null or undefined
	    if (null == obj || "object" != typeof obj) return obj;

	    // Handle Date
	    if (obj instanceof Date) {
	        var copy = new Date();
	        copy.setTime(obj.getTime());
	        return copy;
	    }

	    // Handle Array
	    if (obj instanceof Array) {
	        var copy = [];
	        for (var i = 0, len = obj.length; i < len; i++) {
	            copy[i] = espresso.util.cloneObject(obj[i]);
	        }
	        return copy;
	    }

	    // Handle Object
	    if (obj instanceof Object) {
	        var copy = {};
	        for (var attr in obj) {
	            if (obj.hasOwnProperty(attr))
	            	copy[attr] = espresso.util.cloneObject(obj[attr]);
	        }
	        return copy;
	    }

	    throw new Error("Unable to copy obj! Its type isn't supported.");
	},
	
	// Restore a row to its original values -- take the attribute values from __original and
	// copy them into the row.
	restoreRow: function(row) {
		if ( ! row.__original)
			return;
		_.each(row.__original, function(val, name) {
			if (_.find(['@metadata', '__internal', '__original'], function(s) { return name == s; }))
				return;
			row[name] = row.__original[name];
		});
	},
	
	/////////////////////////////////////////////////////////////////////////////////////////////
	// is the given object an array (in same window/frame)
	// first call figures out what the real implementation will be
	// and replaces this function with the better impl.
	isArray : function (obj) {
		// Use compiler's own isArray when available
		if (Array.isArray) {
			// replace ourselves with the real deal
			espresso.util.isArray = Array.isArray;
		}
		else {
			// Retain references to variables for performance optimization
			var objectToStringFn = Object.prototype.toString;
			var arrayToStringResult = objectToStringFn.call([]);

			// replace ourselves for next time
			espresso.util.isArray = function (subject) {
				return objectToStringFn.call(subject) === arrayToStringResult;
			};
		}

		// and return the answer for this call using the selected method
		return espresso.util.isArray(obj);
	},
	
	/////////////////////////////////////////////////////////////////////////////////////////////
	// Surprisingly, underscore's isNumber does not work properly for numbers
	// such as 486.6666666666667
	isNumber: function(n) {
		var pattern = /^[-+]?(\d+|\d+\.\d*|\d*\.\d+)$/;

		return pattern.test("" + n);
	},

	/////////////////////////////////////////////////////////////////////////////////////////////
	// Get the value of a parameter from the URL. Returns null if no such parameter.
	getURLParam: function(name) {
		var args = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		for (var i = 0; i < args.length; i++) {
			var paramParts = args[i].split('=');
			if (paramParts.length >= 1 && paramParts[0] == name) {
				return paramParts.length >= 2 ? decodeURIComponent(paramParts[1]) : null;
			}
		}
		return null;
	},

	// Determine whether the browser supports local storage or not
	supports_html5_storage: function () {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		}
		catch (e) {
			return false;
		}
	},
	
	// Compare two row objects, taking into account @metadata, __original, etc...
	rowsAreEqual: function(row1, row2) {
		if (row1 && !row2)
			return false;
		if (!row1 && row2)
			return false;
		if (!row1 && !row2)
			return true;
		for (var prop in row1) {
			if (prop == "__original" || prop == "__internal" || prop == "links" )  // Ignore internal properties
				continue;
			if (prop == "@metadata") {
				if (row1['@metadata'].checksum != row2['@metadata'].checksum ||
						row1['@metadata'].href != row2['@metadata'].href) {
					return false;
				}
				continue;
			}
			var val1 = row1[prop];
			var val2 = row2[prop];
			if (val1 == null && val2 == null)
				continue;
			if (val1 == null && val2 != null)
				return false;
			if (val1 != null && val2 == null)
				return false;
			if ((_.isObject(val1) || _.isObject(val2)) && (typeof val1 == typeof val2))
				continue;
			if (val1 != val2)
				return false;
		}
		return true;
	},
	
	/////////////////////////////////////////////////////////////////
	// Show an alert towards the top of the screen
	message: function(type, msg, msecs) {
		var alert = {type: type, msg: msg};
		var alerts = espresso.util.getFromRootScope('alerts');
		alerts.push(alert);
		setTimeout(function(){
			alerts = espresso.util.getFromRootScope('alerts'); // Re-fetch in case more alerts have been added
			var idx = alerts.indexOf(alert);
			if (idx >= 0) {
				$('#alert' + idx).fadeOut(500);
				setTimeout(function() {
					alerts.splice(idx, 1);
					espresso.util.setInRootScope('alerts', alerts);
				}, 500);
			}
		}, msecs);
	},
	
	info: function(msg) {
		espresso.util.message('Info', msg, 3000);
	},
	
	warning: function(msg) {
		espresso.util.message('Warning', msg, 6000);
	},
	
	error: function(msg) {
		espresso.util.message('Error', msg, 10000);
	},
	
	closeAlert: function(idx) {
		var alerts = espresso.util.rootScope().alerts;
		var idx = alerts.indexOf(alert);
		alerts.splice(idx, 1);
		espresso.util.setInRootScope('alerts', alerts);
	}
};

espresso.app.service('EspressoUtil', [ '$rootScope', function($rootScope) {

	return {
		// Given a name like "credit_limit", replace all underscores with a space, and all leading characters
		// with their uppercase, resulting in "Credit Limit".
		reformatColumnName: function(rawName) {
			var betterName = rawName.replace(/^_+/, ""); // Eliminate leading underscores
			betterName = betterName.replace(/_+$/g, ""); // Eliminate trailing underscores
			betterName = betterName.replace(/_+/g, " "); // Remaining underscores become a space
			betterName = betterName.replace(/([a-z])([A-Z])/g, "$1 $2"); // Camel case becomes space-separated
			betterName = betterName.replace(/\b[a-z]/g, function(match, p1) {
				return betterName.charAt(p1).toUpperCase();
			});
			return betterName;
		},
		
		// Given a role name like 'purchase_orderList', strip out the 'List' at the end (if present),
		// replace all underscores with a space, and all leading characters with their uppercase, 
		// resulting in "Purchase Order".
		reformatChildName: function(rawName) {
			if (rawName.match(/^.*List$/))
				rawName = rawName.substring(0, rawName.length - 4);
			var betterName = rawName.replace(/^_+/, ""); // Eliminate leading underscores
			betterName = betterName.replace(/_+$/g, ""); // Eliminate trailing underscores
			betterName = betterName.replace(/_+/g, " "); // Remaining underscores become a space
			betterName = betterName.replace(/\b[a-z]/g, function(match, p1) {
				return betterName.charAt(p1).toUpperCase();
			});
			return betterName;
		},
		
		// Given the name of a table, and a row from that table, return a string
		// that is unique for that row.
		getRowDescriptor: function(tableName, row) {
			var tableInfo = $rootScope.allTables[tableName];
			var desc = tableName + "$";
			
			// If there is no pk, we use all columns
			
			if ( ! tableInfo.primaryKeyColumns || tableInfo.primaryKeyColumns.length == 0) {
				_.each(tableInfo.columns, function(col) {
					desc += row[col.name] + "|";
				});
				return desc;
			}
			
			_.each(tableInfo.primaryKeyColumns, function(columName) {
				pkCol = tableInfo.columns[columnName];
				desc += row[pkCol.name] + "|";
			});
			return desc;
		}
	};
}]);
