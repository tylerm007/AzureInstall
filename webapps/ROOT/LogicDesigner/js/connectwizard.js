var kahuna;

kahuna.ConnectWizardController = function ConnectWizardController($scope, $rootScope, $modalInstance, $location, $timeout, KahunaData, jqueryUI, $http, WizardHandler) {
	"use strict";
	$scope.data = {};
	$scope.data.doneButtonHideCount = undefined;
	$scope.data.wizardSuccess = false;
	$scope.data.guidedTour = kahuna.readSetting('connect.firstTime', true);
	$scope.data.invertedGuidedTour = !$scope.data.guidedTour;
	$scope.data.jdbcCatalogTerm = "Catalog";
	$scope.data.jdbcSchemaTerm = "Schema";
	$scope.data.dropdownDbType = null;

	var strGeneric = 'Generic';
	$scope.strGeneric = strGeneric;

	$scope.buttonDisable = {
		done : false,
		close : false,
		back : false,
		test : false,
		testContinue : false
	};

	var home = angular.element('.navbar').scope().$parent;
	var currentAccount = home.currentAccount;
	var authProviderIdent = null;

	function dataReset(data) {
		data.special = null;
		data.dbtype = null;
		data.host = null;
		data.port = null;
		data.sid = null;
		data.prefix = null;
		data.catalog = null;
		data.schema = null;
		data.username = null;
		data.password = null;
		data.actual_password = null;
		data.url = null;
	}

	dataReset($scope.data);

	$scope.toggleGuidedTour = function toggleGuidedTour() {
		$scope.data.guidedTour = !$scope.data.guidedTour;
		$scope.data.invertedGuidedTour = !$scope.data.guidedTour;
	};

	var precreate = {
		demo : {
			dbtype : 'MySQL',
			host : 'db-004.d.espressologic.com',
			port : '3306',
			sid : null,
			prefix : 'demo',
			catalog : 'dbdev_demo',
			schema : null,
			username : 'dbdev_demo',
			password : 'Some Password',
			actual_password : 'kahuna_dev!'
		},
		sample : {
			dbtype : 'MySQL',
			host : 'db-004.d.espressologic.com',
			port : '3306',
			sid : null,
			prefix : 'sample',
			catalog : 'dbdev_sample',
			schema : null,
			username : 'dbdev_sample',
			password : 'Some Password',
			actual_password : 'kahuna_dev!'
		},
		northwind : {
			dbtype : 'SQLServer',
			host : 'db-003.d.espressologic.com',
			port : '1433',
			sid : null,
			prefix : 'nw',
			catalog : 'Northwind',
			schema : 'dbo',
			username : 'northwind',
			password : 'Some Password',
			actual_password : 'NorthwindPassword!'
		}
	};

	if (!kahuna.meta.dbaseTypes) {
		kahuna.fetchData('admin:dbasetypes', null, function (typedata) {
			kahuna.meta.dbaseTypes = typedata;
			kahuna.applyFunctionInScope($scope, function () {
				$scope.dbaseTypes = typedata;
			});
		});
	}
	else {
		$scope.dbaseTypes = kahuna.meta.dbaseTypes;
	}

	// Find an auth provider to use
	if (currentAccount) {
		kahuna.fetchData('admin:authproviders', {
				filter: "class_name = 'com.kahuna.server.auth.db.DefaultAuthProvider' and account_ident = " + currentAccount.ident,
				orderBy: 'ident'
			},
			function (authdata) {
				if (authdata.length) {
					authProviderIdent = authdata[0].ident;
				}
			}
		);
	}

	$scope.finishedWizard = function finishedWizard() {
		if ($scope.data.wizardSuccess) {
			$location.path("/");
		}
		$modalInstance.dismiss('cancel');
		if (!localStorage['eslo-ld-learn-restlab']) {
			$rootScope.$broadcast('dbWizardFinished');
		}
	};

	$scope.dbtypeSelected = function dbtypeSelected() {
		if ($scope.data.dropdownDbType) {
			$scope.setDbType($scope.data, $scope.data.dropdownDbType.name);
			$scope.data.url = $scope.data.dropdownDbType.url_prototype;
			$scope.data.jdbcCatalogTerm = $scope.data.dropdownDbType.catalog_term;
			if (!$scope.jdbcCatalogTerm) {
				$scope.data.catalog = null;
			}
			$scope.data.jdbcSchemaTerm = $scope.data.dropdownDbType.schema_term;
			if (!$scope.data.jdbcSchemaTerm) {
				$scope.data.schema = null;
			}
			if (/sqlserver/i.test($scope.data.dropdownDbType.url_prototype)) {
				$scope.data.schema = 'dbo';
			}
			$scope.data.prefix = 'main';
		}
	};

	$scope.backSelected = function backSelected() {
		WizardHandler.wizard("Connect Wizard").previous();
	};

	$scope.testAndProceed = function testAndProceed() {
		$scope.buttonDisable.close = true;
		$scope.buttonDisable.back = true;
		$scope.buttonDisable.test = true;
		$scope.buttonDisable.testContinue = true;
		$scope.testValues(function (success) {
			if (success) {
				var retry = false;
				do {
					// i, l missing on purpose
					var alpha = 'abcdefghjkmnopqrstuvwxyz';
					var name = "";
					for (var i = 0; i < 5; i += 1) {
						name += alpha[Math.floor(Math.random() * alpha.length)];
					}
					$scope.data.newProjectName = ($scope.data.catalog || $scope.data.schema || 'Project ') + "-" + name;
					$scope.data.newUrlFrag = name;

					for (var proj in kahuna.meta.AllProjects) {
						if (kahuna.meta.AllProjects.hasOwnProperty(proj)) {
							if ($scope.data.newProjectName === proj.name
									|| $scope.data.newUrlFrag === proj.url_name) {
								retry = true;
								break;
							}
						}
					}
				} while (retry);
				$scope.createNewProject();
			}
			else {
				$scope.buttonDisable.close = false;
				$scope.buttonDisable.back = false;
				$scope.buttonDisable.test = false;
				$scope.buttonDisable.testContinue = false;
			}
		});
	};

	$scope.controls = {};
	$scope.controls.successfullyCompleteWizard = function successfullyCompleteWizard() {
		$timeout(function () {
			$rootScope.$broadcast('ConnectWizardSuccess');
			$location.path('projects/' + $rootScope.currentProject.ident + '/restlab');
			$timeout(function () {
				$rootScope.$broadcast('InitialRestRequest');
			}, 500);
		}, 1500);
	};

	$scope.createNewProject = function createNewProject() {
		var newProject = {
			account_ident : currentAccount.ident,
			name : $scope.data.newProjectName,
			url_name : $scope.data.newUrlFrag,
			is_active: true,
			authprovider_ident: authProviderIdent,
		};
		KahunaData.create("AllProjects", newProject, function (projtxn) {
			var i, modObj;
			kahuna.meta.reset();
			var apiVersion = _.find(projtxn.txsummary, function (obj) {
					return obj['@metadata'].resource === 'admin:apiversions';
				}
			);
			for (i = 0; i < projtxn.txsummary.length; i += 1) {
				modObj = projtxn.txsummary[i];
				if (modObj["@metadata"].resource === "AllProjects" && modObj["@metadata"].verb === "INSERT") {
					var projectIdent = modObj.ident;
					KahunaData.query("AllProjects", {
						filter : "ident=" + projectIdent
					}, function (newprojdata) {
						var newproj = newprojdata[0];
						$rootScope.allProjects.push(newproj);
						$rootScope.currentProject = newproj;
						home.selectedProj = newproj;

						// Create the project options
						KahunaData.create('ProjectOptions', [
							{ project_ident: newproj.ident, projectoptiontype_ident: 13, option_value: "https://sites.google.com/a/espressologic.com/projects/northwind" },
						]);

						var password = ($scope.data.special && strGeneric !== $scope.data.special) ? $scope.data.actual_password : $scope.data.password;

						var newdb = {
							name : "Database: " + ($scope.data.catalog || $scope.data.schema || '') + " - " + $scope.data.username,
							url : $scope.data.url,
							user_name : $scope.data.username,
							password : password,
							prefix : $scope.data.prefix,
							catalog_name : $scope.data.catalog,
							schema_name : $scope.data.schema,
							active : true,
							project_ident : newproj.ident,
							dbasetype_ident : $scope.data.dbtype_ident,
							comments : 'Created using Connect Wizard'
						};

						KahunaData.create('DbSchemas', newdb, function (data) {
							// only show done button, when all meta data downloaded.

							var url = kahuna.baseUrl + '@database_test';
							var config = {
								cache : false,
								timeout : 60 * 1000,
								headers : {
									"Authorization" : "Espresso " + kahuna.globals.apiKeyValue + ":1"
								}
							};

							$scope.statusMessage = "Scanning Schema";

							var pollMs = 1000;
							var pollLimit = 10 * 60;
							var fetchMeta;

							function pollStatus() {
								$http.post(url, { statusRequest: projectIdent }, config).success(function (testResults, status) {
									var i, allComplete = true, msg;

									function getmsg(testResults, status) {
										if (testResults.status && 0 === testResults.status.indexOf("No message from server")) {
											return 'Connecting to server...';
										}
										else {
											return testResults.status;
										}
									}

									if (!Array.isArray(testResults)) {
										testResults = [ testResults ];
									}
									msg = '';
									for (i = 0; i < testResults.length; ++i) {
										var m = getmsg(testResults[i], status);
										if ('Scan complete' !== m) {
											allComplete = false;
										}
										if (0 != i) {
											msg += ', ';
										}
										msg += m;
									}

									kahuna.applyFunctionInScope($scope, function () { $scope.statusMessage = msg; });
									console.log(status);
									console.log(testResults);
									pollLimit -= 1;
									if (allComplete) {
										pollLimit = 0;
										if ($scope.data.special=== "northwind") {
											preCreateApiLogicSecurity(newproj, apiVersion);
										}
									}

									if (pollLimit > 0) {
										$timeout(pollStatus, pollMs);
									}
									else {
										// and then start asking for the meta data
										kahuna.applyFunctionInScope($scope, function () { $scope.statusMessage = "Fetching Schema"; });
										fetchMeta();
									}
								}).error(function (errorData, status) {
									console.log(status);
									console.log(errorData);
									$scope.data.doneButtonHideCount = 0;
									fetchMeta();
								});
							}

							var numsteps = 5;

							function stepComplete() {
								$scope.data.doneButtonHideCount -= 1;
								$scope.$digest();
								if (0 == $scope.data.doneButtonHideCount) {
									kahuna.setLiveBrowserUrl($rootScope, $scope.currentProject);

									$scope.data.tableCount = _.size(kahuna.meta.allTables);

									var childCount = 0;
									var columnCount = 0;
									for (var t in kahuna.meta.allTables) {
										t = kahuna.meta.allTables[t];
										columnCount += t.columns.length;
										if (t.hasOwnProperty('children')) {
											childCount += t.children.length;
										}
									}
									$scope.data.columnCount = columnCount;
									$scope.data.fkeyCount = childCount;

									$scope.data.viewCount = _.size(kahuna.meta.allViews);
									$scope.data.procCount = _.size(kahuna.meta.allProcedures);

									kahuna.problems.refreshProblems($rootScope, KahunaData);

									$scope.data.wizardSuccess = true;
								}
							}

							$scope.data.doneButtonHideCount = numsteps;

							fetchMeta = function fetchMeta() {
								kahuna.meta.getAllTables($scope.currentProject, stepComplete, stepComplete);
								kahuna.meta.getAllViews($scope.currentProject, stepComplete, stepComplete);
								kahuna.meta.getAllProcedures($scope.currentProject, stepComplete, stepComplete);
								kahuna.meta.getAllApiVersions($scope.currentProject, stepComplete, stepComplete);
								kahuna.meta.getAllResources($scope.currentProject, stepComplete, stepComplete);
							};

							kahuna.fetchData($scope.currentProject.Tables.href, null, function () {}, function () {});
							$timeout(pollStatus, pollMs);

							// successfully create a project, don't show first time version anymore
							kahuna.saveSetting('connect.firstTime', false);
							WizardHandler.wizard("Connect Wizard").next();
							$scope.buttonDisable.close = false;
						}, function errhandle() {
							$scope.buttonDisable.close = false;
							$scope.buttonDisable.back = false;
							$scope.buttonDisable.test = false;
							$scope.buttonDisable.testContinue = false;
						});

						// woopra('project_created');
						try { woopra.track('project_created'); } catch (e) { console.log('Woopra error: ' + e); }
					});
				}
			}
		});
	};

	/**
	 * Pre-create some custom resources, logic and security for Northwind,
	 * modified to act on new attributes such as Customers..balance.
	 *
	 * @param northwindProj is $rootScope.currentProject
	 */
	function preCreateApiLogicSecurity(northwindProj, apiVersion) {
		var newRules =
			[
				{
					entity_name: "nw:Customers",
					prop4: "javascript",
					rule_text1: "return row.Balance <= row.CreditLimit;",
					rule_text2: "Transaction cannot be completed - Balance ({Balance|#,##0.00}) exceeds Credit Limit ({CreditLimit|#,##0.00})",
					name: "",
					auto_name: "Validation if (row.CreditLimit !== null ) {            // row is a Customer\n    if (row.Balance > row.CreditLimit) {\n        return false;         ...",
					comments: "Observe Error message insertion points {}",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 5
				},
				{
					entity_name: "nw:Customers",
					attribute_name: "Balance",
					rule_text1: "OrdersList",
					rule_text2: "null === ShippedDate",
					rule_text3: "AmountTotal",
					name: "adjust the balance to be the sum(OrdersList.AmountTotal) for unshipped orders",
					auto_name: "Derive Balance as sum(OrdersList.AmountTotal) where null === ShippedDate",
					comments: "Adjusts Balance by *reacting* to changes in OrdersList.AmountTotal,\nincluding other changes noted in Table/Column help.",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 1
				},
				{
					entity_name: "nw:OrderDetails",
					prop4: "javascript",
					attribute_name: "Amount",
					rule_text1: "var amount = row.Quantity * row.UnitPrice;  // row is the OrderDetails row\nif (row.Quantity !== 0) {\n    amount = amount * (100 - 100*row.Discount) / 100;\n}\nreturn amount;\n",
					name: "Amount as Quantity * UnitPrice -- (JavaScript snippet)",
					auto_name: "Derive Amount as var amount = row.Quantity * row.UnitPrice;  // row is the OrderDetails row\nif (row.Quantity !== 0) {\n    amount = amount * (100 - ...",
					comments: "JavaScript is used to express logic,\nproviding access to libraries for date arithmetic (etc.), or your own.\nReactive logic recomputes Amount in response to changes Quantity, Price (and, per logic chaining, the ProductId)",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 3
				},
				{
					entity_name: "nw:OrderDetails",
					attribute_name: "UnitPrice",
					rule_text1: "FK_Order_Details_Products",
					rule_text2: "UnitPrice",
					name: "copy price from product, unaffected by price changes",
					auto_name: "Derive UnitPrice as parentcopy(FK_Order_Details_Products.UnitPrice)",
					comments: "Obtain the price from the product.\nCopy means subsequent changes to Products.UnitPrice do not affect existing OrderDetails.\n  You could also use a formula for row.Products.UnitPrice if you *do* want to cascade changes.\n\nYou can change the Rule name (at the top) to be more friendly, or specify a more suitable Foreign Key name, such as Product__OrderDetails.",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 4
				},
				{
					entity_name: "nw:Orders",
					prop4: "javascript",
					rule_text1: "log.debug(\"audit begin\");\nvar mongoClient = MongoUtilityCreate();\nvar configSetup = {\n   serverName  : '23.100.38.40',\n   serverPort  : '27017' ,\n   databaseName: 'Audit'\n}\nmongoClient.configure(configSetup);\n//opitional\nvar payload = {\n    username: \"\",\n    password: \"\"\n};\nmongoClient.createClientConnection(payload);\nvar auditrow = {};\nauditrow.CompanyName = row.FK_Orders_Customers.CompanyName;\nauditrow.OrderNumber = row.OrderID;\nauditrow.CustomerID = row.CustomerID;\nauditrow.ShipPostalCode = row.ShipPostalCode;\nauditrow.date = JSON.stringify(new Date());\nvar resp = mongoClient.mongoInsert(\"audit\",\"EspressoAudit\",auditrow);\nlog.debug(JSON.stringify(resp,null,2));\nmongoClient.close();\n",
					name: "Audit row to MongoDB",
					auto_name: "Event: log.debug(\"audit begin\");\nvar mongoClient = MongoUtilityCreate();\nvar configSetup = {\n   serverName  : '23.100.38.40',\n   serverPort  : '270...",
					verbs: "INSERT,UPDATE,",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 7
				},
				{
					entity_name: "nw:Orders",
					attribute_name: "AmountTotal",
					rule_text1: "OrderDetailsList",
					rule_text3: "Amount",
					name: "",
					auto_name: "Derive AmountTotal as sum(OrderDetailsList.Amount)",
					comments: "Adjust the AmountTotal to be the sum(OrderDetailsList.Amount)\nObserve how simple rules chain to solve complex, multi-table transactions.",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 1
				}
			];

		var apiVersionIdent = apiVersion.ident;
		var newResources =
			[
				{
					resource_type_ident: 1,
					prefix: "nw",
					table_name: "Customers",
					name: "CustomersBusObject",
					description: "Customers with orders - note Attribute alias",
					is_collection: "Y",
					sorting: "CompanyName asc",
					apiversion_ident: apiVersionIdent,
					Attributes:
						[
							{
								name: "ID",
								column_name: "CustomerID"
							},
							{
								name: "Balance",
								column_name: "Balance"
							}
						]
				},
				{
					resource_type_ident: 1,
					prefix: "nw",
					table_name: "Orders",
					name: "Orders",
					join_condition: "CustomerID = [CustomerID]",
					description: "Orders for customer",
					is_collection: "Y",
					sorting: "OrderDate asc",
					apiversion_ident: apiVersionIdent,
					Attributes:
						[
							{
								name: "Total",
								column_name: "AmountTotal"
							},
							{
								name: "Date",
								column_name: "OrderDate"
							}
						]
				},
			];

		var newUsers =
			[
				{
					name: "region",
					fullname: "User with specified region",
					status: "A",
					roles: "Authorized per region",
					data: "UserRegion=OR",
					password_hash: "ymw8M9MOrz2jwjZGiu8T7IUOv5NAtxthu/CNUWRWltELTgbGY1bJ/MWdjrzIrkUpHlXMP+qmBJc84q1BtoTzpg==",
					password_salt: "zXFH3Uwdim9r3YGzl8NhnQa1CUdgkLx5/fT98w6u",
					project_ident: northwindProj.ident,
				}
			];

		var newApiKeys =
			[
				{
					name: "Region Customers",
					description: "Use this key in the REST Lab, and observe that Customers returns fewer rows.\n\nThis is due to the defined Role, which uses the Global variable defined on the Details tab.",
					apikey: "RegCusts",
					status: "A",
					logging: "*=FINE",
					data: "UserRegion=OR",
					project_ident: northwindProj.ident
				}
			];

		var newRoles =
			[
				{
					name: "Authorized per region",
					description: "Click the Permissions tab.",
					default_permission: "A",
					default_apivisibility: "TVRPM",
					project_ident: northwindProj.ident,
					ApiKeyRoles:
						[
							{
								apikey_ident: -1, // fixed up after ApiKeys saved    FIXME failed
							}
						],
					TablePermissions:       // FIXME did not get loaded
						[
							{
								name: "My Regions Customer",
								description: "Illustrates row-level security - see only customers in 'my' UserRegion.\n\nUserRegion defined in the APIKey (for this example), or Users (in normal cases)",
								entity_name: "nw:Customers",
								predicate: "Region = '@{UserRegion}'",
								access_type: "A"
							}
						]
				}
			];

		KahunaData.create('admin:rules', newRules,
			function (data) {
			},
			function (e) {
				console.log("ERROR inserting admin:rules: " + e);
			}
		);

		KahunaData.create('admin:project_libraries', { logic_library_ident: 508, project_ident: northwindProj.ident },
			function (data) {
			},
			function (e) {
				console.log("ERROR inserting admin:project_libraries: " + e);
			}
		);

		KahunaData.create('admin:users', newUsers,
			function (data) {
			},
			function (e) {
				console.log("ERROR inserting admin:users: " + e);
			}
		);

		KahunaData.create('admin:apikeys', newApiKeys,
			function (data) {
				newRoles[0].ApiKeyRoles[0].apikey_ident = _.find(data.txsummary, function (d) {
						return d['@metadata'].resource == 'admin:apikeys' && d.name === 'Region Customers';
					}).ident;

				KahunaData.create("RolesWithLinks", newRoles, function(data2) {
					console.log('Roles with links added');
				},
				function (e) {
					console.log("ERROR inserting admin:roles: " + e);
				});

				// var resMap = {};
				// _.each(data.txsummary, function(r) {
				//         if (r['@metadata'].resource == "admin:apikeys") {
				//             resMap[r.name] = r;
				//         }
				//     }
				// );
				// var apikey_ident = resMap["Region Customers"].ident;
				// newRoles[0].ApiKeyRoles[0].apikey_ident = resMap["Region Customers"].ident;
				console.log("DEBUG fixing newRoles[0].ApiKeyRoles[0].apikey_ident = " + newRoles[0].ApiKeyRoles[0].apikey_ident);
			},
			function (e) {
				console.log("ERROR inserting ApiKeys: " + e);
			}
		);

		// Note: inserting resources is complicated because we have to first insert them
		// then connect them together.
		KahunaData.create("AllResources", newResources,
			function(data) {
				var resMap = {};
				_.each(data.txsummary,
					function (r) {
						if (r['@metadata'].resource === "AllResources") {
							resMap[r.name] = r;
						}
					}
				);
				var toSave = [];
				resMap["Orders"].root_ident = resMap["CustomersBusObject"].ident;
				resMap["Orders"].container_ident = resMap["CustomersBusObject"].ident;
				toSave.push(resMap["Orders"]);
				KahunaData.update(toSave,
					function (data2) {
						console.log("Resources updated");
					},
					function(e) {
						console.log("ERROR updating resources: " + e);
					}
				);
			},
			function(e) {
				console.log("ERROR inserting resources: " + e);
			}
		);
	}

	$scope.testOnly = function testOnly() {
		$scope.buttonDisable.close = true;
		$scope.buttonDisable.back = true;
		$scope.buttonDisable.test = true;
		$scope.buttonDisable.testContinue = true;
		$scope.testValues(function (success) {
			$scope.buttonDisable.test = false;
			$scope.buttonDisable.testContinue = false;
			$scope.buttonDisable.close = false;
			$scope.buttonDisable.back = false;
		});
	};

	// optional fun is called with true/false depending on success
	$scope.testValues = function testValues(fun) {
		$scope.data.testInProgress = "Testing connection...";
		$scope.data.latencyMilliseconds = undefined;
		$scope.data.latencyColorCode = undefined;
		$scope.data.latencySummary = undefined;
		if (strGeneric !== $scope.data.special) {
			$scope.data.url = null;
		}
		var password = ($scope.data.special && strGeneric !== $scope.data.special) ? $scope.data.actual_password : $scope.data.password;
		var dbinfo = {
			special : $scope.data.special,
			dbtype : $scope.data.dbtype,
			host : $scope.data.host,
			port : $scope.data.port,
			sid : $scope.data.sid,
			prefix : $scope.data.prefix,
			catalog : $scope.data.catalog,
			schema : $scope.data.schema,
			username : $scope.data.username,
			password : password,
			url : $scope.data.url
		};
		var config = {
			cache : false,
			timeout : 60 * 1000,
			headers : {
				"Authorization" : "Espresso " + kahuna.globals.apiKeyValue + ":1"
			}
		};

		// remove beta labels from the dbtype
		if (dbinfo && dbinfo.dbtype.match(/\(beta\)/)) {
			dbinfo.dbtype = dbinfo.dbtype.replace(' \(beta\)', '');
		}

		var url = kahuna.baseUrl + '@database_test';
		return $http.post(url, dbinfo, config).success(function (data, status) {
			$scope.data.testResults = { data : data, status : status };
			if (strGeneric !== $scope.data.special) {
				$scope.data.url = data.url;
			}
			if (data.errorMessage) {
				$scope.data.testInProgress = data.errorMessage;
				fun && fun(false);
			}
			else {
				$scope.data.testInProgress = 'Success: ' + data.productName + ' ' + data.productVersion;
				$scope.data.latencyMilliseconds = data.latencyMilliseconds;
				$scope.data.latencySummary = data.latencySummary;
				$scope.data.latencyColorCode = data.latencyColorCode;
				fun && fun(true);
			}

			// all tests, even failed tests return success (at the http level)
			console.log(status);
			console.log(data);
		}).error(function (data, status) {
			$scope.data.testResults = { data : data, status : status };
			fun && fun(false);
			data = data || 'Request failed';
			$scope.data.testInProgress = 'Request failed ' + status;
			console.log(data);
			console.log(status);
		});
	};

	$scope.setDbType = function setDbType(data, typeString) {
		var i, len, typeList = $scope.dbaseTypes;
		for (i = 0, len = typeList.length; i < len; i += 1) {
			if (typeString === typeList[i].name) {
				data.dbtype = typeString;
				data.dbtype_ident = typeList[i].ident;
				data.dbdescription = typeList[i].description;
				data.url = typeList[i].url_prototype;
				if (/sqlserver/i.test(typeList[i].url_prototype)) {
					$scope.data.schema = 'dbo';
				}
				break;
			}
		}
	};

	$scope.precreateDemoMySQL = function precreateDemoMySQL() {
		dataReset($scope.data);
		$scope.data.special = 'demo';
		$scope.setDbType($scope.data, precreate.demo.dbtype);
		$scope.data.host = precreate.demo.host;
		$scope.data.port = precreate.demo.port;
		$scope.data.sid = precreate.demo.sid;
		$scope.data.prefix = precreate.demo.prefix;
		$scope.data.catalog = precreate.demo.catalog;
		$scope.data.schema = precreate.demo.schema;
		$scope.data.username = precreate.demo.username;
		$scope.data.password = precreate.demo.password;
		$scope.data.actual_password = precreate.demo.actual_password;
	};

	$scope.precreateSampleMySQL = function precreateSampleMySQL() {
		dataReset($scope.data);
		$scope.data.special = 'sample';
		$scope.setDbType($scope.data, precreate.sample.dbtype);
		$scope.data.host = precreate.sample.host;
		$scope.data.port = precreate.sample.port;
		$scope.data.sid = precreate.sample.sid;
		$scope.data.prefix = precreate.sample.prefix;
		$scope.data.catalog = precreate.sample.catalog;
		$scope.data.schema = precreate.sample.schema;
		$scope.data.username = precreate.sample.username;
		$scope.data.password = precreate.sample.password;
		$scope.data.actual_password = precreate.sample.actual_password;
	};

	$scope.precreateNorthwindSQLServer = function precreateNorthwindSQLServer() {
		dataReset($scope.data);
		$scope.data.special = 'northwind';
		$scope.setDbType($scope.data, precreate.northwind.dbtype);
		$scope.data.host = precreate.northwind.host;
		$scope.data.port = precreate.northwind.port;
		$scope.data.sid = precreate.northwind.sid;
		$scope.data.prefix = precreate.northwind.prefix;
		$scope.data.catalog = precreate.northwind.catalog;
		$scope.data.schema = precreate.northwind.schema;
		$scope.data.username = precreate.northwind.username;
		$scope.data.password = precreate.northwind.password;
		$scope.data.actual_password = precreate.northwind.actual_password;
	};

	$scope.createMySQL = function createMySQL() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'MySQL');
		$scope.data.port = '3306';
	};

	$scope.createOracle = function createOracle() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'Oracle');
		$scope.data.sid = 'ORCL';
		$scope.data.port = '1521';
	};

	$scope.createSQLServer = function createSQLServer() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'SQLServer');
		$scope.data.port = '1433';
		$scope.data.schema = 'dbo';
	};

	$scope.createAzureSQL = function createAzureSQL() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'AzureSQL');
		$scope.data.port = '1433';
	};

	$scope.createNuoDBSQL = function createNuoDBSQL() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'NuoDB (beta)');
		$scope.data.port = '48004';
	};

	$scope.createPostgreSQL = function createPostgreSQL() {
		console.log('PostgreSQL was selected');
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'PostgreSQL');
		$scope.data.port = '5432';
	};

	$scope.createVerticaSQL = function createVerticaSQL() {
		console.log('Vertica Database was selected');
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'Vertica Database');
		$scope.data.port = '5433';
	};

	$scope.createGenericJdbc = function createGenericJdbc() {
		dataReset($scope.data);
		$scope.data.special = strGeneric;
		$scope.setDbType($scope.data, 'MySQL');
	};

	$scope.params = {
		//isValidUsername
		//isValidPassword
		//isConnecting -> for catalogs
		//isPortReachable
		//isUnconnected -> the $scope.testValue(func (status)) status value
		//isHostReachable
	};

	$scope.$watch('data.username', function (current) {
		if (!current) {
			$scope.params.isValidUsername = false;
		}
		else {
			$scope.params.isValidUsername = true;
		}
	});
	$scope.$watch('data.catalog', function (current) {
		if (!current) {
			$scope.params.isConnecting = false;
		}
	});
	$scope.$watch('data.password', function (current) {
		if (!current) {
			$scope.params.isValidPassword = false;
		}
		else {
			$scope.params.isValidPassword = true;
		}
	});

	function isUrl(str) {
		var regexp = /(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
		return regexp.test(str) && str.length > 2;
	}

	$scope.checkReachability = function checkReachability(url, port) {
		var reachabilityCount = angular.copy(++$scope.params.reachabilityCount);
		var script = document.body.appendChild(document.createElement("script"));
		var baseUrl = url.split('/')[0];
		var successfulLoad = false;
		script.onload = function onload() {
			if (reachabilityCount < $scope.params.reachabilityCount) {
				return;
			}
			$scope.$apply(function () {
				successfulLoad = true;
				$scope.params.isHostReachable = true;
				if (port) {
					$scope.params.isPortReachable = true;
				}
			});
		};
		script.onerror = function onerror(error) {
			if (reachabilityCount < $scope.params.reachabilityCount) {
				return;
			}
			$scope.$apply(function () {
				$scope.params.isHostReachable = false;
				successfulLoad = false;
				if (port) {
					$scope.params.isPortReachable = false;
				}
			});
		};
		setTimeout(function () {
			if (reachabilityCount < $scope.params.reachabilityCount) {
				return;
			}
			$scope.$apply(function () {
				if (!successfulLoad) {
					$scope.params.isHostReachable = false;
					if (port) {
						$scope.params.isPortReachable = false;
					}
				}
			});
		}, 2000);

		if (port) {
			script.src = 'http://' + baseUrl + ':' + port;
		}
		else {
			script.src = 'http://' + baseUrl;
		}
	};
	$scope.params.reachabilityCount = 0;

	$scope.checkConnectivity = function checkConnectivity(dbData) {
		$scope.testValues(function (success) {
			if (success) {
				$scope.params.isConnecting = true;
				$scope.params.isValidUsername = true;
				$scope.params.isValidPassword = true;
				$scope.params.isPortReachable = true;
				$scope.params.isHostReachable = true;

				// remove any "unconnected" warning
				$scope.params.isUnconnected = false;
			}
			else {
				$scope.params.isUnconnected = true;
			}
		})['error'](function () {
			//did not connect to the backend
		});
	};

	$scope.$watch('params.isUrl', function (current) {
		if (!current) {
			$scope.params.isHostReachable = undefined;
		}
	});

	//$scope.params.isRea
	$scope.$watch('data.host', function (current) {
		if (current) {
			//$scope.is
			$scope.params.isUrl = isUrl(current);
		}
	});

	$scope.hasBeenFocused = {};
	$scope.hasBeenFocused.host = false;
	$scope.hasBeenFocused.port = false;
	$scope.hasBeenFocused.username = false;
	$scope.hasBeenFocused.password = false;
	$scope.hasBeenFocused.catalog = false;
	$scope.hasBeenFocused.database = false;
};
