/////////////////////////////////////////////////////////////////////////
espresso.app.controller(
	'espresso.BrowserCtrl' ,
	[ '$rootScope', '$scope', '$http', '$resource', '$routeParams', '$location', '$modal', '$sce', '$compile', 'Device', 'ResourceHelper',
	  		'EspressoData', 'Storage', 'Settings', 'Auth', 'Tables', 'Notifications' , 'DirectLink', 'Events', '$q', 'CellTemplates',
	  		'ResourceHelper',
	function($rootScope, $scope, $http, $resource, $routeParams, $location, $modal, $sce, $compile, Device, ResourceHelper, 
			EspressoData, Storage, Settings, Auth , Tables , Notifications , DirectLink, Events, $q, CellTemplates,
			ResourceHelper) {
		//isDemoApp will hopefully be used under limited circumstances
			//right now it indicates to the filter it should force binaries to be images
		$rootScope.isDemoApp = false;
		
		//used when an api key expires.
		$scope._Tables = Tables;
		//DirectLink checks the url, the earlier this happens the better
		var search = $location.search();
		if (angular.isDefined(search.server)) {
			espresso.projectUrl = search.server;
			Auth.login(search.username, search.server, search.apiKey);
		}
		$rootScope.$on( '$locationChangeStart' , function(){
			var search = $location.search();
			if (angular.isDefined(search.server)) {
				espresso.projectUrl = search.server;
				Auth.login(search.username, search.server, search.apiKey);
			}
			DirectLink.checkLinkingUrl();
		});
		
		$rootScope.setPictureUpdatedStatus = _.throttle(function (status) {
			$rootScope.$evalAsync(function () {
				$rootScope.pictureUpdated = status;
			});
		}, 3000);
		
		//////////////////////////////////////////////////////////////////////////////////
		$rootScope.editGridOptions = function() {
			$modal.open({
				backdrop	: true,
				keyboard	: true,
				templateUrl	: 'templates/modals/gridOptions.html',
				controller	: 'espresso.GridOptionsCtrl'
			});

		};
		
		//check to see if it's necessary to force login
		$rootScope.$on('$locationChangeStart', function () {
			var search = $location.search();
			var auth = Storage.get('authSession');
			if (angular.isDefined(search.serverName) && auth && (search.serverName != auth.server)) {
				//we must be coming from Logic Designer
				if (angular.isDefined(auth)) {
					//Live Browser was already logged in
					$scope.logout();
					setTimeout(function () {
						if (angular.element('.loginModal').length === 0) {
							$scope.showLogin();
							//window.location.reload(true);
						}
					}, 750);
				}
			}
		});

		//WatchCurrentServer
		$rootScope.$watch('currentServer', function (current) {
			if (angular.isUndefined(current)) {return;}
			Events.broadcast('WatchCurrentServer', current);
		});
		
		//WatchEditMode
		$rootScope.$watch('root.editMode', function (current) {
			if (angular.isUndefined(current)) {return;}
			var $mainRowContainer = angular.element('#leftGridContainer');
			if ($mainRowContainer.length) {
				var mainRow = angular.copy($mainRowContainer.scope().selectedRows);
			
			Events.broadcast('WatchEditMode', {
				'mainRow' : mainRow
			});
			}
		});
		
		//WatchAuthorMode
		$rootScope.$watch('root.authorMode', function (current) {
			if (angular.isUndefined(current)) {return;}
			Notifications.suspend('promptUnsaved');
			Events.broadcast('WatchAuthorMode', current);
		});
		
		$rootScope.slugify = function slugify(str) {
			return S(str).slugify().s;
		};
		
		////////////////////////
		$rootScope.getApp = function(scope, $modalInstance) {
			function closeModal() {
				Notifications.suspend('promptUnsaved');
				try{$modalInstance.close();} catch(e) {}
			};
			if (!scope.adminLogin) {
				scope.adminLogin = {};
			}
			scope.adminLogin.statusMessage = "Retrieving app data...";
			var headers = {
    			Authorization: "Espresso " + $rootScope.root.authorInfo.apikey + ":1",
    			'X-EspressoLogic-ResponseFormat': 'json'
    		};
			if (!espresso.settings) {
				console.log('No app yet!');
				scope.adminLogin.statusMessage = "Creating default app...";
				var matches = espresso.projectUrl.match(/.+\/rest\/([-\w]+)\/([-_\.\w]+)\/.*/);
				var accountName = matches[1];
				var projectName = matches[2];
			    var deferred = $q.defer();
			    
				$http.get($rootScope.root.authorInfo.url + 'accounts', {
					headers: headers,
					params: {
						filter: "url_name='" + accountName + "'"
					}
				}).success(function(acctData) {
					if (acctData.length == 0)
						throw "Unable to find account " + accountName;
					$http.get($rootScope.root.authorInfo.url + 'projects', {
						headers: headers,
						params: {
							filter: "url_name='" + projectName + "' and account_ident=" + acctData[0].ident
						}
					}).success(function(projData) {
						if (projData.length == 0)
							throw "Unable to find project " + projectName;
						var newApp = {
								name: 'Default app',
								project_ident: projData[0].ident,
								default_language: "eng"
							};
						$http.post($rootScope.root.authorInfo.url + "applications", newApp, {
							headers: headers
						}).success(function(newAppData) {
							espresso.settings = newAppData.txsummary[0];
							//if we are LB in LD, then the modal isn't open
							closeModal();
							deferred.resolve();
						}).error(function(errData, status) {
							console.log('Error creating default app : ' + status);
							//if we are LB in LD, then the modal isn't open
							closeModal();
							deferred.reject();
						});
					});
				});
				return deferred.promise;
			}
			else {
				return $http.get($rootScope.root.authorInfo.url + "applications/" + espresso.settings.ident, {
					headers: headers,
				}).success(function(data){
					espresso.settings = data[0];
					Settings.getTableSettings(function() {
						//if we are LB in LD, then the modal isn't open
						closeModal();
					});
				}).error(function(errData, status) {
					console.log('Error : ' + status);
					closeModal();
					espresso.util.error("Error while retrieving app");
				});
			}
		};
		
		$rootScope.$on('DateSelected', function (event) {
			//blurring will cause a digest while a digest is in progress, so it's been delayed
			setTimeout(function () {
				var $focus = $('.quickdate-button').close('.selected');
				$focus.click();
			}, 0)
		});
		
		/**
		 * @ngdoc object
		 * @name $rootScope.root
		 * @description A universally available utility object.
		 */
		$rootScope.root = {};
		
		$rootScope.root.layouts = ['tables', 'resources']; //sections in HTML
		$rootScope.root.layoutMode = $rootScope.root.layouts[0];
		$rootScope.root.toggleLayoutModeTo = function toggleLayoutModeTo() {
			var nextIndex = $rootScope.root.layouts.indexOf($rootScope.root.layoutMode) + 1;
			if (!$rootScope.root.layouts[nextIndex]) {
				nextIndex = 0;
			}
			Events.broadcast('InitLayoutToggle', $rootScope.root.layouts[nextIndex]);

			$rootScope.root.layoutMode = $rootScope.root.layouts[nextIndex];
			
			setTimeout(function () {
				angular.element('.ui-layout-resizer').remove();
				espresso.initLayoutUI();
				Events.broadcast('RefreshMainGrid');
			}, 200);
		};
		$rootScope.refreshResourceEndpoints = function refreshResourceEndpoints() {
			ResourceHelper.getAllResources().success(function () {
				var keys = _.keys($rootScope.root.allResources);
				if (keys.length) {
					$rootScope.root.endpoint = $rootScope.root.allResources[keys[0]].name;
				}
			});
		};
		$rootScope.$watch('root.endpoint', function (current) {
			if (current) {
				Events.broadcast('ResourceEndpointUpdated', current);
			}
		});
		$rootScope.root.saveAllResources = function saveAllResources() {
			$rootScope.addRowsToSave('Resources', [ResourceHelper.getFormResource()]);
			Events.broadcast('FlushToServer');
		};
		$rootScope.root.closePanel = function closePanel(window) {
			setTimeout(function () {
				Events.broadcast('CloseWindow', window);
			}, 500);
		};
		
		$rootScope.root.intro = [
			//section 1
			'<h4>Automatic Browse & Update</h4>' +  
			'<br/>By just connecting, you can use this interface for testing or back office data maintenance' +
			'<ul>' +
				'<li><strong>Select your:</strong>' +
					'<ul>' +
    					'<li>Table or Resource</li>' +
						'<li>And Rows (multiple search fields)</li>' +
					'</ul>' +
				'</li>' +
				'<li><strong>Fully updatable grids</strong></li>' +
				'<li><strong>Save</strong>' +
					'<ul>' +
						'<li><em>Rules enforced</em></li>' +
					'</ul>' +
				'</li>' +
			'</ul>',

			//section 2
			'<h4>Multi-Table Forms</h4>' +
			'<br/>Master/Detail displays are built automatically, with' +
			'<ul>' +
				'<li><strong>Automatic Joins</strong> - displays "Company Name" rather than "Id"</li>' +
				'<li><strong>Lookups</strong> - used to reselect "Company" that supplies "Product"</li>' +
				'<li><strong>Navigate</strong> - zoom for more detailed data on any row</li>' +
				'<li><strong>Updatable grids</strong> for child data</li>' +
			'</ul>',
			
			//section 3
			'<h4>Extend Your App In Author Mode</h4>' +
			'<br/>Without complicated html, you can control application presentation:' +
			'<ul>' +
				'<li><strong>Field Attributes</strong> - conditional hide/show, control, and value formatting</li>' +
				'<li><strong>Column Ordering</strong> - drag and drop column grouping and sorting</li>' +
				'<li><strong>Style Sheets</strong> - colors, fonts, logos, etc</li>' +
			'</ul>',
			
			//section 4
			'<h4 class="final-tour-page">Just a quick recap - you have created a</h4>' +
    		'<ol>' +
    			'<li><strong>RESTful API</strong> with custom-defined end points, with...</li>' +
    			'<li><strong>Security</strong>: fine-grained, row/column level, and</li>' +
    			'<li><strong>Logic</strong>: JavaScript and reactive rules</li>' +
    		'</ol>' +
    		'Your API is suitable for:' +
    		'<ol>' +
    			'<li>Mobile and Web Apps</li>' +
    			'<li>Data Integration</li>' +
    			'</ol> '+
    			'And you have the <strong>Live Browser</strong>,  a completely automated data maintenance app - ' +
    				'perfect for testing your API, security and logic.<br/><br/>' +
    		'And that wraps up our tour - to see rules in action, try selecting a customer, and clearing the order\'s shipped date -- watch what happens to the customer balance when you save!<br/><br/>Click <strong>Done</strong> to finish.'
		];
		
		///////////////////////////////////////////////////////////////////////////////
		// If this is true, then editing is allowed
		$rootScope.root.editMode = true;
		
		// When switching edit mode, it can take several seconds to redraw
		// everything. The following are (so far unsuccessful) attempts
		// at determining how to tell when the "refresh" is done, so we
		// could put up a "please wait" dialog.
		// In other words, this is a work in progress.
		$rootScope.root.editModeChanged = function() {
			$rootScope.$evalAsync(function() {
			});
		};

		$rootScope.root.mainGridEvaluate = function(scope, colDef) {
			scope.styles = '';
			angular.forEach(colDef.eval, function (evaluation, index) {
				if (evaluation.selector != 'cell') { return; }
				var rowScope = scope.$new(true);
				
				var row = scope.$parent.row.entity;
				var hasRole = function (role) {
					if (row['__internal'].parentRows[role]) {
						return true;
					}
					return false;
				};
				var action = row['@metadata'].action;
				
				if (eval(evaluation.expression)) {
					scope.styles += evaluation.onTrue;
				}
				else {
					scope.styles += evaluation.onFalse;
				}
			});
		};
		$rootScope.root.childGridEvaluate = function(scope, colDef) {
			scope.styles = '';
			angular.forEach(colDef.eval, function (evaluation, index) {
				if (evaluation.selector != 'cell') { return; }
				var rowScope = scope.$new(true);
				var row = scope.$parent.$parent.row.entity;
				var hasRole = function (role) {
					if (row['__internal'].parentRows[role]) {
						return true;
					}
					return false;
				};
				var action = row['@metadata'].action;
				if (eval(evaluation.expression)) {
					scope.styles += evaluation.onTrue;
				}
				else {
					scope.styles += evaluation.onFalse;
				}
			});
		};
		
		$rootScope.root.displayMode = 'gui';

		$rootScope.root.authorMode = false;
		
		$rootScope.root.requestQueue = [];
		
		/////////////////////////////////////////////////////////////////////
		// Set up critical variables
		var authSession = Settings.getAuthSession();
		if (authSession) {
			espresso.services.espressoHeaders = {
				Authorization: "Espresso " + authSession.apikey + ":1",
			};
			espresso.globals.apiKeyValue = authSession.apikey;
		}
		
		$rootScope.root.appSettingObjects = {};
		
		///////////////////////////////////////////////////////////////////////////////
		/**
		 * @ngdoc method
		 * @name $rootScope.root.methods.editColumn
		 * @description An event handler for editing column details. Currently defined within BrowserCtrl.
		 */
		$rootScope.root.editColumn = function(tableName, colInfo, colSettings, callback, broadcaster, roleName){
			$modal.open({
				backdrop	: true,
				keyboard	: true,
				templateUrl	: 'templates/modals/column.html',
				controller	: 'espresso.ColumnCtrl',
				resolve		: {
					tableName : function () {return tableName;},
					colInfo : function () {return colInfo;},
					colSettings : function () {return colSettings;},
					broadcaster : function () {return broadcaster;},
					callback : function () {return callback;},
					roleName : function () {return roleName;}
				}
			}); 
		};

		$rootScope.root.log = function(log){
			console.log(log);
		};
		$rootScope.root.alert = function(message){
			console.log(message);
			alert(message);
		};

		$rootScope.root.forceCellDblClick = function(event, col) {
			var $element = angular.element(event.target);
			if (Device.isMobile() && $element.closest('.selected').length>0) {
				$element.trigger('dblclick');
			}
		};
		
		///////////////////////////////////////////////////////////////////////////////
		// This gets called when the user clicks on a cogwheel for a column
		$rootScope.editColumnSelection = function(area, childName) {
			$modal.open({
				backdrop	: true,
				keyboard	: true,
				templateUrl	: 'templates/modals/gridOptions.html',
				controller	: 'espresso.GridOptionsCtrl',
				resolve		: { 
					area: function() { return area; },
					childName: function() { return childName; },
					callback : function(){ return function() {
						console.log('Grid options dialog has been closed');
					};}
				}
			});
		};
		
		////////////////////////////////////////////////////////////////////////////////
		
		$rootScope.showAboutDialog = function() {
			$modal.open({
				backdrop	: true,
				keyboard	: true,
				templateUrl	: 'templates/modals/about.html',
//				controller	: 'espresso.ParentSelectCtrl',
				resolve		: { 
				}
			});

		};
		
		/////////////////////////////////////////////////////////
		// IntroJS stuff
		
		$rootScope.isAppReady = false;
		$rootScope.$watch('currentServer', function(current) {
			if (!$rootScope.currentServer) {
				$rootScope.isAppReady = false;
				return;
			}
			if (current) {
				$rootScope.isAppReady = true;
				Events.broadcast('AppReady');
			}
			var introSeen = Settings.getSetting('introSeen');
			if (introSeen)
				return;
			setTimeout(function(){
				$rootScope.showIntro();
				Settings.setSetting('introSeen', true);
			}, 2000);
		});
		
		$rootScope.showIntro = function() {
			var search = $location.search();
			if (search.intro && search.intro == 'disabled') {
				return;
			}
			var intro = introJs();
			intro.onafterchange(function(el) {
				var $element = $(el);
				var text = $element.data('intro');
				
				console.log(text.match('final-tour-page'));
				if (text.match('final-tour-page')) {
    					$('.introjs-nextbutton').hide();
    					$('.introjs-prevbutton').css('border-right', '1px solid #d4d4d4');
				}
				else {
					$('.introjs-nextbutton').show();
					//$('.introjs-prevbutton').css('border-right', '1px solid #d4d4d4');
				}
			});
			intro.setOption("exitOnOverlayClick", false);
			intro.setOption("showStepNumbers", true);
			intro.start();
		};
		
		/////////////////////////////////////////////////////////
		// Login stuff

		$scope.loginValues = {
			serverName: '',
			userName: '',
			password: 'Password1', // replaced by build scripts to empty (or DEPLOY_PASSWORD value if set
			showPassword: false
		};
		
		$scope.loginDialogOpts = {
			backdrop: 'static',
			keyboard: false, // Can't close with escape
			//show: true,
			templateUrl:  'templates/login-dialog.html',
			controller: 'espresso.LoginDialogController',
			windowClass: 'loginModal',
			resolve: {loginValues: function() { return $scope.loginValues; }}
		};

		$scope.showLogin = function(){
			var urlServer = espresso.util.getURLParam('serverName');
			if (urlServer) {
				if (/#\/$/.test(urlServer))
					urlServer = urlServer.substring(0, urlServer.length - 2);
			}
			var urlUserName = espresso.util.getURLParam('userName');
			if (urlUserName) {
				if (/#\/$/.test(urlUserName))
					urlUserName = urlUserName.substring(0, urlUserName.length - 2);
			}
			var urlApiKey = espresso.util.getURLParam('apiKey');
			if (urlApiKey) {
				if (/#\/$/.test(urlApiKey))
					urlApiKey = urlApiKey.substring(0, urlApiKey.length - 2);
			}
			if (urlServer && urlUserName && urlApiKey) {
				espresso.setServerUrl(urlServer);
				espresso.setApiKey(urlApiKey);
				$rootScope.currentUserName = urlUserName;
				$rootScope.currentServer = urlServer;
				
				if (espresso.util.supports_html5_storage()) {
					try {
						console.log($scope.loginValues);
						localStorage.browser_lastServer = $scope.loginValues.serverName;
						localStorage.browser_lastUsername = $scope.loginValues.userName;
						localStorage.browser_showPassword = $scope.loginValues.showPassword;
					}
					catch(e) {
						console.log("Unable to save login info into local storage: " + e);
					}
				}
				return;
			} 
			return $modal.open($scope.loginDialogOpts);
		};
		
		$scope.hideBeta = function(evt) {
			if (evt.shiftKey)
				$('#betaButton').hide();
		};
		
		var mustShowLogin = false;
		var urlServerName = espresso.util.getURLParam('serverName');
		var storedServerName = null;
		if (localStorage.authSession) {
			storedServerName = Storage.get('authSession').server;
		}
		if (null != urlServerName && urlServerName != storedServerName) {
			mustShowLogin = true;
		}

		var urlApiKey = espresso.util.getURLParam('apiKey');
		if (urlApiKey || mustShowLogin) {
			$scope.showLogin();
		}
		else {
			Settings.getAuthSession();
//			if ( ! espresso.globals.apiKeyValue) {
				Auth.authenticate(function(){
					$scope.showLogin();
				});
//			}
		}
		
		////////////////////////////////////////////////////////////////////////////
		$scope.useUserCSS = false;
		
		$scope.toggleUserCSS = function() {
			var head = angular.element(document.querySelector('head'));
			if ($scope.useUserCSS) {
				$("link[href='css/client.css']").remove();
			    $scope.useUserCSS = false;
			}
			else {
			    head.append($compile("<link data-ng-href='css/client.css' rel='stylesheet' />")($scope)); // Found here : http://stackoverflow.com/a/11913182/1662766
			    $scope.useUserCSS = true;
			}
		};
		
		$rootScope.setUserCSS = function(url) {
			var head = angular.element(document.querySelector('head'));
			if ( ! url) {
				$("link[id='appSkin']").remove();
			}
			else {
				$("link[id='appSkin']").remove();
				var cssUrl = url + "?auth=" + espresso.globals.apiKeyValue + ":1";
			    head.append($compile("<link id='appSkin' type='text/css' href='" + cssUrl + "' data-ng-href='" + cssUrl + "' rel='stylesheet' />")($scope));
			}
		};
		
		////////////////////////////////////////////////////////////////////////////
		$scope.logout = function() {
			localStorage.authSession = null;
			var url = window.location.href;
			window.location.href = url;
		};
		$rootScope.userInitiatedLogout = function userInitiatedLogout() {
			localStorage.authSession = null;
			$rootScope.root.authorInfo = null;
			var base = $location.absUrl().split('/#')[0];
			window.location.href = base;
		}
		
		CellTemplates.addTemplate(ResourceHelper.utilityColumnName,
				"<div class='columns-dropdown resource-utility-column'>{{this.$parent.$index+1}}</div>"
		);
		CellTemplates.addTemplate('text',
			"<div ng-init='root.mainGridEvaluate(this, col.colDef);' ng-click='mobileForceClick($event);'"+
			"ng-dblclick='alertIfUneditable(null, col.colDef.field);' style='{{this.styles}}' class=\"ngCellText\" ng-class=\"col.colIndex()\">" +
			"<span style='{{this.styles}}' ng-click=\"isEditable(null, col);\" ng-cell-text hm-touch=\"root.forceCellDblClick($event,col);\">" +
			"{{row.entity[col.colDef.slug]}}</span></div>"
		);
		CellTemplates.addTemplate('header',
			"<div ng-mouseover='ieHeaderGripFix();' class=\"ngHeaderSortColumn\" " +
			"ng-style=\"{'cursor': col.cursor}\" ng-class=\"{ 'ngSorted': !noSortVisible }\">" +
				"<div ng-class=\"'colt' + col.index\" class=\"ngHeaderText\">" +
					"<span ng-click=\"\">{{col.displayName}}</span>" +
					"<i class='fa fa-cog gridHeaderButton eslo-header-button' ng-click=\"editColumnHeader(col)\" " +
						"ng-show='root.authorMode' title='Change how this column is displayed'>&nbsp;</i>" +
				"</div>" +
				"<div class=\"ngSortButtonDown\" ng-show=\"col.showSortButtonDown()\"></div>" +
				"<div class=\"ngSortButtonUp\" ng-show=\"col.showSortButtonUp()\"></div>" +
				"<div class=\"ngSortPriority\">{{col.sortPriority}}</div>" +
				"<div ng-class=\"{ ngPinnedIcon: col.pinned, ngUnPinnedIcon: !col.pinned }\" " +
					"ng-click=\"togglePin(col)\" ng-show=\"col.pinnable\"></div>" +
			"</div>" +
			"<div ng-show=\"col.resizable\" class=\"ngHeaderGrip\" ng-click=\"col.gripClick($event)\" " +
				"ng-mousedown=\"col.gripOnMouseDown($event)\"></div>"
		);
	}
]);