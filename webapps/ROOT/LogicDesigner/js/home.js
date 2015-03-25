var kahuna;
kahuna.home = {

	HomeCtrl : function ($rootScope, $scope, $http, $resource, $route, $routeParams, $location, $modal, $log, $sce, Storage,
			KahunaData, jqueryUI, $timeout, Project, $window, $q) {
		/**
		 * @ngdoc property
		 * @name Refactor.onRouteChange.HomeCtrl
		 * @description Most routes set a $rootScope currentPage and currentPageHelp, configurables that fit neatly in the route object.
		 * Here there is also a contextHelpPage. onRouteChange event should read this from the route object, and set before the controller fires
		 */
		$rootScope.currentPage = 'home';
		$rootScope.currentPageHelp = 'docs';
		$rootScope.contextHelpPage = 'help/index.html';
		$scope.goToDb = function () {
			$location.path('/projects/' + $rootScope.currentProject.ident + '/databases');
		};

		$scope.$evalAsync(function () {
			// when routing on the client side, it is possible LD has not run the home controller and everything will break
			$rootScope.appInitialized = true;
		});

		// data container for actions we want to pass between controllers
		$rootScope.syncAction = {};

		$rootScope.elDebug = function espressoLogicDebug(variable) {
			console.log(variable);
		};
		$rootScope.openLiveBrowserExternal = function openLiveBrowserExternal() {
			window.open('../LiveBrowser/#/?serverName=' + $scope.$eval('liveBrowserUrl') + '&forceLogin=true','_blank');
		};
		$rootScope.reloadSchema = function reloadSchema() {
			kahuna.meta.getAllSchemas($rootScope.currentProject, function (dbSchemas) {
				angular.forEach(dbSchemas, function (dbschema, i) {
					var numsteps = 5;
					$rootScope.rescanStepsRemaining = numsteps;
					dbschema.status = 'R';
					KahunaData.update(dbschema, function (data) {
						// changing scope variables outside of a digest cycle
						$rootScope.$evalAsync(function () {
							kahuna.util.info("Database schema rescan started.");
							kahuna.meta.getAllTables($rootScope.currentProject, stepComplete, stepComplete);
							kahuna.meta.getAllViews($rootScope.currentProject, stepComplete, stepComplete);
							kahuna.meta.getAllProcedures($rootScope.currentProject, stepComplete, stepComplete);
							kahuna.meta.getAllApiVersions($rootScope.currentProject, stepComplete, stepComplete);
							kahuna.meta.getAllResources($rootScope.currentProject, stepComplete, stepComplete);
						});
					}, function errCallback(data, status, url) {
					});
				});
			});

			function stepComplete(a, b, c) {
				$rootScope.rescanStepsRemaining -= 1;
				$rootScope.$digest();
				if (0 == $rootScope.rescanStepsRemaining) {
					kahuna.applyFunctionInScope($rootScope, function () {
						var msg = "Database rescan completed - " + _.size(kahuna.meta.allTables) + " tables, " + _.size(kahuna.meta.allViews) + " views, " + _.size(kahuna.meta.allProcedures) + " procedures.";
						kahuna.setLiveBrowserUrl($rootScope, $rootScope.currentProject);
						kahuna.problems.refreshProblems($rootScope, KahunaData);
						kahuna.util.info(msg);
					});
				}
			}
		};

		$rootScope.params = {};
		$rootScope.params.evalMode = !Storage.get('evalMode');
		$rootScope.$watch('params.evalMode', function (current) {
			$timeout(function () {
				$('#evalModeInput').scope().params = {evalMode: current};
			});
		});
		$rootScope.toggleEvalMode = function toggleEvalMode() {
			$rootScope.params.evalMode = !$rootScope.params.evalMode;
			Storage.put('evalMode', !$rootScope.params.evalMode);
		};

		$rootScope.updateLiveBrowserUrl = function updateLiveBrowserUrl() {
			kahuna.setLiveBrowserUrl($rootScope, $rootScope.currentProject);
		};

		/**
		 * @ngdoc property
		 * @name Refactor.FutureService.alerts
		 * @description mdh: I believe $rootScope.alerts is set here because this controller runs before everything else.
		 * In that case, this is probably more useful as a service.
		 */
		$rootScope.alerts = [];

		// Keep track of problems for the entire project
		$rootScope.problemCount = null;
		$rootScope.problems = {};

		// Handle tabs properly
		$scope.data = {
			tabStates: {
				welcome: true,
				"TechDocs": false,
				"UserDocs": false,
				architecture: false,
				process: false,
				news: false
			}
		};
		$scope.$watch("data.tabStates", function tabStatesChanged(oldState) {
			var selectedTab = null;
			for (p in $scope.data.tabStates) {
				if ($scope.data.tabStates[p]) {
					selectedTab = p;
					break;
				}
			}
			localStorage['eslo-ld-home-tab'] = selectedTab;
		}, true);
		if (localStorage['eslo-ld-home-tab']) {
			for (p in $scope.data.tabStates) {
				$scope.data.tabStates[p] = (p == localStorage['eslo-ld-home-tab']);
			}
		}

		$rootScope.$watch('currentProject', function (current, previous) {
			if (current) {
				setTimeout(function () { Storage.put('CurrentProject', current); }, 500);
			}
		});

		// child OR parent relationships weighted as 1, child AND parent weighted as (childRels+1) * (parentRels+1)
		// so a resource with one parent and one child weighted as 4
		// and a resource with 4 children/no parents is also weighted 4
		$scope.parseTablesConnectivity = function parseTablesConnectivity(tables) {
			var connectivityObj = {};

			angular.forEach(kahuna.meta.allTables, function (table, name) {
				var childRels = 0;
				var parentRels = 0;

				if (table.children.length) {
					childRels = table.children.length;
				}

				if (table.parents.length) {
					parentRels = table.parents.length;
				}

				// if either type of relationship is 0, weight them by a simple relationship count
				if (!childRels || !parentRels) {
					connectivityObj[name] = childRels + parentRels;
				}
				else {
					// else, multiply them
					connectivityObj[name] = (childRels + 1) * (parentRels + 1);
				}
			});

			return connectivityObj;
		};
		$scope.getMostConnectedTable = function getMostConnectedTable(connectivityObj) {
			var weightedTable = null;
			var highestWeight = 0;
			angular.forEach(connectivityObj, function (weight, tableName) {
				if (weight > highestWeight) {
					weightedTable = kahuna.meta.allTables[tableName];
					highestWeight = weight;
				}
			});
			return weightedTable;
		};

		// methods and objects that can be re-structured into services
		$scope.helpers = {};

		// expects table definition object and a new resource object with a name attribute
		// ex: $scope.helpers.createTableResource(kahuna.meta.allTables['tableName'], {name: 'NewResourceName'});
		// returns $q promise on success
		// #TODO abstract resource creation in the kahuna.resourcesCtrl
		$scope.helpers.createTableResource = function helperCreateSubResource(table, resource) {
			var deferred = $q.defer();
			if (!table) {
				deferred.reject();
				return deferred.promise;
			}
			var apiIdent = kahuna.meta.allApiVersions[0].ident;
			var _defaults = {
				apiversion_ident: apiIdent,
				resource_type_ident: 1,
				prefix: table.prefix,
				table_name: table.entity,
				root_ident: null,
				is_collection: "Y",
				container_ident: null,
			};

			resource = angular.extend({}, _defaults, resource);

			KahunaData.create("AllResources", resource, function (data) {
				var resourceObj = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(data.txsummary, 'AllResources', 'INSERT'));
				kahuna.resource.allResources[resourceObj.ident] = resourceObj;
				deferred.resolve(resourceObj);
			});

			return deferred.promise;
		};

		// expects relationship to be the relationship as defined by the parent
		// expects parent and child to be a table metadata object
		$scope.helpers.getJoinFragment = function getJoinFragment(definition) {
			var fragment = '';
			if (definition.child_table) {
				// this is a child table
				angular.forEach(definition.child_columns, function (element, index) {
					if (index > 0) {
						fragment += ' AND ';
					}
					fragment = element + ' = [' + definition.parent_columns + ']';
				});
			}
			else {
				// this is a child table
				angular.forEach(definition.parent_columns, function (element, index) {
					if (index > 0) {
						$scope.relationships.sqlFragment += ' AND ';
					}
					fragment = element + ' = [' + definition.child_columns + ']';
				});
			}

			return fragment;
		};

		// This controller regenerates all listeners on any navigation back to #/
		$rootScope.registeredConnectWizardSuccessListener = false;
		if (!$rootScope.registeredConnectWizardSuccessListener) {
			$rootScope.$on('ConnectWizardSuccess', function (event) {
				// The ConnectWizardSuccess event can be received multiple times at once
				if ($rootScope.creatingDefaultObjects) {
					var timeDiff = new Date() - $rootScope.creatingDefaultObjects;
					if (timeDiff > 30000) {
						console.log('We DO need to create default objects - last time was a while ago');
					}
					else {
						console.log('No need to create default objects - already in progress');
						return;
					}
				}
				console.log('ConnectWizardSuccess - Creating default objects');
				$rootScope.creatingDefaultObjects = new Date();
				var connectivityObj = $scope.parseTablesConnectivity(kahuna.meta.allTables);
				var newResourceTable = $scope.getMostConnectedTable(connectivityObj);
				if (newResourceTable) {
					var maxTopLevelParents = 2;
					var maxTopLevelChildren = 2;
					// save the resource
					$scope.helpers.createTableResource(newResourceTable, {name: newResourceTable.entity + 'Object'})
						.then(function (resource) {
							// save 1st layer of child relationships
							angular.forEach(newResourceTable.children, function (relationship, index) {
								if (maxTopLevelChildren-1 > 0) {
									maxTopLevelChildren--;
									var relationshipTable = kahuna.meta.allTables[relationship.child_table];
									$scope.helpers.createTableResource(relationshipTable, {
										name: relationshipTable.entity + 'Child',
										root_ident: resource.ident,
										container_ident: resource.ident,
										is_collection: 'Y',
										description: 'Generated sample resource',
										join_condition: $scope.helpers.getJoinFragment(relationship)
									})
										.then(function (res) {
											if (!res) {
												return;
											}
											// save 2nd layer of child relationships
											angular.forEach(relationshipTable.children, function (rel, i) {
												if (i < 2) {
													var relTable = kahuna.meta.allTables[rel.child_table];
													$scope.helpers.createTableResource(relTable, {
														name: relTable.entity + 'Grandchild',
														root_ident: res.ident,
														container_ident: res.ident,
														is_collection: 'Y',
														description: 'Generated sample resource',
														join_condition: $scope.helpers.getJoinFragment(rel)
													});
												}
											});
										})
										.then(function (res) {
											if (!res) {
												return;
											}
											// save a layer of parents for these child relationships which are NOT the current parent table
											var parentCount = 0;
											angular.forEach(relationshipTable.parents, function (rel, i) {
												if (rel.parent_table !=  newResourceTable.name && parentCount < 2) {
													parentCount++;
													var relTable = kahuna.meta.allTables[rel.parent_table];
													$scope.helpers.createTableResource(relTable, {
														name: rel.name,
														root_ident: res.ident,
														container_ident: res.ident,
														is_collection: 'N',
														description: 'Generated sample resource',
														join_condition: $scope.helpers.getJoinFragment(rel)
													});
												}
											});
										});
								}
							});

							// save 1st layer of parent relationships
							angular.forEach(newResourceTable.parents, function (relationship, index) {
								if (maxTopLevelParents-1 > 0) {
									maxTopLevelParents--;
									var relationshipTable = kahuna.meta.allTables[relationship.parent_table];
									$scope.helpers.createTableResource(relationshipTable, {
										name: relationshipTable.entity + 'Parent',
										root_ident: resource.ident,
										container_ident: resource.ident,
										is_collection: 'N',
										description: 'Generated sample resource',
										join_condition: $scope.helpers.getJoinFragment(relationship)
									})
										.then(function (res) {
											if (!res) {
												return;
											}
											var childCount = 0;
											// save a layer of children to this parent that is NOT the root resource table
											angular.forEach(relationshipTable.children, function (rel, i) {
												if (rel.child_table !=  newResourceTable.name && childCount < 2) {
													var relTable = kahuna.meta.allTables[rel.parent_table];
													$scope.helpers.createTableResource(relTable, {
														name: rel.name,
														root_ident: res.ident,
														container_ident: res.ident,
														is_collection: 'Y',
														description: 'Generated sample resource',
														join_condition: $scope.helpers.getJoinFragment(rel)
													});
												}
											});
										}, function (error) {console.log('err', error);})
										.then(function (res) {
											if (!res) {
												return;
											}
											// save 2nd layer of parent relationships
											angular.forEach(relationshipTable.parents, function (rel, i) {
												if (i < 2) {
													var relTable = kahuna.meta.allTables[rel.parent_table];
													$scope.helpers.createTableResource(relTable, {
														name: relTable.entity + 'Grandparent',
														root_ident: res.ident,
														container_ident: res.ident,
														is_collection: 'N',
														description: 'Generated sample resource',
														join_condition: $scope.helpers.getJoinFragment(rel)
													});
												}
											});
										});
								}
							});
						});
					// end of saving resources

					var ruleTable = $scope.getUseableRuleTable();
					if (ruleTable && !$rootScope.currentProject.name.match(/Northwind/)) {
						console.log($rootScope.currentProject);
						// create sample event rule
						var eventRule = {
							ruletype_ident: 7,
							active: true,
							entity_name: ruleTable.name,
							name: 'Sample Event Rule',
							verbs: 'UPDATE,',
							prop4: 'javascript',
							project_ident: $rootScope.currentProject.ident,
							comments: 'This is a sample event rule created for new projects.',
							rule_text1: 'if (oldRow.' + ruleTable.ruleableColumns[0].name + ' != row.' + ruleTable.ruleableColumns[0].name + ') {\n' +
								'    log.debug("Sample Event Rule for ' + ruleTable.entity + ' table:  ' + ruleTable.ruleableColumns[0].name +
								' column updated to " + row.' + ruleTable.ruleableColumns[0].name + ');\n' +
								'}\n' +
								'else {\n' +
								'    log.debug("Sample Event Rule for ' + ruleTable.entity + ' table: ' + ruleTable.ruleableColumns[0].name + ' column unchanged.");\n' +
								'}'
						};
						KahunaData.create("AllRules", eventRule, function (data) {
							console.log('created sample event rule', data);
						});

						// create sample validation rule
						var validationRule = {
							ruletype_ident: 5,
							active: true,
							entity_name: ruleTable.name,
							name: 'Sample validation Rule',
							verbs: null,
							prop4: 'javascript',
							project_ident: $rootScope.currentProject.ident,
							comments: 'This is a sample validation rule created for new projects.',
							rule_text1: 'return "ForbiddenValue" !== row.' + ruleTable.ruleableColumns[0].name + '; // example of a validation boolean'
						};
						KahunaData.create("AllRules", validationRule, function (data) {
							console.log('created sample validation rule', data);
						});
					}
				}
			});
			$rootScope.registeredConnectWizardSuccessListener = true;
		}

		// loops through tables, returns a copy of a table with at least one column that is not a key,
		$scope.getUseableRuleTable = function getUseableRuleTable() {
			var candidate = null;
			angular.forEach(kahuna.meta.allTables, function (table, index) {
				if (candidate) {
					return;
				}
				if (table.columns.length > 2) {
					candidate = angular.copy(table);
					var columnsByName = _.indexBy(candidate.columns, 'name');
					angular.forEach(candidate.keys, function (keyObj, i) {
						delete columnsByName[keyObj.name];
					});

					// all the columns were keys, this may be a linking table, and will probably be uninteresting
					if (!_.values(columnsByName).length) {
						candidate = null;
					}
					else {
						candidate.ruleableColumns = _.values(columnsByName);
					}
				}
			});

			return candidate;
		};

		$rootScope.lockProject = false;
		// $scope.espressoMgmtServer = "https://mgmt.t.espressologic.com:8080";  // TODO use the correct URL
		// Set things up when a new project is selected
		$rootScope.projectSelected = function (project, doNotSetPath, lockMilliSeconds) {
			// when programmatically selecting a project based on events, it may be preferred to suspend projectSelected() calls
			if ($rootScope.lockProject) {
				return;
			}
			if (lockMilliSeconds) {
				$rootScope.lockProject = true;
				$timeout(function () { $rootScope.lockProject = false; }, lockMilliSeconds);
			}

			if (angular.isDefined(project)) {
				$rootScope.currentProject = project;
			}
			var currentProject = $rootScope.currentProject;

			var loadingModal = $modal.open({
				template: "<div ng-click='close();' style='padding: 25px; font-size: 18px;'>Now loading the database schema, please wait...</div>",
				controller: ['$scope', '$timeout', '$modalInstance', function ($scope, $timeout, $modalInstance) {
					$scope.actTimedOut = false;
					$timeout(function () {
						$scope.actTimedOut = true;
					}, 10000);

					$scope.close = function () {
						if ($scope.actTimedOut) {
							$modalInstance.close();
						}
					};
				}],
				backdrop: 'static',
				keyboard: false,
				size: 'large'
			});
			function hideLoadingDialog() {
				loadingModal.close();
			}
			kahuna.meta.getAllTables(currentProject, hideLoadingDialog, hideLoadingDialog);
			kahuna.meta.getAllViews(currentProject);
			kahuna.meta.getAllProcedures(currentProject);
			kahuna.meta.getAllApiVersions(currentProject, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					kahuna.setLiveBrowserUrl($rootScope, currentProject);
				});
			});
			kahuna.meta.getAllResources(currentProject);

			if (kahuna.restlab) {
				kahuna.restlab.history = [];
			}

			// Grab the project's options so we can enable/disable features accordingly
			kahuna.fetchData(kahuna.baseUrl + 'admin:projectoptions', {filter : 'project_ident=' + currentProject.ident}, function (data) {
				kahuna.globals.projectOptions = {};
				for (var i = 0; i < data.length; i++) {
					kahuna.globals.projectOptions[data[i].projectoptiontype_ident] = data[i].option_value;
				}

				kahuna.applyFunctionInScope($scope, function () {
					$scope.data.userTabs = [];
					if (kahuna.globals.projectOptions[13]) {
						$scope.data.userTabs.push({title: "TechDocs", url: $sce.trustAsResourceUrl(kahuna.globals.projectOptions[13]), active: false});
					}
					if (kahuna.globals.projectOptions[14]) {
						$scope.data.userTabs.push({title: "UserDocs", url: $sce.trustAsResourceUrl(kahuna.globals.projectOptions[14]), active: false});
					}
				});
			});

			// Get all the problems for this project
			kahuna.fetchData(kahuna.baseUrl + 'ProjectProblems', {filter : 'project_ident=' + $rootScope.currentProject.ident +
						" and status in ('O', 'F', 'f')" }, function (data) {
				$rootScope.problems = {};
				for (var i = 0; i < data.length; i++) {
					$rootScope.problems[data[i].ident] = data[i];
				}

				if (data.length == 0) {
					kahuna.putInScope('problemCount', '');
				}
				else {
					kahuna.putInScope('problemCount', data.length);
				}

				if ($rootScope.initial_path) {
					$location.path($rootScope.initial_path);
				}
				else if ( ! doNotSetPath) {
					$location.path('/');
				}

				$rootScope.$apply();
			});
		};

		if (kahuna.globals.projectOptions) {
			$scope.data.userTabs = [];
			if (kahuna.globals.projectOptions[13]) {
				$scope.data.userTabs.push({title: "TechDocs", url: $sce.trustAsResourceUrl(kahuna.globals.projectOptions[13]), active: true});
			}
			if (kahuna.globals.projectOptions[14]) {
				$scope.data.userTabs.push({title: "UserDocs", url: $sce.trustAsResourceUrl(kahuna.globals.projectOptions[14]), active: true});
			}
		}

		$scope.$on('$viewContentLoaded', function () {
			var isWindows = navigator.userAgent.match(/Windows/i);
			var isTouch = navigator.userAgent.match(/Touch/i);
			if (isWindows && isTouch) {
				$('.home-view').click(function (event) {
					var $element = $(event.target);
					var $map = $element.closest('map');
					if ($map.length) {
						event.stopPropagation();
						event.preventDefault();
					}
				});
			}
		});

		kahuna.home.initialDataFetched = false;
		// Fetch the current account
		kahuna.home.fetchInitialData = _.throttle(function () {
			if (kahuna.home.initialDataFetched) {
				return;
			}
			kahuna.home.initialDataFetched = true;

			kahuna.fetchData('AccountsWithOptions', null, function (data) {
				kahuna.globals.currentAccount = data[0];
				kahuna.globals.currentAccountOptions = {};
				for (var i = 0; i < data[0].Options.length; i++) {
					var option = data[0].Options[i];
					kahuna.globals.currentAccountOptions[option.accountoptiontype_ident] = option;
					if (option.accountoptiontype_ident == 2) {
						kahuna.globals.fullJavascriptAllowed = (option.option_value == 'true');
					}
				}
				$rootScope.$apply(function () {
					$rootScope.currentAccount = data[0];
				});

				try {
					woopra.track('logicdesigner_access', {
						accountname: kahuna.globals.currentAccount.url_name
					});
				}
				catch (e) {
					console.log('Woopra error: ' + e);
				}

				if ( ! kahuna.globals.projects || kahuna.globals.projects.length == 0) {
					kahuna.fetchData('AllProjects', { pagesize : 200 }, function (fetchData) {
						kahuna.globals.projects = fetchData;
						$rootScope.$apply(function () {
							$rootScope.allProjects = fetchData;
							for (var i = 0; i < fetchData.length; i++) {
								if (fetchData[i].name == 'Espresso Logic Demo') {
									if (!$rootScope.lockProject) {
										$rootScope.currentProject = fetchData[i];
									}
									break;
								}
							}
							if ( ! $rootScope.currentProject) {
								for (var i = 0; i < fetchData.length; i++) {
									if (fetchData[i].ident == 3) {
										if (!$rootScope.lockProject) {
											$rootScope.currentProject = fetchData[i];
										}
										break;
									}
								}
							}
							if ( ! $rootScope.currentProject) {
								if (fetchData.length > 0) {
									if (!$rootScope.lockProject) {
										$rootScope.currentProject = fetchData[0];
									}
								}
							}
						});

						kahuna.meta.getAllTables($rootScope.currentProject);
						kahuna.meta.getAllViews($rootScope.currentProject);
						kahuna.meta.getAllProcedures($rootScope.currentProject);
						kahuna.meta.getAllApiVersions($rootScope.currentProject, function () {
							kahuna.applyFunctionInScope($scope, function () {
								kahuna.setLiveBrowserUrl($rootScope, $rootScope.currentProject);
							});
						});
						kahuna.meta.getAllResources($rootScope.currentProject);
						$scope.projectSelected($rootScope.currentProject);
					});
				}
			});

			// Retrieve the IP address of the server. This of course assumes only one server...
			kahuna.fetchData(kahuna.baseUrl + "@serverinfo", null, function fetchServerInfoCb(data) {
				$rootScope.serverIp = data.publicAddress;
			});

			kahuna.fetchData(kahuna.baseUrl + "@license", null, function (data) {
				if (data.error) {
					$rootScope.license = {company: "No valid license found"};
					alert('This server does not have a proper license: ' + data.error +
							"\nThis server is now in read-only mode: existing projects will continue to run normally, " +
							"but you cannot change anything until a valid license has been installed.");
					return;
				}
				$rootScope.license = data;
			});
		}, 1000);

		$rootScope.logout = function () {
			// logging out alerted 'Error 0' because asynchronous requests made when attempting ANY type of javascript reload
			// hide and permit no request
			$('body').html('');
			$ = null;
			setTimeout(function () {
				// forget EVERYTHING!
				Storage.remove('authSession');
				Storage.remove('CurrentProject');
				// pretending this never happened
				$window.location.reload();
			});
		};

		$scope.connectWizard = function connectWizard() {
			Project.connectWizard();
		};
		$rootScope.connectWizard = angular.copy($scope.connectWizard);

		$rootScope.importNewProject = function importNewProject() {
			Project.importPrompt();
		};
		$rootScope.importNewProject = angular.copy($scope.importNewProject);

		$rootScope.importFileSelected = function importFileSelected(elem) {
			console.log('importFile');
			if (!elem.files[0]) {
				return;
			}
			$rootScope.importFileName = elem.files[0].name;
			$rootScope.$digest();
		};

		// Still in use, but this should be migrated into Project.js
		$rootScope.importProject = function importProject() {
			console.log('Begin import project from file: ' + document.getElementById('importFile').files[0]);
			if (!document.getElementById('importFile').files[0]) {
				alert("Please select a JSON file to import");
				return;
			}
			if (window.File && window.FileReader && window.FileList && window.Blob) {
				var importFile = document.getElementById('importFile').files[0];
				var reader = new FileReader();
				reader.onloadend = function (e) {
					var json = e.target.result;
					for (var i = 0; i < json.length; i++) {
						var c = json.charAt(i);
						if (c == ' ' || c == '\n' || c == '\r' || c == '\t') {
							continue;
						}
						if (c != '{' && c != '[') {
							alert("This file does not contain valid JSON.");
							return;
						}
						break;
					}

					var proj = null;
					try {
						proj = JSON.parse(json);
					}
					catch (e2) {
						alert('Your JSON file contains an error: ' + e2);
						return;
					}

					$scope.importMessage = "Import in progress...";
					var progressDialog = $modal.open({
						templateUrl: 'partials/modals/ProjectImportProgress.html',
						controller: kahuna.home.HomeCtrl,
						size: 'sm',
						backdrop: 'static',
						keyboard: false,
						scope: $scope
					});

					try {
						KahunaData.create("ProjectExport", proj, function (data) {
							if (data.txsummary && data.txsummary.length > 0) {
								// We have to re-fetch the project because what we get in the txsummary is a ProjectExport,
								// not a AllProjects, which is what we require in $rootScope.allProjects
								for (var i = 0; i < data.txsummary.length; i++) {
									if (data.txsummary[i]['@metadata'].resource === 'ProjectExport') {
										kahuna.fetchData('AllProjects', {
											filter : 'ident=' + data.txsummary[i].ident
										}, function (fetchData) {
											$rootScope.allProjects.push(fetchData[0]);
											kahuna.util.info('Your project has been imported');
										});
										break;
									}
								}
							}
							$scope.importMessage = "Import was successful. Don't forget to reset the database and user passwords!";
							(function (dlg) {
								$timeout(function () {
									dlg.close();
								}, 4000);
							})(progressDialog);
						}, function (e2) {
							var errMsg = JSON.stringify(e2);
							if (e2.errorMessage) {
								errMsg = e2.errorMessage;
							}
							$scope.importMessage = "Import failed: " + errMsg;
							(function (dlg) {
								$timeout(function () {
									dlg.close();
								}, 10000);
							})(progressDialog);
							kahuna.util.error('Your project could not be imported: ' + errMsg);
						});
					}
					catch (e3) {
						var errMsg = JSON.stringify(e3);
						if (e3.errorMessage) {
							errMsg = e3.errorMessage;
						}
						console.log('Exception thrown during project import: ' + errMsg);
						$scope.importMessage = "Import did not succeed: " + errMsg;
						(function (dlg) {
							$timeout(function () {
								dlg.close();
							}, 10000);
						})(progressDialog);
					}
				};
				reader.readAsText(importFile);
			}
			else {
				alert('Sorry -- your browser does not support this function.');
			}
		};

		// Set up the help area
		$rootScope.helpDialog = function helpDialog(groupName, itemName, doNotShowHelpPane) {
			$rootScope.contextHelpPage = "help/" + groupName + "/" + itemName + ".html";
			if (!doNotShowHelpPane) {
				// kahuna.layout.open('east');
				kahuna.helpLayout.open('north');
			}
			if (kahuna.helpLayout.readState().north.size < 150) {
				kahuna.helpLayout.sizePane('north', "65%");
			}
		};

		$rootScope.helpDialog('home', 'Help', localStorage['eslo-ld-learn-complete']);

		$rootScope.log = function (log) {console.log(log);};

		// Resize the help pane so everything fits nicely
		setTimeout(function () {
			kahuna.layout.sizePane('east', 349);
			// console.log('Resize here');
		}, 2000);

		$rootScope.hideContextHelp = function hideContextHelp() {
			$('#helpDiv').height(24);
		};

		// Remember GUI positions and settings per screen in this object,
		// which is put in localStorage but could also be stored in the database.
		kahuna.readGuiSettings = function readGuiSettings(project) {
			if (!$rootScope.gui || project.ident !== $rootScope.guiProjectIdent) {
				$rootScope.guiProjectIdent = project.ident;
				$rootScope.gui = {};
				var theName = 'espressoGui_' + project.ident;
				var guiJson = localStorage[theName];
				console.log("localStorage READ - " + theName);
				if (guiJson) {
					try {
						$rootScope.gui = JSON.parse(guiJson);
					}
					catch (e) {
						console.log('Error parsing GUI settings - resetting them');
					}
				}
			}
		};

		// Store a GUI setting.
		kahuna.storeGuiSetting = function storeGuiSetting(project, pageName, settingName, value) {
			if (project.ident !== $rootScope.guiProjectIdent) {
				console.log("ERROR gui project ident, not same as requested " + project.ident + " $rootScope.guiProjectIdent=" + $rootScope.guiProjectIdent);
				return;
			}
			$rootScope.gui[pageName] = $rootScope.gui[pageName] || {};
			$rootScope.gui[pageName][settingName] = value;
		};

		kahuna.saveGuiSettings = function saveGuiSettings(project) {
			if (project.ident !== $rootScope.guiProjectIdent) {
				console.log("ERROR gui project ident, not same as requested " + project.ident + " $rootScope.guiProjectIdent=" + $rootScope.guiProjectIdent);
				return;
			}

			if (!('localStorage' in window) || !window['localStorage']) {
				return;
			}
			var theName = 'espressoGui_' + $rootScope.guiProjectIdent;
			var theValue = JSON.stringify($rootScope.gui);
			localStorage[theName] = theValue;
			console.log("localStorage SAVED - " + theName);
		};

		/**
		 * Delete the gui setting for the page name.  Normally done before storing all and then saving
		 */
		kahuna.deleteGuiSetting = function deleteGuiSetting(project, pageName) {
			if (project.ident !== $rootScope.guiProjectIdent) {
				console.log("ERROR gui project ident, not same as requested " + project.ident + " $rootScope.guiProjectIdent=" + $rootScope.guiProjectIdent);
				return;
			}
			delete $rootScope.gui[pageName];
		};

		kahuna.getGuiSetting = function getGuiSetting(project, pageName, settingName, defaultValue) {
			if (project.ident !== $rootScope.guiProjectIdent) {
				console.log("ERROR gui project ident, not same as requested " + project.ident + " $rootScope.guiProjectIdent=" + $rootScope.guiProjectIdent);
				return defaultValue;
			}
			return ($rootScope.gui[pageName] && $rootScope.gui[pageName][settingName]) || defaultValue;
		};

		/////////////////////////////////////////////////////////
		// News stuff

		if (!$scope.NormalNews) {
			var numNewNews = 0;
			// Format now's date
			var now = new Date();
			var nowStr = "" + now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate() + "T" +
				now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();

			// What was the last news we read, if any?
			var highestRead = kahuna.readSetting('news.highestItem', '');

			// Get urgent news
			$timeout(function () {
				try {
					KahunaData.queryMgmt('news', 'newsreader',
							{ filter : "news_type='U' and start_date < '" + nowStr + "' and end_date > '" + nowStr + "'" },
						function (data) {
							if (data.length) {
								for (var i = 0; i < data.length; i++) {
									data[i].start_date_formatted = data[i].start_date.substring(0, 4) + "-" + data[i].start_date.substring(5, 7) + "-" +
										data[i].start_date.substring(8, 10) + " " +
										data[i].start_date.substring(11, 13) + ":" + data[i].start_date.substring(14, 16) + ":" +
										data[i].start_date.substring(17, 19);
									data[i].trustedHtml = $sce.trustAsHtml(data[i].html);
									numNewNews++;
								}
							}
							if (data.length) {
								kahuna.putInScope('UrgentNews', data);
							}
							if (numNewNews) {
								kahuna.putInScope('newsNumNewItems', " (" + numNewNews + ")");
							}
						},
						function ignoreErrorsCallback(data, status, url) {
							$log.error("Ignoring " + JSON.stringify(data));
						}
					);
				}
				catch (e) {
					console.log("Error retrieving news: " + e);
				}
			}, 10000);

			// Get normal news
			$timeout(function () {
				try {
					KahunaData.queryMgmt('news', 'newsreader',
						{
							filter : "news_type='N' and start_date < '" + nowStr + "' and end_date > '" + nowStr + "'",
							pagesize : 5,
							order : "start_date desc"
						}, function (data) {
							var highestReadTmp = '';
							if (data.length) {
								for (var i = 0; i < data.length; i++) {
									data[i].start_date_formatted = data[i].start_date.substring(0, 4) + "-" +
										data[i].start_date.substring(5, 7) + "-" +
										data[i].start_date.substring(8, 10) + " " +
										data[i].start_date.substring(11, 13) + ":" +
										data[i].start_date.substring(14, 16) + ":" +
										data[i].start_date.substring(17, 19);
									data[i].trustedHtml = $sce.trustAsHtml(data[i].html);
									if (data[i].start_date > highestRead) {
										if (data[i].start_date > highestReadTmp) {
											highestReadTmp = data[i].start_date;
										}
										numNewNews++;
									}
								}
							}
							kahuna.putInScope('NormalNews', data);
							if (numNewNews) {
								kahuna.putInScope('newsNumNewItems', " (" + numNewNews + ")");
							}

							// And remember that we've read them
							kahuna.saveSetting('news.highestItem', highestReadTmp);
						},
						function ignoreErrorCallback(data, status, url) {
							$log.error("Ignoring " + JSON.stringify(data));
						}
					);
				}
				catch (e) {
					console.log("Error retrieving news: " + e);
				}
			}, 15000);
		}

		/////////////////////////////////////////////////////////
		// Latest changes

		$scope.data.numAudits = 20;
		$scope.data.showAudit = {};

		$scope.getAudits = function getAudits() {
			KahunaData.query('audits',
					{
						filter : "project_ident=" + $rootScope.currentProject.ident + " and nest_level=0",
						pagesize : $scope.data.numAudits,
						order : "ts desc"
					},
					function (data) {
						// Remove next_page link if present
						if (data.length > $scope.data.numAudits) {
							data.splice($scope.data.numAudits, 1);
						}
						_.each(data, function (d) {
							switch (d.action_type) {
							case 'R': d.action = 'Read'; break;
							case 'I': d.action = 'Insert'; break;
							case 'U': d.action = 'Update'; break;
							case 'D': d.action = 'Delete'; break;
							default: d.action = 'Unknown';
							}

							d.table_name = d.table_name.substring(6);
							switch (d.table_name) {
							case 'apiversions': d.nav_id = d.pk; break;
							case 'resources': d.nav_id = d.pk; break;
							}
						});
						kahuna.applyFunctionInScope($scope, function () {
							$scope.data.LatestAudits = data;
						});
					});
		};

		$scope.$watch("data.auditVisible", function (newValue, oldValue) {
			if (!newValue || oldValue) {
				return;
			}
			$scope.getAudits();
		});

		$scope.$watch("data.numAudits", function (newValue, oldValue) {
			if (!newValue || !$rootScope.currentProject) {
				return;
			}
			$scope.data.numAudits = newValue;
			$scope.getAudits();
		});

		$scope.flipAuditDetail = function flipAuditDetail(ident) {
			$scope.data.showAudit[ident] = !$scope.data.showAudit[ident];
			if ($scope.data.showAudit[ident]) {
				$('#auditDetailButton' + ident).html('Hide details');
			}
			else {
				$('#auditDetailButton' + ident).html('Show details');
			}
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
			// show: true,
			templateUrl:  'partials/login-dialog.html',
			controller: 'kahuna.home.LoginDialogController',
			resolve: {loginValues: function () { return $scope.loginValues; }}
		};

		$scope.showLogin = function showLogin() {

			var urlServer = kahuna.getURLParam('serverName');
			if (urlServer) {
				if (/#\/$/.test(urlServer)) {
					urlServer = urlServer.substring(0, urlServer.length - 2);
				}
			}
			var urlUserName = kahuna.getURLParam('userName');
			if (urlUserName) {
				if (/#\/$/.test(urlUserName)) {
					urlUserName = urlUserName.substring(0, urlUserName.length - 2);
				}
			}
			var urlApiKey = kahuna.getURLParam('apiKey');
			if (urlApiKey) {
				if (/#\/$/.test(urlApiKey)) {
					urlApiKey = urlApiKey.substring(0, urlApiKey.length - 2);
				}
			}
			if (urlServer && urlUserName && urlApiKey) {
				kahuna.setBaseUrl(urlServer);
				kahuna.setApiKey(urlApiKey);
				$rootScope.currentServer = urlServer;
				$rootScope.currentUserName = urlUserName;

				kahuna.saveSetting('login.lastServer', $scope.loginValues.serverName);
				kahuna.saveSetting('login.lastUsername', $scope.loginValues.userName);
				kahuna.saveSetting('login.showPassword', $scope.loginValues.showPassword);

				kahuna.home.fetchInitialData();
				return;
			}

			$modal.open($scope.loginDialogOpts);
		};

		if (!kahuna.serverUrl) {
			$scope.showLogin();
		}
		else {
			console.log('Fetching initial data from HomeCtrl ...');
			kahuna.home.fetchInitialData();
		}

		///////////////////////////////////////////////////////////////////////////////
		// Communication with other frames

		// We set this up so that the Getting Started Guide, which is in an iframe,
		// can message us when it wants to show a video.
		window.showPopupVideo = function showPopupVideo(url) {
			// The next two lines are required for Safari, otherwise the popup video fails horribly
			if (url.indexOf('?') > 0) {
				url = url.substring(0, url.indexOf('?'));
			}
			console.log('Popup video:' + url);
			$("#popupVideoLink").magnificPopup({
				items: {
					src: url,
					type: 'iframe',
					mainClass: 'mfp-fade',
					removalDelay: 160,
					preloader: false,
					fixedContentPos: false
				}
			});
			$("#popupVideoLink").click();
		};

		function msgListener(event) {
			if (!event.data) {
				return;
			}

			// Is it a request for a popup video?
			if (typeof(event.data) == "string" && event.data.match(/^https?:\/\/.*/)) {
				window.showPopupVideo(event.data);
				return;
			}

			if (event.data.action == 'getDemoLoginInfo') {
				var loginInfo = {
						username : "demo",
						password : "Pass" + "word1" // WTF? If it's not split in two, it gets stripped out at build time
					};
				// console.log('LOGGING IN 1');
				$http.post(kahuna.serverUrl + kahuna.globals.currentAccount.url_name + '/' + $rootScope.currentProject.url_name + '/v1/@authentication', loginInfo)
					.success(function (response) {
						var theUrl = kahuna.baseUrl;
						var extraParamIdx = theUrl.indexOf("?forceLogin");
						if (extraParamIdx > 0) {
							theUrl = theUrl.substring(0, extraParamIdx);
						}
						var message = {
								action: "setDemoLoginInfo",
								host: kahuna.topScope().liveBrowserUrl,
								userName: "demo",
								apiKey: response.apikey,
								adminHost: theUrl,
								adminUserName: "admin",
								adminApiKey: kahuna.globals.apiKeyValue,
						};
						var iframe = document.getElementById('liveBrowserIframe');
						iframe.contentWindow.postMessage(message, '*');
					}).error(function (data) {
						console.log('Logic Designer failed to get an API key for Live Browser as user demo');
					});

				return;
			}
		}

		if (window.addEventListener) {
			addEventListener("message", msgListener, false);
		}
		else {
			attachEvent("onmessage", msgListener);
		}
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// Login dialog

	LoginDialogController : function ($scope, $location, $rootScope, $http, $modalInstance, $timeout, Storage,
			KahunaData, loginValues, $modal) {

		// expects:
		//  auth.server
		//  auth.apikey
		//  auth.email
		//  auth.username
		//  auth.showPassword
		$scope.initAuth = function initAuth(auth) {
			kahuna.setBaseUrl(auth.server);
			kahuna.setApiKey(auth.apikey);

			$rootScope.userEmail = auth.email;
			$rootScope.currentServer = auth.server;
			$rootScope.currentUserName = auth.username;

			kahuna.saveSetting('login.lastServer', auth.server);
			kahuna.saveSetting('login.lastUsername', auth.username);
			kahuna.saveSetting('login.showPassword', auth.showPassword);

			return $http.get(auth.server + '/rest/abl/admin/v2/@tables', {
				headers: {
					'Authorization': 'Espresso ' + auth.apikey + ':1'}
				})
				.success(function (data) {
				// begin tracking
				if ( ! kahuna.noTracking && $rootScope.userEmail) {
					try { woopra.identify({ email: $rootScope.userEmail }); woopra.track(); } catch(e) { console.log('Woopra error: ' + e); }
				}

				// in case the login modal is open
				try { $modalInstance.close(); } catch (e) { /* Ignore */ }
				kahuna.home.fetchInitialData();
			});
		};

		$scope.sendAuthentication = function sendAuthentication(info) {
			var req = $http.post($scope.loginValues.serverName + '/rest/abl/admin/v2/@authentication', info)
			.success(function (response) {
				kahuna.setBaseUrl($scope.loginValues.serverName);
				kahuna.setApiKey(response.apikey);
				$rootScope.userEmail = response.email;
				$rootScope.currentServer = $scope.loginValues.serverName;
				$rootScope.currentUserName = $scope.loginValues.userName;

				kahuna.saveSetting('login.lastServer', $scope.loginValues.serverName);
				kahuna.saveSetting('login.lastUsername', $scope.loginValues.userName);
				kahuna.saveSetting('login.showPassword', $scope.loginValues.showPassword);

				if (!kahuna.noTracking && $rootScope.userEmail) {
					try {
						woopra.identify({ email: $rootScope.userEmail });
						woopra.track();
					}
					catch (e) {
						console.log('Woopra error: ' + e);
					}
				}

				try { $modalInstance.close(); } catch (e) { /* Ignore */ }

				kahuna.home.fetchInitialData();
				if ($scope.loginValues && $scope.loginValues.userName == 'sa') {
					$modal.open({
						template: "<div style='padding: 25px; font-size: 18px;'><h2>System Administration Login</h2><p>The only suggested use of the System Admin account is to upload a license:</p><a class='btn btn-primary' href='#/server' ng-click='close();'>Upload License</a></div>",
						keyboard: true,
						size: 'large',
						controller: function ($scope, $modalInstance) { $scope.close = function saModalClose() {$modalInstance.close();}; }
					});
				}
			})
			.error(function (data, status) {
				if (status == 401) {
					$scope.errorMessage = "Login failed: invalid user ID or password";
				}
				else {
					$scope.errorMessage = "Unable to connect to server";
					if (data && data.errorMessage) {
						$scope.errorMessage += " : " + data.errorMessage;
					}
				}
			});
			return req;
		};

		$scope.login = function (loginInfo) {
			$scope.errorMessage = null;
			var serverName = $scope.loginValues.serverName;
			if (serverName.charAt(serverName.length - 1) === '/') {
				$scope.loginValues.serverName = serverName.substring(0, serverName.length - 1);
			}

			if (angular.isUndefined(loginInfo)) {
				loginInfo = {
						username : $scope.loginValues.userName,
						password : $scope.loginValues.password
				};
			}

			return $scope.sendAuthentication(loginInfo).success(function (data) {
				var authSession = {
					apikey: data.apikey,
					expiration: data.expiration,
					username: $scope.loginValues.userName,
					email: data.email,
					server: kahuna.readSetting('login.lastServer'),
					showPassword: kahuna.readSetting('login.showPassword')
				};

				Storage.put('authSession', authSession);
			});
		};
		$scope.loginValues = loginValues;

		var serverUrl = kahuna.readSetting('login.lastServer', '');
		$scope.loginValues.userName = kahuna.readSetting('login.lastUsername');
		$scope.loginValues.showPassword = !!kahuna.readSetting('login.showPassword', false);

		$scope.serverAddressChanged = function () {
			function validateURL(url) {
				var parser = document.createElement('a');
				try {
					parser.href = url;
					return !!parser.hostname;
				}
				catch (ignoreEx) {
					return false;
				}
			}

			var url = $("#serverName").val();
			if ( ! validateURL(url)) {
				$scope.licensePreMsg = "";
				$scope.licenseMsg = "";
				return;
			}
			if ( ! /\/$/.test(url)) {
				url += "/";
			}
			var fullUrl = url + "rest/abl/admin/v2/@license";
			KahunaData.rawGet(fullUrl, function getLicenseCallback(data) {
				if (data.error) {
					console.log("Bad or no license: " + data.error);
					$scope.licensePreMsg = "License error: " + data.error;
					if ("no license has been installed" === data.error) {
						$scope.licenseMsg = "You need to enter a license to use this server.";
						alert('This server does not have a license installed. Please log in as user "sa" and add a license.');
					}
					else {
						$scope.licenseMsg = "This server will run in read-only mode until a valid license is entered.";
					}
				}
				else {
					$scope.license = data;
					$scope.licensePreMsg = "This server is licensed to: ";
					$scope.licenseMsg = data.company;
					if (data.organization) {
						$scope.licenseMsg += " (" + data.organization + ")";
					}
					if (data.location) {
						$scope.licenseMsg += " - " + data.location;
					}

					// If the server has not yet been set up, bypass authentication
					KahunaData.rawGet(url + "rest/abl/admin/v2/@login_info", function getLoginInfoCallback(loginData) {
						if (loginData.setup_required) {
							console.log("NO LOGIN REQUIRED");
							$scope.sendAuthentication({username:'sa', password:'foo'});
							$rootScope.initial_path = "/install";
						}
					});
				}
			}, function getLicenseErrorCallback() {
				$scope.licensePreMsg = "";
				$scope.licenseMsg = "";
			});
		};
		$timeout($scope.serverAddressChanged, 1000);

		// Was a server specified in the URL?
		var urlServer = kahuna.getURLParam('serverName');
		if (urlServer) {
			if (/#\/$/.test(urlServer)) {
				urlServer = urlServer.substring(0, urlServer.length - 2);
			}
			serverUrl = urlServer;
		}
		$scope.loginValues.serverName = serverUrl;

		if (!serverUrl) {
			// Server name was not found anywhere, default to this server
			$scope.loginValues.serverName = $location.protocol() + "://" + $location.host();
		}

		var urlUserName = kahuna.getURLParam('userName');
		if (urlUserName) {
			if (/#\/$/.test(urlUserName)) {
				urlUserName = urlUserName.substring(0, urlUserName.length - 2);
			}
			$scope.loginValues.userName = urlUserName;
		}

		// Try to put the cursor in the most appropriate input
		setTimeout(function () {
			if ( ! $scope.loginValues.serverName) {
				$("#serverName").focus();
			}
			else if ( ! $scope.loginValues.userName) {
				$("#userName").focus();
			}
			else {
				if ($scope.loginValues.showPassword) {
					$("#clearPassword").focus();
				}
				else {
					$("#password").focus();
				}
			}
		}, 400);

		// attempt auto-login
		var authSession = Storage.get('authSession');
		if (angular.isDefined(authSession) && authSession && authSession.email) {
			$scope.initAuth(authSession).success(function () {
				$rootScope.$emit('AutoLogin');
			});
		}
	},

	////////////////////////////////////////////////////////////////////////////////////////////
	// Controller for left nav bar

	NavCtrl: function ($scope, $location, $rootScope, $http) {
		$scope.learnContinue = function () {
			console.log('Lab finished: ' + $rootScope.navMaskStep);
			$rootScope.navMaskEnabled = false;
		};
	}
};
