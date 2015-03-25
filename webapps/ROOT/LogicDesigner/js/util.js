kahuna = kahuna || {};

kahuna.util = {

	/**
	 * takes two objects and compares with values for each of the given property names.
	 * Each comparison is performed case-insensitively.  If fieldNames is not provided,
	 * the toString value is used for the comparison.
	 * Examples:
	 * var a = ['a', 'A', 'B', 'b'];
	 * a = a.sort(caseInsensitiveSort);
	 * var b = [ {name:'a'}, {name:'A'}, {name: 'B'}, {name: 'b'} ];
	 * b.sort(function (x, y) { return kahuna.util.caseInsensitiveSort(a, b, 'name'); });
	 */
	caseInsensitiveSort : function caseInsensitiveSort(objA, objB, fieldNames /* ... */) {
		// no field name(s)?  just compare toString values of the objects
		if (!fieldNames) {
			var a = objA.toString();
			var b = objB.toString();
			var au = a.toUpperCase();
			var bu = b.toUpperCase();
			if (au < bu) return -1;
			if (au > bu) return 1;
			if (a < b) return -1;
			if (a > b) return 1;
			return 0;
		}

		for (var i = 2; i < arguments.length; ++i) {
			var propName = arguments[i];
			var result = caseInsensitiveSort(objA[propName], objB[propName]);
			if (0 != result) {
				return result;
			}
		}

		return 0;
	},

	// Given an object, return the value of the first property we find or lowest element of an array
	getFirstProperty : function (obj) {
		var i = undefined;
		if (!obj) {
			return undefined;
		}
		if (Array.isArray(obj)) {
			for (i = 0; i < obj.length; ++i) {
				if (obj.hasOwnProperty(i)) {
					return obj[i];
				}
			}
		}
		else {
			for (i in obj) {
				if (obj.hasOwnProperty(i)) {
					return obj[i];
				}
			}
		}
		return undefined;
	},

	// Given an object, get the name of the first property we find or lowest index for an array
	getFirstPropertyName : function (obj) {
		var prop = undefined, i;
		if (!obj) {
			return undefined;
		}
		if (Array.isArray(obj)) {
			for (i = 0; i < obj.length; ++i) {
				if (obj.hasOwnProperty(i)) {
					return i;
				}
			}
		}
		else {
			for (prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					return prop;
				}
			}
		}
		return undefined;
	},

	// Given an object, return the value of the last property we find or highest element of an array
	getLastProperty : function (obj) {
		var i = undefined, last = undefined;
		if (!obj) {
			return undefined;
		}
		if (Array.isArray(obj)) {
			for (i = 0; i < obj.length; ++i) {
				if (obj.hasOwnProperty(i)) {
					last = obj[i];
				}
			}
		}
		else {
			for (i in obj) {
				if (obj.hasOwnProperty(i)) {
					last = obj[i];
				}
			}
		}
		return last;
	},

	// Given an object, get the name of the last property we find or highest index for an array
	getLastPropertyName : function (obj) {
		var prop = undefined, i, last = undefined;
		if (!obj) {
			return undefined;
		}
		if (Array.isArray(obj)) {
			for (i = 0; i < obj.length; ++i) {
				if (obj.hasOwnProperty(i)) {
					last = i;
				}
			}
		}
		else {
			for (prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					last = prop;
				}
			}
		}
		return last;
	},

	// Given an array, find the object with obj's ident in the array and replace it with obj
	replaceInArray : function (arr, obj) {
		for (var i = 0; i < arr.length; i++) {
			if (arr[i].ident == obj.ident) {
				arr[i] = obj;
				break;
			}
		}
	},

	// given an array or object, call the function once of each property for a
	applyFunctionToElements : function (obj, fun) {
		var o = undefined;
		if (fun) {
			for (o in obj) {
				if (obj.hasOwnProperty(o)) {
					fun(obj[o]);
				}
			}
		}
	},

	// given an array, constructs object with properties list[i][attributeName] as key and value as list[i]
	convertToMap : function (list, attributeName) {
		var i, e, map = {};
		if (!Array.isArray(list)) {
			throw "First argument must be an array";
		}
		if (!attributeName) {
			throw "attributeName not specified in call to convertToMap";
		}
		for (i = 0; i < list.length; ++i) {
			e = list[i];
			map[e[attributeName]] = e;
		}
		return map;
	},

	// create a new array and put property values of given object into it.
	convertToArray : function (obj) {
		var i = undefined, result = [];
		if (Array.isArray(obj)) {
			for (i = 0; i < obj.length; ++i) {
				if (obj.hasOwnProperty(i)) {
					result.push(obj[i]);
				}
			}
		}
		else {
			for (i in obj) {
				if (obj.hasOwnProperty(i)) {
					result.push(obj[i]);
				}
			}
		}
		return result;
	},

	// Make a deep copy of the given object
	cloneObject : function (obj) {
		// Handle the 3 simple types, and null or undefined
		if ('undefined' === typeof obj || null === obj || "object" != typeof obj) {
			return obj;
		}

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
				copy[i] = kahuna.util.cloneObject(obj[i]);
			}
			return copy;
		}

		// Handle Object
		if (obj instanceof Object) {
			var copy = {};
			for (var attr in obj) {
				if (obj.hasOwnProperty(attr))
					copy[attr] = kahuna.util.cloneObject(obj[attr]);
			}
			return copy;
		}

		throw new Error("Unable to copy obj! Its type isn't supported.");
	},

	// Return false if the given object is an object or an array, true otherwise
	objectIsValue : function (obj) {
		if (null == obj)
			return true;
		if ("object" == typeof obj || obj instanceof Object)
			return false;
		if (obj instanceof Array)
			return false;
		return true;
	},

	findInTxSummary: function (txsummary, entityName, verb) {
		var result = [];
		for (var i = 0; i < txsummary.length; i++) {
			var modObj = txsummary[i];
			var metadata = modObj['@metadata'];
			if (metadata.resource === entityName) {
				if (verb && metadata.verb === verb) {
					result.push(modObj);
				}
				else if ( ! verb) {
					result.push(modObj);
				}
			}
		}
		return result;
	},

	// ///////////////////////////////////////////////////////////////
	// Show an alert towards the top of the screen
	message : function (type, msg, msecs) {
		var alert = {
			type : type,
			msg : msg
		};
		var alerts = kahuna.getFromScope('alerts');
		kahuna.applyFunctionInScope(kahuna.topScope(), function () {
			alerts.push(alert);
		});
		setTimeout(function () {
			alerts = kahuna.getFromScope('alerts'); // Re-fetch in case more alerts have been added
			var idx = alerts.indexOf(alert);
			if (idx >= 0) {
				$('#alert' + idx).fadeOut(500);
				setTimeout(function () {
					kahuna.applyFunctionInScope(kahuna.topScope(), function () {
						alerts.splice(idx, 1);
					});
					kahuna.putInScope('alerts', alerts);
				}, 500);
			}
		}, msecs);
	},

	info : function (msg) {
		kahuna.util.message('Info', msg, 3000);
	},

	warning : function (msg) {
		kahuna.util.message('Warning', msg, 6000);
	},

	error: function (msg) {
		kahuna.util.message('Error', msg, 10000);
	},

	closeAlert : function (idx) {
		var alerts = kahuna.getFromScope('alerts');
		var idx = alerts.indexOf(alert);
		alerts.splice(idx, 1);
		kahuna.putInScope('alerts', alerts);
	},

	// ///////////////////////////////////////////////////
	// JSON formatting

	RealTypeOf : function (v) {
		if (typeof (v) == "object") {
			if (v === null)
				return "null";
			if (v.constructor == (new Array).constructor)
				return "array";
			if (v.constructor == (new Date).constructor)
				return "date";
			if (v.constructor == (new RegExp).constructor)
				return "regex";
			return "object";
		}
		return typeof (v);
	},

	formatToJson : function (oData, sIndent) {
		if (arguments.length < 2)
			sIndent = "";
		var sIndentStyle = "  ";
		var sDataType = kahuna.util.RealTypeOf(oData);

		// open object
		var sHTML;
		if (sDataType == "array") {
			if (oData.length == 0) {
				return "[]";
			}
			sHTML = "[";
		}
		else {
			var iCount = 0;
			for (key in oData) {
				iCount++;
			}
			if (iCount == 0) { // object is empty
				return "{}";
			}
			sHTML = "{";
		}

		// loop through items
		var iCount = 0;
		if (sDataType == "array") {
			for (var i = 0; i < oData.length; i++) {
				if (iCount > 0)
					sHTML += ",";
				var vValue = oData[i];
				sHTML += ("\n" + sIndent + sIndentStyle);
				switch (kahuna.util.RealTypeOf(vValue)) {
				case "array":
				case "object":
					sHTML += kahuna.util.formatToJson(vValue, (sIndent + sIndentStyle));
					break;
				case "boolean":
				case "number":
					sHTML += vValue.toString();
					break;
				case "null":
					sHTML += "null";
					break;
				case "string":
					sHTML += ("\"" + vValue + "\"");
					break;
				default:
					sHTML += ("TYPEOF: " + typeof (vValue));
				}
				iCount++;
			}
		}
		else {
			for (var sKey in oData) {
				if ('$$hashKey' == sKey) // Ignore AngularJS properties
					continue;
				if (iCount > 0)
					sHTML += ",";
				var vValue = oData[sKey];
				sHTML += ("\n" + sIndent + sIndentStyle + "\"" + sKey + "\"" + ": ");
				switch (kahuna.util.RealTypeOf(vValue)) {
				case "array":
				case "object":
					sHTML += kahuna.util.formatToJson(vValue, (sIndent + sIndentStyle));
					break;
				case "boolean":
				case "number":
					sHTML += vValue.toString();
					break;
				case "null":
					sHTML += "null";
					break;
				case "string":
					sHTML += ("\"" + vValue + "\"");
					break;
				default:
					sHTML += ("TYPEOF: " + typeof (vValue));
				}
				iCount++;
			}
		}

		// close object
		if (sDataType == "array") {
			sHTML += ("\n" + sIndent + "]");
		}
		else {
			sHTML += ("\n" + sIndent + "}");
		}

		// return
		return sHTML;
	},

	// Used in jsonToTable
	currentVarId : 0,

	// Take an object and show it as a table, possibly recursively
	jsonToTable : function (name, obj, parentId) {
		var classStr = "";
		var valStr = "";
		var thisId = kahuna.util.currentVarId++;
		var subRows = "";
		if (!obj) {
			valStr = "null";
			classStr = "jsnull";
		}
		else if (typeof obj == 'string' || obj instanceof String) {
			valStr = "<input readonly type='text' class='VarInput' value='" + obj.replace(/'/g, "&apos;") + "'/>";
			// valStr = kahuna.util.escapeHtml(obj);
			classStr = "jsstring";
		}
		else if (typeof obj == 'number' || obj instanceof Number) {
			valStr = obj;
			classStr = "jsnumber";
		}
		else if (typeof obj == 'boolean' || obj instanceof Boolean) {
			valStr = obj;
			classStr = "jsnumber";
		}
		else if (obj.constructor === Object) {
			valStr = "&lt;object&gt;";
			if (obj["_table"])
				valStr = "&lt;" + obj["_table"] + "&gt;";
			classStr = "jsobject";
			for (var propName in obj) {
				if (!obj.hasOwnProperty(propName) || propName == "_table")
					continue;
				subRows += kahuna.util.jsonToTable(propName, obj[propName], thisId);
			}
		}
		else if (obj.constructor === Array) {
			valStr = "array[" + obj.length + "]";
			classStr = "jsobject";
			for (var i = 0; i < obj.length; i++) {
				subRows += kahuna.util.jsonToTable(i, obj[i], thisId);
			}
		}
		var parentRef = "";
		if (parentId)
			parentRef = " data-tt-parent-id='" + parentId + "' ";
		var allRows = "<tr data-tt-id='" + thisId + "' " + parentRef + "><td><span class='" + classStr + "'></span>" + name + "</td><td>" + valStr
				+ "</td></tr>" + subRows;
		return allRows;
	},

	escapeHtml : function (s) {
		var pre = document.createElement('pre');
		var text = document.createTextNode(s);
		pre.appendChild(text);
		return pre.innerHTML;
	},

	// ///////////////////////////////////////////////////////////////////

	base64_encode : function (data) {
		var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = "", tmp_arr = [];

		if (!data) {
			return data;
		}

		do { // pack three octets into four hexets
			o1 = data[i++];
			o2 = data[i++];
			o3 = data[i++];

			bits = o1 << 16 | o2 << 8 | o3;

			h1 = bits >> 18 & 0x3f;
			h2 = bits >> 12 & 0x3f;
			h3 = bits >> 6 & 0x3f;
			h4 = bits & 0x3f;

			// use hexets to index into b64, and append result to encoded string
			tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
		} while (i < data.length);

		enc = tmp_arr.join('');

		var r = data.length % 3;

		return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
	},

	base64_decode : function (data) {
		var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, bytes = [];

		if (!data) {
			return data;
		}

		data += '';

		do { // unpack four hexets into three octets using index points in b64
			h1 = b64.indexOf(data.charAt(i++));
			h2 = b64.indexOf(data.charAt(i++));
			h3 = b64.indexOf(data.charAt(i++));
			h4 = b64.indexOf(data.charAt(i++));

			bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

			o1 = bits >> 16 & 0xff;
			o2 = bits >> 8 & 0xff;
			o3 = bits & 0xff;

			if (h3 == 64) {
				bytes[ac++] = o1;
			}
			else if (h4 == 64) {
				bytes[ac++] = o1;
				bytes[ac++] = o2;
			}
			else {
				bytes[ac++] = o1;
				bytes[ac++] = o2;
				bytes[ac++] = o3;
			}
		} while (i < data.length);

		return bytes;
	},

	// Given a number of bytes, return e.g. "45.6 megabytes"
	formatMemory: function (bytes) {
		if (bytes < 1024)
			return "" + bytes + " bytes";
		else if (bytes < (1024 * 1024))
			return "" + Number(bytes / 1024).toFixed(1) + " kilobytes";
		else if (bytes < (1024 * 1024 * 1024))
			return "" + Number(bytes / (1024 * 1024)).toFixed(1) + " megabytes";
		else
			return "" + Number(bytes / (1024 * 1024 * 1024)).toFixed(1) + " gigabytes";
	},

	// Given a number of seconds, return e.g. "5 days, 17 hours, 34 minutes, 8 seconds"
	formatElapsedSeconds: function (secs) {
		secs = Math.floor(secs/1000);
		var seconds = secs % 60;
		var minutes = Math.floor(((secs - seconds) % (60 * 60)) / 60);
		var hours = Math.floor(((secs - (seconds + (minutes*60))) % (60 * 60 * 24)) / (60 * 60));
		var days = Math.floor(((secs - (seconds + (minutes*60) + (hours * 60 * 60)))) / (60 * 60 * 24));
//		var days = Math.floor(secs / (24 * 60 * 60));
//		var hours = Math.floor((secs - (days * 24 * 60 * 60)) / (60 * 60));
//		var minutes = Math.floor(secs - ((days * 24 * 60 * 60) + (hours * 60 * 60)) / 60);
//		var seconds = secs % 60;
		if (days)
			return "" + days + " days, " + hours + " hours, " + minutes + " minutes, " + seconds + " seconds";
		else if (hours)
			return "" + hours + " hours, " + minutes + " minutes, " + seconds + " seconds";
		else if (minutes)
			return "" + minutes + " minutes, " + seconds + " seconds";
		else
			return "" + seconds + " seconds";
	}
};


/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

var dateFormat = function () {
	var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc) {
		var dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
	return dateFormat(this, mask, utc);
};
