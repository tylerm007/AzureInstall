/**
 * @ngdoc service
 * @name Settings
 * @description
 * An object for interacting with user settings. In the future, Browser will have to differentiate
 * between external and local setting values, and this service will do more than wrap the Storage service.
 */
angular.module('Settings', []).service('Settings', [
	'$rootScope', '$http', 'Storage', '$q', 'Events',
	function ($rootScope, $http, Storage, $q, Events){
	var Module = null;
	Module = {
		docs: {},
		demoProjects: [
			'Espresso Logic Demo',
			'Northwind-',
			'Espresso Logic Sample'
		],
		//query the @docs endpoint, called when Events:AppReady
		getDocs: function getAppDocs() {
			var docsUrl = espresso.projectUrl + '@docs';
			return $http.get(docsUrl, {
				headers: Module.buildHeaders()
			}).success(function (data) {
				Module.docs = data;
				Events.broadcast('DocsReady', data);
			});
		},
		//this code is being written under duress ;), sets $rootScope.isDemoApp as true
		shamelesslyAssumeBinaryIsImageForEspressoDemoProjects: function () {
			_.each(Module.demoProjects, function (demoProjectName, index) {
				if (Module.docs.info && Module.docs.info.title.match(demoProjectName)) {
					$rootScope.isDemoApp = true;
				}
			});
		},
			
		/**
		 * @ngdoc method
		 * @name Settings.methods.getDimensions
		 * @return {mixed} dimensions object or false
		 */
		getDimensions	: function(){
			var dimensions = Storage.get( 'dimensions' );
			if( angular.isObject( dimensions ) ){
				return dimensions;
			}
			return false;
		},
		setDimensions	: function( dimensions ){
			Storage.put( 'dimensions' , dimensions );
		},

		stamps: {},
		getStamp: function (stamp) {
			if (Module.stamps[stamp]) {
				return Module.stamps[stamp];
			}
			return '';
		},
		setStamp: function (stamp, value) {
			return Module.stamps[stamp] = value;
		},

		///////////////////////////////////////////////////////////////////////
		//

		buildHeaders : function() {
			return {
				Authorization : 'Espresso ' + espresso.globals.apiKeyValue + ':1',
				'X-EspressoLogic-ResponseFormat': 'json'
			};
		},

		///////////////////////////////////////////////////////////////////////
		// Retrieve all table settings from the server

		getAllAppsReadOnly: function(callback, errorCallback) {
			var settingsUrl = espresso.projectUrl + '@apps';
			$http.get(settingsUrl, {
				headers: Module.buildHeaders()
			}).success(function (data) {
				if (data.length == 0) { // No app defined yet
					espresso.settings = null;
					if (callback) callback();
					return;
				}
				espresso.settings = data[0];  // Just grab the first one for now
				if (callback) callback();
			}).error(function(errData, status) {
				console.log('Error getting app : ' + status);
				if (errorCallback) errorCallback();
			});
		},

		// Retrieve all table settings using the @apps interface
		getAllTableSettingsReadOnly: function(callback, errorCallback) {
			if (!espresso.settings) {
				if (callback) callback();
				return;
			}
			$http.get(espresso.settings['@metadata'].href, {
				headers: Module.buildHeaders(),
			}).success(function(data){
				espresso.settings = data;
				if (data.skin) {
					$rootScope.setUserCSS(data.skin);
				}
				$rootScope.root.appSettingObjects = {};
				_.each(data.tableSettings, function (val, name) {
					$rootScope.root.appSettingObjects[name] = val;
				});
				if (callback) callback();
			}).error(function(errData, status) {
				console.log('Error getting app_table_settings : ' + status);
				if (errorCallback) errorCallback();
			});
		},

		// Retrieve the app_table_settings
		getAllTableSettings: function (callback, errorCallback) {
			var settingsUrl = $rootScope.root.authorInfo.url + 'app_table_settings';
			var headers = {
				Authorization: "Espresso " + $rootScope.root.authorInfo.apikey + ":1",
				'X-EspressoLogic-ResponseFormat': 'json'
			};
			$http.get(settingsUrl, {
				headers: headers,
				params: { filter: "app_ident=" + espresso.settings.ident }
			}).success(function(data){
				$rootScope.root.appSettingObjects = {};
				for (var i = 0; i < data.length; i++) {
					var setting = data[i];
					$rootScope.root.appSettingObjects[setting.table_name] = setting;
				}
				if (callback) callback();
			}).error(function(errData, status) {
				console.log('Error getting app_table_settings : ' + status);
				if (errorCallback) errorCallback();
			});
		},

		////////////////////////////////////////////////////////////////////////////////////
		// Retrieve the settings for all tables in an app
		getTableSettings: function(callback, errorCallback) {

			if (!espresso.settings) {
				if (callback) callback();
				return;
			}
			Module.getAllTableSettings(callback);
		},

		getTableOptions: function(tblName) {
			var tblSettings = null;
			var tblOptions = $rootScope.root.appSettingObjects[tblName];
			if (tblOptions) {
				try {
					tblSettings = JSON.parse(tblOptions.json);
				}
				catch(e) {
					console.log('Error parsing JSON for tblName: ' + e);
					throw e;
				}
				// Reconnect the pieces together -- see saveTableOptions for details
				_.each(tblSettings.gridColumns, function(col, colName) {
					if (colName.indexOf('/') > -1) {
						var parts = colName.split('/');
						tblSettings.gridColumns[colName] = tblSettings.parentSettings[parts[0]].columnFormats[parts[1]];
					}
					else
						tblSettings.gridColumns[colName] = tblSettings.columnFormats[colName];
				});
				_.each(tblSettings.scalarColumns, function(col, colName) {
					if (colName.indexOf('/') > -1) {
						var parts = colName.split('/');
						tblSettings.scalarColumns[colName] = tblSettings.parentSettings[parts[0]].columnFormats[parts[1]];
					}
					else
						tblSettings.scalarColumns[colName] = tblSettings.columnFormats[colName];
				});
				_.each(tblSettings.childrenSettings, function(child, childName) {
					_.each(child.gridColumns, function(gridCol, gridColName) {
						if (gridColName.indexOf('/') > -1) {
							var parts = gridColName.split('/');
							var parentTable = parts[0];
							var parentColumn = parts[1];
							child.gridColumns[gridColName] = child.parentSettings[parentTable].columnFormats[parentColumn];
						}
						else
							child.gridColumns[gridColName] = child.columnFormats[gridColName];
					});
				});
			}
			return tblSettings;
		},
		
		isReady	: function settingsIsReady() {
			var deferred = $q.defer();
			if (angular.isDefined($rootScope.allTables) && $rootScope.root.authorMode) {
				deferred.resolve();
			}
			else {
				deferred.reject();
			}
			return deferred.promise;
		},
		
		/////////////////////////////////////////////////////////////////////////////
		// Save the local settings for a table
		saveTableOptions: function(tblInfo) {
//			var fullName = '$tableOptions|' + $rootScope.currentServer + '|' + tblInfo.name;

			// Because e.g. gridColumns references objects in columnFormats, simply stringifying the object
			// is not a good idea because it ends up replicating a lot of column information.
			// We avoid this by replacing references to columns by an empty object. Obviously,
			// the reverse process must occur when the object is read back.

			var clone = espresso.util.cloneObject(tblInfo);
			_.each(clone.gridColumns, function(col, colName) {
				clone.gridColumns[colName] = {};
			});
			_.each(clone.scalarColumns, function(col, colName) {
				clone.scalarColumns[colName] = {};
			});
			delete clone.scalarColumnsOriginal;
			_.each(clone.childrenSettings, function(child, childName) {
				_.each(child.gridColumns, function(gridCol, gridColName) {
					child.gridColumns[gridColName] = {};
				});
			});

			// Angular inserts a $$hashkey attribute, so strip that out
			_.each(clone.columnFormats, function(c) {
				delete c.$$hashKey;
			});

			return Module.saveTableSettings(tblInfo);
		},

		saveTableSettings: _.throttle(function(tblInfo) {
			if (!$rootScope.root.authorInfo)
				return {success: function (callback) {
					callback();
				}};
			// Already have settings: it's an update
			var headers = {
				Authorization: "Espresso " + $rootScope.root.authorInfo.apikey + ":1",
				'X-EspressoLogic-ResponseFormat': 'json'
			};
			var settingsObj = $rootScope.root.appSettingObjects[tblInfo.name];
			//$rootScope.allTables[tblInfo.name] = tblInfo;
			if (settingsObj) {
				settingsObj.json = JSON.stringify(tblInfo);
				return $http.put(settingsObj['@metadata'].href, settingsObj, {headers: headers})
				.success(function(data) {
					console.log(data);
					if (angular.isDefined(data.txsummary[0]) && angular.isDefined(data.txsummary[0].json)) {
						var serverTimestamp = moment(data.txsummary[0].ts).format('X');
						var localTimestamp = moment($rootScope.root.appSettingObjects[tblInfo.name].ts).format('X');
						if (serverTimestamp > localTimestamp) {
							$rootScope.root.appSettingObjects[tblInfo.name] = data.txsummary[0];
							Events.broadcast('SettingsUpdate', data.txsummary[0]);
						}
					}
				})
				.error(function() {
					espresso.util.error("Error saving app settings");
				});
			}
			else { // New settings: it's an insert
				console.log(espresso.settings);
				var newSettings = {
					table_name: tblInfo.name,
					json: JSON.stringify(tblInfo),
					app_ident: espresso.settings.ident
				};
				var settingsUrl = $rootScope.root.authorInfo.url + 'app_table_settings';
				return $http.post(settingsUrl, newSettings, {headers: headers})
				.success(function(data) {
					$rootScope.root.appSettingObjects[tblInfo.name] = data.txsummary[0];
				})
				.error(function() {
					espresso.util.error("Error saving app settings");
				});
			}
		}, 500),

		getAuthSession: function() {
			var authSession = Storage.get('authSession');
			if (authSession) {
				if (authSession.server) {
					espresso.projectUrl = authSession.server;
				}
			}
			return authSession;
		},

		getKey	: function(){
			var session = Storage.get( 'authSession' );
			if( !angular.equals( session , null ) && !angular.equals( session.apikey , null ) ){
				return session.apikey;
			}
			return false;
		},

		getSetting: function(name) {
			return Storage.get(name);
		},

		setSetting: function(name, value) {
			Storage.put(name, value);
		}
	};
	
	Events.on('AppReady', function () {
		Module.getDocs();
	});
	Events.on('DocsReady', function () {
		Module.shamelesslyAssumeBinaryIsImageForEspressoDemoProjects();
	});
	return Module;
}]);
