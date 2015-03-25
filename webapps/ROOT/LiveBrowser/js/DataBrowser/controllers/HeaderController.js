espresso.app.controller('espresso.HeaderCtrl', [
	'DirectLink', '$location', '$modal', '$rootScope', '$routeParams', '$scope', 'Tables', '$window', 'Events', '$http', 'Settings',
	'$timeout',
	function (DirectLink, $location, $modal, $rootScope, $routeParams, $scope, Tables, $window, Events, $http, Settings,
			$timeout) {
		$rootScope.trackAction('livebrowser_editmode');
		$scope.toggleMode = function toggleMode() {
			//angular.element('.mode-action').toggleClass('active');
			$rootScope.root.editMode = !$rootScope.root.editMode;
		};
		
		// If we get notified that we're inside the Logic Designer, then we switch to Edit Mode
		$rootScope.$on('insideLogicDesigner', function() {
			console.log('In LD - switching to Edit mode');
			$rootScope.root.editMode = true;
		});
		
		Events.on('WatchEditMode', function toggleEditMode() {
			if ($rootScope.root.editMode)
				$scope.editModeMenu = "Switch to read-only mode";
			else
				$scope.editModeMenu = "Switch to edit mode";
		});
		$scope.editModeMenu = "Switch to read-only mode";
		
		$scope.toggleAuthoring = function toggleAuthoring() {
			$rootScope.trackAction('livebrowser_authormode');
			if ($rootScope.root.authorMode) {
				$rootScope.root.authorMode = false;
				//$rootScope.root.authorInfo = null;
				return;
			}

			// Switch to author mode -- do we need to log in?
			if ( ! $rootScope.root.authorInfo) {
				$scope.authorLogin();
			}
			else {
				if (!espresso.settings) {
					//LB in LD did not initialize a new app
					$rootScope.getApp($scope).then(function () {
						$timeout(function () {
							$scope.getAppObject();
						}, 100);
					});
				}
				else {
					$scope.getAppObject();
				}
			}
		};
		
		$scope.getAppObject = function getAppObject() {
			var headers = {
    			Authorization: "Espresso " + $rootScope.root.authorInfo.apikey + ":1",
    			'X-EspressoLogic-ResponseFormat': 'json'
    		};
			$http.get($rootScope.root.authorInfo.url + "applications/" + espresso.settings.ident, {
				headers: headers,
			}).success(function(data){
				console.log(data);
				espresso.settings = data[0];
				Settings.getTableSettings(function() {});
			}).error(function(errData, status) {
				console.log('Error : ' + status);
				espresso.util.error("Error while retrieving app");
			});
			$rootScope.root.authorMode = true;
		};
		
		$scope.authorLogin = function() {
			var options = {
					backdrop: 'static',
					keyboard: true,
					templateUrl:  'templates/modals/authorLogin.html',
					controller: 'espresso.AuthorLoginCtrl'
				};
			$scope.authorModal = $modal.open(options);
		};
		
		$scope.editAppSettings = function() {
			if ( ! $rootScope.root.authorMode)
				return;
			var options = {
					backdrop: 'static',
					keyboard: true,
					templateUrl:  'templates/modals/appSettings.html',
					controller: 'espresso.AppSettingsCtrl'
				};
			$modal.open(options);
		};

		$rootScope.bestColumn = {name:''};
		Events.on('WatchCurrentTable', function setBestColumn(event, data) {
			if (angular.isDefined(data)) {
				if (data.details) {
					var column = Tables.getBestParentColumn(data.details.name);
					if (column) {
						//we found a nice searchable column
						column = Tables.getTableSettings(data.details.name).columnFormats[column.name];
						Events.broadcast('DefaultColumn', column);
					}
					else {
						//well, just set the default to the first column
						var columnNames = _.keys(data.settings.columnFormats);
						column = data.settings.columnFormats[columnNames[0]];
						Events.broadcast('DefaultColumn', column);
					}
				}
			}
		});
		//getBestParentColumn

		/* abstract this into a Windows suite of services */
			//panels service
			//window service
			//menu directive, panels/windows injected
			//controller only handles events
		var panes = {
			'1a': 'main-grid',
			'2a': 'form',
			'2b': 'child-grid'
		};
		var modes = {
			'main-grid': 'gui',
			'rest-log': 'rest'
		};
		var toggleRightPane = function toggleRightPane() {
			if (!layouts['2b'].open && espresso.rightLayout.north.state.isClosed) {
				espresso.topLayout.sizePane('west', '100%');
			} else {
				espresso.topLayout.sizePane('west', '50%');
			}
			angular.element('#childTabs').trigger('resize');
		};
		var layouts = {
			'1a': {
				element: 'topLayout', layout: 'west',
				callback: function (area, window, event) {
					$rootScope.root.displayMode = modes[window];
					espresso.topLayout.resizeAll(true);
			}, open: true},
			'2a': {element: 'rightLayout', layout: 'north', callback: function () {
				toggleRightPane();
				layouts['2a'].open = !layouts['2a'].open;
			}, open: true},
			'2b': {element: 'rightLayout', layout: 'center', toggle: function () {
				if (this.open) {
					espresso.rightLayout.sizePane('north', '100%');
					$('.rightLayout-center').css('display', 'none');
					espresso.rightLayout.resizeAll();
					this.open = false;
				}
				else {
					espresso.rightLayout.sizePane('north', '50%');
					$('.rightLayout-center').css('display', 'block');
					espresso.rightLayout.resizeAll();
					this.open = true;
				}
			}, open: true, callback: function () {
				toggleRightPane();
			}}
		};
		$scope.togglePanel = function togglePanel(area, window, event) {
			//var $element = angular.element(event.target);
			if (panes[area] === window) {
				//close pane
				if (angular.isDefined(layouts[area].toggle)) {
					layouts[area].toggle();
				}
				else {
					espresso[layouts[area].element].close(layouts[area].layout);
				}
				panes[area] = '';
			} else {
				if (angular.isDefined(layouts[area].toggle)) {
					layouts[area].toggle();
				}
				if (!espresso[layouts[area].element].isOpen) {
					//open pane
					espresso[layouts[area].element].open(layouts[area].layout);
					panes[area] = window;
				}
			}
			var callback = layouts[area].callback || function () {};
			angular.element('.window-toggle').removeClass('active');
			angular.forEach(panes, function (element, index) {
				angular.element('.' + element + '-toggle').addClass('active');
			});
			callback(area, window, event);
		};
		Events.on('WindowState', function (event, state) {
			var windows = {
				child: ['2b', 'child-grid', event],
				main: ['1a', 'main-grid', event],
				form: ['2a', 'form', event]
			};

			_.each(windows, function (params, window) {
				if (_.contains(state, window)) {
					if (layouts[windows[window][0]].open) {
						//currently open, do nothing
					}
					else {
						//current closed -> open it
						var args = windows[window];
						$scope.togglePanel(args[0], args[1], args[2]);
					}
				}
				else {
					if (layouts[windows[window][0]].open) {
						//currently open -> close it
						var args = windows[window];
						$scope.togglePanel(args[0], args[1], args[2]);
					}
					else {
						//currently closed, do nothing
					}
				}
			});
		});
		Events.on('CloseWindow', function closeWindowAction(event, window) {
			var windows = {
				child: ['2b', 'child-grid', event],
				main: ['1a', 'main-grid', event],
				form: ['2a', 'form', event]
			};
			if (windows[window]) {
				var args = windows[window];
				$scope.togglePanel(args[0], args[1], args[2]);
			}
		});
		
		$rootScope.$on('DirectLinkUpdate', function directLinkCloseSections(event, params) {
			if (params.closed) {
				var closeWindows = params.closed.split(',');
				angular.forEach(closeWindows, function doCloseWindow(window) {
					$timeout(function () {
						Events.broadcast('CloseWindow', window);
					}, 50);
				});
			}
			console.log(params);
		});

		$scope.generateLinkPrompt = function () {
			var options = {
				backdrop: 'static',
				keyboard: true,
				templateUrl:  'templates/link-generator.html',
				controller: 'espresso.LinkGeneratorCtrl'
			};
			$modal.open(options).opened['finally'](function () {
				//This only looks like a kludge!, 300ms is how long it takes the animation to finish before html is compiled
				setTimeout(function () {
					$rootScope.$emit('linkGeneratorLoaded');
				},
				300);
			});
		};

		$scope.undoButtonClicked = function() {
			$rootScope.$emit('undoAll');
			Events.broadcast('RefreshMainGrid');
			Events.broadcast('RefreshChildGrid');
		};
	}
]);
