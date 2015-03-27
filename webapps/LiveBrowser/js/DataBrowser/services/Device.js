/**
 * A branch of settings setters and getters specific to the device.
 * Generally:
 * 	- settings exist in local storage by:
 * 	- reference to the current server url
 *  - author mode is not required (unless otherwise documented)
 */
espresso.app.service('Device', [
	'$rootScope', 'Storage', 'Tables',
	function ($rootScope, Storage, Tables) {
		var Device = {
			_window : null,
			_default : null,
			isEmptyDefault : function (value) {
				Device._default = value;
			},
			resetColumnWidths : function (area, tableSettings) {
				var tableName = tableSettings.name;
				var contextName = 'mainGrid';
				if (area=='child') {
					contextName = Tables.formTable;
				}
				var key = $rootScope.currentServer + '||' + tableName + '||' + contextName;
				Storage.remove(key);
			},
			isFirefox : function () {
				return !!navigator.userAgent.match("Firefox");
			},
			isIE : function () {
				return ((navigator.userAgent.search("MSIE") != -1) || !!(navigator.userAgent.match("Trident")));
			},
			isWidthPreset : function (area, tableSettings) {
				if (!tableSettings) {return false;}
				var tableName = tableSettings.name;
				var contextName = 'mainGrid';
				if (area=='child') {
					contextName = Tables.formTable;
				}
				var key = $rootScope.currentServer + '||' + tableName + '||' + contextName;
				var preset = Storage.get(key);
				if (preset) {
					return preset;
				}
				return false;
			},
			window : function (window) {},
			deleteTableWidths: function (ngColumn) {
				var tableName = ngColumn.colDef.tableName;
				var contextName = ngColumn.colDef.parent || 'mainGrid'; //used for indexing in local storage
				var key = $rootScope.currentServer + '||' + tableName + '||' + contextName;
				Storage.remove(key);
			},
			/**
			 * @param ngColumn
			 * @param value 
			 */
			columnWidth : function (ngColumn, value) {
				//setup
				var tableName = ngColumn.colDef.tableName;
				var contextName = ngColumn.colDef.parent || 'mainGrid'; //used for indexing in local storage
				var columnName = ngColumn.field;
				var columnWidth = ngColumn.width;
				var key = $rootScope.currentServer + '||' + tableName + '||' + contextName;
				if (angular.isUndefined(tableName) || angular.isUndefined(columnName)) {
					//nothing to see here, move along
					return;
				}
				
				//getter by ngColumn
				if (angular.isUndefined(value)) {
					var contextTableSettings = Storage.get(key) || Device._default;
					return contextTableSettings;
				}
				//set
				else {
					var contextTableSettings = Storage.get(key) || {};
					contextTableSettings[columnName] = { width: columnWidth};
					Storage.put(key, contextTableSettings);
					return contextTableSettings;
				}
			},
			isMobile : function () {
				var isMobile = {
				    Android: function() {
				        return navigator.userAgent.match(/Android/i);
				    },
				    BlackBerry: function() {
				        return navigator.userAgent.match(/BlackBerry/i);
				    },
				    iOS: function() {
				        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
				    },
				    Opera: function() {
				        return navigator.userAgent.match(/Opera Mini/i);
				    },
				    Windows: function() {
				        return navigator.userAgent.match(/IEMobile/i);
				    },
				    any: function() {
				        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
				    }
				};
				return isMobile.any();
			}
		};
		return Device;
	}
]);