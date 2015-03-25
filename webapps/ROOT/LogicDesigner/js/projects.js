kahuna.project = {

	ProjectCtrl : function ($rootScope, $scope, $http, $resource, $routeParams,
			$location, $modal, $log, $timeout, $route, $q,
			KahunaData, Project, Delta, Notices) {
		"use strict";
		$rootScope.currentPage = 'projects';
		$rootScope.currentPageHelp = 'docs/logic-designer/project';
		$rootScope.helpDialog('project', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.data = {};
		$scope.data.currentAuthType = undefined;
		$scope.data.currentAuthProvider = undefined;
		$scope.data.authTypes = [];
		$scope.data.authProviders = [];

		$scope.selectedProj = angular.copy($scope.currentProject);

		$('.ResizableTd').resizable({
			handles : 'e',
			minWidth : 40
		});

		//take snapshots
		$scope.$on('$viewContentLoaded', function () {
			Delta.put($scope)
				.snapshot('selectedProj')
				.snapshot('projectOptionValues');
		});
		$rootScope.$on('$locationChangeStart', function (event, next, current) {
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review()
					.then(function () {
						//resume navigation
						$location.path(path);
					})['catch'](function () {
						Delta.reviewed = false;
						Notices.confirmUnsaved().then(function (save) {
							if (save) {
								Delta.scope.saveProject();
								Delta.scope.saveProjectOptions();
							}
							$location.path(path);
						});
					});
			}
		});

		$scope.showOptions = function showOptions() {
			if ($scope.selectedProj) {
				KahunaData.query('ProjectOptions', {
					pagesize : 100,
					filter : "project_ident=" + $scope.selectedProj.ident
				}, function (data) {
					$scope.projectOptions = {};
					$scope.projectOptionValues = {};
					for (var i = 0; i < data.length; i++) {
						$scope.projectOptions[data[i].projectoptiontype_ident] = data[i];
						$scope.projectOptionValues[data[i].projectoptiontype_ident] = data[i].option_value;
					}
				});
			}
		};
		$scope.showOptions();

		if (!kahuna.meta.projectOptionTypes || kahuna.meta.projectOptionTypes.length === 0) {
			KahunaData.query('admin:projectoptiontypes', {
				pagesize : 100
			}, function (data) {
				kahuna.meta.projectOptionTypes = data;
				kahuna.meta.projectOptionTypeEnums = {};
				for (var i = 0; i < kahuna.meta.projectOptionTypes.length; i++) {
					var optType = kahuna.meta.projectOptionTypes[i];
					if (optType.data_type == 'enum') {
						if ( ! optType.valid_values)
							alert('Project option type ' + optType.ident + ' is an enum but does not have valid_values');
						else
							kahuna.meta.projectOptionTypeEnums[optType.ident] = optType.valid_values.split(',');
					}
				}
				$scope.optionTypes = data;
				$scope.optionTypeEnums = kahuna.meta.projectOptionTypeEnums;
			});
		}
		else {
			$scope.optionTypes = kahuna.meta.projectOptionTypes;
			$scope.optionTypeEnums = kahuna.meta.projectOptionTypeEnums;
		}

		$scope.createProject = function createProject() {
			var newProjectName = 'New project';
			var newUrlName = 'newProj';
			if ($rootScope.allProjects) {
				for (var i = 1; i < 10000; i++) {
					newProjectName = 'New project ' + i;
					newUrlName = 'newProj' + i;
					for ( var projIdent in $rootScope.allProjects) {
						if ($rootScope.allProjects[projIdent].name === newProjectName || $rootScope.allProjects[projIdent].url_name === newUrlName) {
							newProjectName = null;
							break;
						}
					}
					if (newProjectName != null)
						break;
				}
			}

			var newProject = {
				account_ident: $rootScope.currentAccount.ident,
				name: newProjectName,
				url_name: newUrlName,
				is_active: true
			};
			KahunaData.create("AllProjects", newProject, function (data) {
				kahuna.meta.reset();
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === "AllProjects" && modObj['@metadata'].verb === 'INSERT') {
						// TODO - this is not really right, but do it for now.
						modObj.Tables = { href : kahuna.baseUrl + "@tables?projectId=" + modObj.ident };
						modObj.Views = { href : kahuna.baseUrl + "@views?projectId=" + modObj.ident };
						modObj.Procedures = { href : kahuna.baseUrl + "@procedures?projectId=" + modObj.ident };
						modObj.Resources = { href : kahuna.baseUrl + "@resources?projectId=" + modObj.ident };
						$rootScope.allProjects.push(modObj);
						$rootScope.currentProject = modObj;
						// kahuna.putInScope('currentProject', modObj);
						$scope.selectedProj = modObj;
						if (kahuna.restlab) {
							kahuna.restlab.history = [];
						}
						break;
					}
				}
				$scope.showOptions();
			});
			kahuna.logEvalProgress("created project", $rootScope.allProjects.length);
		};

		$scope.deleteProject = function deleteProject() {
			Project.destroy($scope.currentProject);
			return;
		};

		$scope.saveProject = function saveProject() {
			Delta.reset();
			KahunaData.update($scope.selectedProj, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'AllProjects' && modObj.ident === $scope.selectedProj.ident) {
						// TODO - this is not realladdy right, but do it for now.
						modObj.Tables = { href : kahuna.baseUrl + "@tables?projectId=" + modObj.ident };
						modObj.Views = { href : kahuna.baseUrl + "@views?projectId=" + modObj.ident };
						modObj.Procedures = { href : kahuna.baseUrl + "@procedures?projectId=" + modObj.ident };
						modObj.Resources = { href : kahuna.baseUrl + "@resources?projectId=" + modObj.ident };
						var idx = -1;
						for (var i = 0; i < $rootScope.allProjects.length; i++) {
							if ($rootScope.allProjects[i].ident === $scope.selectedProj.ident) {
								idx = i;
								break;
							}
						}
						$rootScope.allProjects[idx] = modObj;
						$rootScope.currentProject = modObj;
						$scope.selectedProj = modObj;
					}
				}
				kahuna.applyFunctionInScope($scope, function () {
					kahuna.setLiveBrowserUrl($rootScope, $scope.selectedProj);
				});
				kahuna.util.info('Project was saved');
			});
		};

		$scope.exportProject = function exportProject() {
			var iframe = document.getElementById("downloadIframe");
			iframe.src = kahuna.baseUrl + "ProjectExport/" + $scope.selectedProj.ident + "?auth=" + kahuna.globals.apiKeyValue + ":1&downloadName="
					+ $scope.selectedProj.name + ".json&pagesize=1000";
			return false;
		};

		$scope.upcaseName = function upcaseName(arg) {
			return arg.name.toUpperCase();
		};

		// $scope.projectSelected = function projectSelected() {
		//   fetchProjLibs();
		//   $scope.showOptions();
		// };

		if ($routeParams.action === 'create') {
			$scope.createProject();
		}

		$scope.saveProjectOptions = function saveProjectOptions() {
			Delta.reset();
			var i;
			for (i = 0; i < kahuna.meta.projectOptionTypes.length; i++) {
				var optType = kahuna.meta.projectOptionTypes[i];
				if ($scope.projectOptions[optType.ident]) {
					$scope.projectOptions[optType.ident].option_value = $scope.projectOptionValues[optType.ident];
					delete $scope.projectOptions[optType.ident].ProjectOptionTypes;
					(function () {
						var optTypeSave = optType;
						KahunaData.update($scope.projectOptions[optType.ident], function (data) {
							if (data.txsummary.length > 0) {
								if ($scope.$$phase)
									$scope.projectOptions[optTypeSave.ident] = data.txsummary[0];
								else {
									$scope.$apply(function () {
										$scope.projectOptions[optTypeSave.ident] = data.txsummary[0];
									});
								}
								kahuna.util.info('Option ' + optTypeSave.name + ' was saved');
							}
						});
					})();
				}
				else {
					var newOpt = {
						option_value : $scope.projectOptionValues[optType.ident],
						project_ident : $scope.selectedProj.ident,
						projectoptiontype_ident : optType.ident
					};
					(function () {
						var optTypeSave = optType;
						KahunaData.create('admin:projectoptions', newOpt, function (data) {
							// $scope.projectOptions[optTypeSave.ident] = data.txsummary[0];

							if ($scope.$$phase)
								$scope.projectOptions[optTypeSave.ident] = data.txsummary[0];
							else {
								$scope.$apply(function () {
									$scope.projectOptions[optTypeSave.ident] = data.txsummary[0];
								});
							}
							kahuna.util.info('Option ' + optTypeSave.name + ' was created');
						});
					})();
				}
			}
		};

		$scope.verifyProject = function verifyProject() {
			$scope.selectedProj.status = 'V';
			KahunaData.update($scope.selectedProj, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'AllProjects' && modObj.ident === $scope.selectedProj.ident) {
						// TODO this is not really right, but we'll leave for now.
						modObj.Tables = { href : kahuna.baseUrl + "@tables?projectId=" + modObj.ident };
						modObj.Views = { href : kahuna.baseUrl + "@views?projectId=" + modObj.ident };
						modObj.Procedures = { href : kahuna.baseUrl + "@procedures?projectId=" + modObj.ident };
						modObj.Resources = { href : kahuna.baseUrl + "@resources?projectId=" + modObj.ident };
						$scope.selectedProj = modObj;
						$rootScope.currentProject = modObj;
						kahuna.util.replaceInArray($rootScope.allProjects, modObj);
						continue;
					}
					if (modObj['@metadata'].resource != "admin:projectproblems")
						continue;
					if (modObj.status === 'O') { // New problem
						$rootScope.problems[modObj.ident] = modObj;
					}
					else if (modObj.status === 'C') { // Problem was closed
						delete $rootScope.problems[modObj.ident];
					}
				}
				var problemCount = 0;
				for ( var idx in $rootScope.problems) {
					if ($rootScope.problems.hasOwnProperty(idx))
						problemCount++;
				}
				if (problemCount === 0) {
					$rootScope.problemCount = null;
					kahuna.util.info('No problem detected in this project.');
				}
				else {
					$rootScope.problemCount = problemCount;
					kahuna.util.warning('One or more problem was detected in this project.');
				}
			});
		};

		// Libraries
		KahunaData.query('Libraries', {
			pagesize : 100,
			filter : "system_only=false and account_ident is null",
			order : "name"
		}, function (data) {
			$scope.data.libs = data;
		});

		// Wait until a project has been selected before retrieving the list of libraries for that account
		$scope.$watch('selectedProj', function () {
			if ( ! $scope.selectedProj)
				return;
			KahunaData.query('admin:logic_libraries', {
				pagesize : 100,
				filter : "system_only=false and account_ident=" + $scope.selectedProj.account_ident,
				order : "name"
			}, function (data) {
				$scope.data.acctlibs = data;
			});
		});

		function fetchProjLibs() {
			$scope.data.usedLibs = {};
			if (!$scope.selectedProj)
				return;
			KahunaData.query('admin:project_libraries', {
				pagesize : 100,
				filter : "project_ident=" + $scope.selectedProj.ident
			}, function (data) {
				$scope.data.oldLibs = {};
				var i;
				for (i = 0; i < data.length; i++) {
					$scope.data.usedLibs[data[i].logic_library_ident] = true;
					$scope.data.oldLibs[data[i].logic_library_ident] = data[i];
				}
			});
		}

		fetchProjLibs();

		$scope.createLib = function createLib() {
			$scope.data.action = "insert";
			$scope.data.library = {
				name: "New library",
				group_name: "newlib",
				lib_name: "newlib",
				version: "1.0",
				description: "This is a library",
				doc_url: "",
				ref_url: "",
				system_only: false,
				logic_type: "javascript",
				account_ident: $scope.selectedProj.account_ident
			};
			var dialogOpts = {
					backdrop: 'static',
					keyboard: true, // Can close with escape
					templateUrl:  'partials/library-editor.html',
					controller: 'kahuna.project.LibraryEditController',
					resolve: {
						library : function () { return $scope.data.library; },
						action: function () { return $scope.data.action; },
						callback: function () { return function (lib) {
							kahuna.applyFunctionInScope($scope, function () {
								$scope.data.library = null;
								$scope.data.acctlibs.push(lib);
							});
						};}
					}
				};
				$modal.open(dialogOpts);
		};

		$scope.editLib = function editLib(lib) {
			$scope.data.action = "update";
			$scope.data.library = lib;
			var dialogOpts = {
					backdrop: 'static',
					keyboard: true, // Can close with escape
					templateUrl:  'partials/library-editor.html',
					controller: 'kahuna.project.LibraryEditController',
					resolve: {
						library : function () { return $scope.data.library; },
						action: function () { return $scope.data.action; },
						callback: function () { return function (editedLib) {
							kahuna.applyFunctionInScope($scope, function () {
								$scope.data.library = null;
								for (var i = 0; i < $scope.data.acctlibs.length; i++) {
									if ($scope.data.acctlibs[i]['@metadata'].href === editedLib['@metadata'].href) {
										$scope.data.acctlibs[i] = editedLib;
										break;
									}
								}
							});
						};}
					}
				};
				$modal.open(dialogOpts);
		};

		$scope.saveLibs = function saveLibs() {
			var i = 0;
			var modifs = [];
			var theLibs = _.union($scope.data.libs, $scope.data.acctlibs);
			for (i = 0; i < theLibs.length; i++) {
				var lib = theLibs[i];
				if ($scope.data.usedLibs[lib.ident]) {
					if (!$scope.data.oldLibs[lib.ident]) {
						modifs.push({
							'@metadata' : {
								action : 'INSERT'
							},
							project_ident : $scope.selectedProj.ident,
							logic_library_ident : lib.ident
						});
					}
				}
				else {
					var oldLib = $scope.data.oldLibs[lib.ident];
					if (oldLib) {
						oldLib['@metadata'].action = 'DELETE';
						modifs.push(oldLib);
					}
				}
			}

			KahunaData.updateList("admin:project_libraries", modifs, function (data) {
				fetchProjLibs();
				kahuna.util.info('Project was saved');
			});
		};

		$scope.deleteLib = function deleteLib(lib) {
			if ( ! confirm('Are you sure you want to delete this library (' + lib.name + ')?'))
				return;
			KahunaData.remove(lib, function () {
				var idx = $scope.data.acctlibs.indexOf(lib);
				$scope.data.acctlibs.splice(idx, 1);
				kahuna.util.info('Library was deleted');
			}, function (e) {
				kahuna.util.error("Unable to delete library: " + JSON.stringify(e));
			});
		};

		////////////////////////////////////////////////////////////
		// Controller for the library editing dialog
		kahuna.project.LibraryEditController = function ($scope, $modalInstance, library, action, callback) {
			$scope.library = library;
			$scope.cancelEdit = function cancelEdit() {
				$modalInstance.close();
				$scope.upload.library = null;
			};

			$scope.upload = {
					uploaded: 0,
					progressBarType: "info"
					};

			$scope.fileSelected = function fileSelected() {
				$log.log('File chosen');
				var f = $('#libFile')[0].files[0];
				$scope.upload.fileSize = f.size + " bytes";
				$scope.upload.fileType = f.type;
			};

			$scope.uploadProgress = function uploadProgress(e) {
				if (e.lengthComputable) {
					kahuna.applyFunctionInScope($scope, function () {
						$scope.upload.uploaded = Math.floor(e.loaded * 100 / e.total);
						$scope.upload.progressBarMessage = "" + $scope.upload.pctUploaded + "%";
					});
					$log.log('Progress: ' + e.loaded + " out of " + e.total);
				}
			};

			$scope.saveLib = function saveLib() {
				$log.log('Saving library');
				if (action === "insert") {
					KahunaData.create("admin:logic_libraries", library, function (data) {
						kahuna.applyFunctionInScope($scope, function () {
							$scope.library = data.txsummary[0];
							if ($('#libFile')[0].files.length) {
								$scope.uploadCode(function () {
									callback && callback(data.txsummary[0]);
									$modalInstance.close();
									kahuna.util.info('Library was created');
								});
							}
							else {
								callback && callback($scope.library);
								$modalInstance.close();
								kahuna.util.info('Library was created');
							}

							$scope.library = null;
						});
					}, function (e) {
						// Error
						$log.error('Creation of library failed: ' + JSON.stringify(e));
						espresso.util.error('Creation of library failed: ' + JSON.stringify(e));
						$scope.library = null;
						$modalInstance.close();
					});
				}
				else {
					delete library.code;
					KahunaData.update(library, function (data) {
						kahuna.applyFunctionInScope($scope, function () {
							$scope.library = data.txsummary[0];
							if ( ! $scope.library)
								$scope.library = library;
							if ($('#libFile')[0].files.length) {
								$scope.uploadCode(function afterLibUpdate(data2) {
									callback && callback(data2);
									$modalInstance.close();
									$scope.library = null;
									kahuna.util.info('Library was updated');
								});
							}
							else {
								callback && callback($scope.library);
								$modalInstance.close();
								$scope.library = null;
								kahuna.util.info('Library was updated');
							}
						});
					});
				}
			};

			$scope.uploadCode = function uploadCode(fun) {
				var formData = new FormData();
				formData.append('checksum', $scope.library['@metadata'].checksum);
				formData.append('authorization', kahuna.globals.apiKeyValue + ':1');
				formData.append('code', $('#libFile')[0].files[0]);
				$.ajax({
					url: $scope.library['@metadata'].href,
					type: 'POST',
					xhr: function () {  // Custom XMLHttpRequest
						var myXhr = $.ajaxSettings.xhr();
						if (myXhr.upload) {
							myXhr.upload.addEventListener('progress', $scope.uploadProgress, false);
						}
						return myXhr;
					},
					beforeSend: function () {
					},
					success: function (data) {
						kahuna.applyFunctionInScope($scope, function () {
							$scope.upload.progressBarMessage = "Upload complete";
							$scope.upload.progressBarType = "success";
						});
						$log.info('Upload complete');
						fun && fun(data.txsummary[0]);
					},
					error: function (err) {
						kahuna.applyFunctionInScope($scope, function () {
							if (err && err.responseJSON && err.responseJSON.errorMessage) {
								$scope.upload.errorMessage = err.responseJSON.errorMessage;
							}
							$scope.upload.progressBarType = "danger";
							$scope.upload.progressBarMessage = "Upload failed";
						});
						kahuna.util.error("File upload failed");
						$log.error("Error during upload");
					},
					// Form data
					data: formData,
					//Options to tell jQuery not to process data or worry about content-type.
					cache: false,
					contentType: false,
					processData: false
				});
			};
		};

		function fetchAuthProviders() {
			if (!$scope.selectedProj) {
				return;
			}
			KahunaData.query('admin:authproviders', {
				pagesize : 100,
				filter : 'account_ident=' + $rootScope.currentAccount.ident,
				order : 'name asc'
			}, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					for (var i = 0; i < data.length; i += 1) {
						data[i].isChanged = false;
						$scope.data.authProviders.push(data[i]);
					}
					if (data.length > 0) {
						$scope.data.currentAuthProvider = $scope.data.authProviders[0];
						authProviderSelected();
					}
				});
			});
		}

		function fetchAuthTypes() {
			KahunaData.query('admin:auth_types', {
				pagesize : 100
			}, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.data.authTypes.splice(0, $scope.data.authTypes.length);
					for (var i = 0; i < data.length; i += 1) {
						$scope.data.authTypes.push(data[i]);
					}
				});
			});
		}

		fetchAuthTypes();
		$timeout(fetchAuthProviders, 500);

		function findAuthType(ident) {
			for (var i = 0; i < $scope.data.authTypes.length; i += 1) {
				if (ident === $scope.data.authTypes[i].ident) {
					return $scope.data.authTypes[i];
				}
			}
			return null;
		}

		// AUTH PROVIDER SECTION

		function authTypeSelected() {
			var prov = $scope.data.currentAuthProvider;
			if (! $scope.data.currentAuthProvider) {
				return;
			}
			prov.isChanged = true;
			prov.auth_type_ident = $scope.data.currentAuthType.ident;
			prov.class_name = $scope.data.currentAuthType.class_name;
			prov.param_map = null;
			$scope.data.currentAuthProviderConfiguration = null;
			if (!$scope.data.currentAuthType.config_name) {
				prov.bootstrap_config_value = null;
				$scope.data.currentAuthProviderConfiguration = null;
			}

			saveAndConfigureAuthProvider($scope.data.currentAuthProvider);
		}
		$scope.authTypeSelected = authTypeSelected;

		function authProviderSelected() {
			if ($scope.data.currentAuthProvider) {
				$scope.data.currentAuthType = findAuthType($scope.data.currentAuthProvider.auth_type_ident);
				configureAuthProvider();
			}
			else {
				$scope.data.currentAuthType = null;
			}
		}
		$scope.authProviderSelected = authProviderSelected;

		function deleteAuthProvider(provider) {
			if (null === provider) {
				return;
			}

			for (var i = 0; i < $scope.data.authProviders.length;  i+= 1) {
				if (provider === $scope.data.authProviders[i]) {
					var foundIndex = i;
					if (null === provider.ident) {
						$scope.data.authProviders.splice(foundIndex, 1);
						if ($scope.data.currentAuthProvider === provider) {
							var newidx = Math.min(foundIndex, $scope.data.authProviders.length - 1);
							if (newidx < 0) {
								$scope.data.currentAuthProvider = null;
							}
							else {
								$scope.data.currentAuthProvider = $scope.data.authProviders[newidx];
							}
						}
					}
					else {
						var toDelete = {
							ident : provider.ident,
							'@metadata' : provider['@metadata']
						};
						KahunaData.remove(toDelete, function (deldata) {
							kahuna.applyFunctionInScope($scope, function () {
								$scope.data.authProviders.splice(foundIndex, 1);
								if ($scope.data.currentAuthProvider === provider) {
									var newidx = Math.min(foundIndex, $scope.data.authProviders.length - 1);
									if (newidx < 0) {
										$scope.data.currentAuthProvider = null;
									}
									else {
										$scope.data.currentAuthProvider = $scope.data.authProviders[newidx];
									}
								}
							});
						});
					}
				}
			}
		}
		$scope.deleteAuthProvider = deleteAuthProvider;

		function createAuthProvider() {
			$scope.data.currentAuthType = $scope.data.authTypes[0];
			var newauthprovider = {
				isChanged: true,
				ident: null,
				name: "New Provider (" + new Date().toUTCString() + ")",
				auth_type_ident: $scope.data.currentAuthType.ident,
				class_name: $scope.data.currentAuthType.class_name,
				account_ident: $rootScope.currentAccount.ident
			};

			$scope.data.authProviders.push(newauthprovider);
			$scope.data.currentAuthProvider = newauthprovider;
			saveAndConfigureAuthProvider(newauthprovider);
		}
		$scope.createAuthProvider = createAuthProvider;

		function saveAuthProvider(provider, fun) {
			if (!provider) {
				return;
			}
			var newprovider = {
				ident: provider.ident,
				name: provider.name,
				comments: provider.comments,
				auth_type_ident: provider.auth_type_ident,
				class_name: provider.class_name,
				class_location: "",
				bootstrap_config_value: provider.bootstrap_config_value,
				param_map: provider.param_map,
				account_ident: provider.account_ident
			};

			if (!provider.ident) {
				KahunaData.create("admin:authproviders", newprovider, function (newresult) {
					kahuna.applyFunctionInScope($scope, function () {
						for (var i = 0; i < newresult.txsummary.length; i++) {
							var modObj = newresult.txsummary[i];
							if (modObj['@metadata'].resource === 'admin:authproviders' && modObj['@metadata'].verb === 'INSERT') {
								provider.ident = modObj.ident;
								provider.isChanged = false;
								provider["@metadata"] = modObj["@metadata"];
							}
						}
					});
					kahuna.util.info("Created Authentication Provider - " + provider.name);
					fun && fun();
				});
			}
			else {
				newprovider["@metadata"] = provider["@metadata"];
				KahunaData.update(newprovider, function (newresult) {
					kahuna.applyFunctionInScope($scope, function () {
						for (var i = 0; i < newresult.txsummary.length; i++) {
							var modObj = newresult.txsummary[i];
							if (modObj['@metadata'].resource === 'admin:authproviders' && modObj.ident === provider.ident) {
								provider["@metadata"] = modObj["@metadata"];
							}
						}
						provider.isChanged = false;
					});
					kahuna.util.info("Saved Authentication Provider - " + provider.name);
					fun && fun();
				});
			}
		}
		$scope.saveAuthProvider = saveAuthProvider;

		function revertAuthProvider(provider) {
			if (!provider) {
				return;
			}
			for (var i = 0; i < $scope.data.authProviders.length; i += 1) {
				if ($scope.data.authProviders[i] === provider) {
					if (null === provider.ident) {
						$scope.data.authProviders.splice(i, 1);
						if (provider === $scope.data.currentAuthProvider) {
							$scope.data.currentAuthProvider = null;
						}
					}
					else {
						var foundIndex = i;
						KahunaData.query("admin:authproviders",
							{
								pagesize: 100,
								filter: 'ident=' + provider.ident
							}, function (oldauth) {
								kahuna.applyFunctionInScope($scope, function () {
									if (0 === oldauth.length) {
										$scope.data.authProviders.splice(foundIndex, 1);
										if (provider === $scope.data.currentAuthProvider) {
											$scope.data.currentAuthProvider = null;
										}
									}
									else {
										oldauth[0].isChanged = false;
										$scope.data.authProviders[foundIndex] = oldauth[0];
										if (provider === $scope.data.currentAuthProvider) {
											$scope.data.currentAuthProvider = oldauth[0];
										}
									}
								});
						});
					}
				}
			}
		}
		$scope.revertAuthProvider = revertAuthProvider;

		function configureAuthProvider() {
			$scope.data.currentAuthProviderConfiguration = null;
			$scope.data.authProviderConfigurationError = "Fetching";
			KahunaData.query('@auth_provider_info/' + $scope.data.currentAuthProvider.ident, {projectId: $scope.currentProject.ident}, function configSuccessCallback(authconfiginfo) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.data.authProviderConfigurationError = null;
					$scope.data.currentAuthProviderConfiguration = authconfiginfo;
				});
			}, function configErrorCallback(data, status, url) {
				$log.info("auth provider info returned error " + JSON.stringify(data));
				var msg = data.errorMessage;
				var internalError = "Internal Server Error:";
				if (0 == (msg.toLowerCase()).indexOf(internalError.toLowerCase())) {
					msg = msg.substring(internalError.length);
				}
				$scope.data.authProviderConfigurationError = msg;
			});
		}
		$scope.configureAuthProvider = configureAuthProvider;

		function saveAndConfigureAuthProvider() {
			saveAuthProvider($scope.data.currentAuthProvider, configureAuthProvider);
		}
		$scope.saveAndConfigureAuthProvider = saveAndConfigureAuthProvider;

		function authConfigValueChanged() {
			var prov = $scope.data.currentAuthProvider;
			prov.isChanged = true;
			var parms = "";
			var fields = $scope.data.currentAuthProviderConfiguration.fields;
			var values = $scope.data.currentAuthProviderConfiguration.current;
			for (var i = 0; i < fields.length; i+= 1) {
				if (i > 0) {
					parms = parms + ",";
				}
				parms = parms + encodeURIComponent(fields[i].name) + "=" + encodeURIComponent(values[fields[i].name] || "");
			}
			prov.param_map = parms;
		}
		$scope.authConfigValueChanged = authConfigValueChanged;

		function authProviderValueChanged() {
			$scope.data.currentAuthProvider.isChanged = true;
		}
		$scope.authProviderValueChanged = authProviderValueChanged;

		function bootstrapConfigValueChanged() {
			$scope.data.currentAuthProvider.isChanged = true;
		}
		$scope.bootstrapConfigValueChanged = bootstrapConfigValueChanged;

		//////////////////////////////////////////////////
		// Topics

		function fetchTopics() {
			var deferred = $q.defer();
			if (!$scope.selectedProj) {
				deferred.reject();
				return deferred.promise;
			}
			KahunaData.query('admin:topics', {
				pagesize : 1000,
				filter : 'project_ident=' + $scope.selectedProj.ident,
				order : 'name asc'
			}, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.data.topics = [];
					for (var i = 0; i < data.length; i += 1) {
						$scope.data.topics.push(data[i]);
					}
					if (data.length > 0) {
						$scope.data.currentTopic = $scope.data.topics[0];
					}
					$scope.$evalAsync(function () {
						deferred.resolve(data);
					});
				});
			});
			return deferred.promise;
		}
		fetchTopics();

		// Wait until CKEditor becomes available, then init it
		function tryCkInit(numTries) {
			console.log('Trying ckeditor...');
			if (numTries <= 0) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.editorMessage = "Sorry, unable to load CK Editor";
				});
				return;
			}
			if (window.CKEDITOR) {
				//console.log('Found ckeditor!');
				$timeout(function() {
					kahuna.project.topicEditor = CKEDITOR.replace('topicEditor');
				}, 200);
			}
			else
				$timeout(function () {tryCkInit(numTries - 1);}, 300);
		}

		$scope.$watch('data.topicsTab', function () {
			if ($scope.data.topicsTab) {
				//console.log('Topics tab selected');
				kahuna.loadRemoteFile('jslib/ckeditor/ckeditor.js', 'js');
				tryCkInit(30); // Try up to 30 times
			}
		});

		$scope.$watch("data.currentTopic", function () {
			if ( ! $scope.data.currentTopic || !kahuna.project.topicEditor)
				return;
			if ( ! $scope.data.currentTopic.description) {
				$timeout(function() {
					kahuna.project.topicEditor.setData('');
				}, 200);
			}
			else {
				$timeout(function() {
					kahuna.project.topicEditor.setData($scope.data.currentTopic.description);
				}, 200);
			}
		});

		$scope.createTopic = function createTopic() {
			var newTopic = {
				name: "New topic (" + new Date().toUTCString() + ")",
				color: "#4444FF",
				project_ident: $scope.currentProject.ident
			};

			KahunaData.create("admin:topics", newTopic, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					for (var i = 0; i < data.txsummary.length; i++) {
						var topic = data.txsummary[i];
						if (topic['@metadata'].resource === 'admin:topics' && topic['@metadata'].verb === 'INSERT') {
							$scope.data.currentTopic = topic;
							$scope.data.topics.push(topic);
						}
					}
				});
				kahuna.util.info("Created topic - " + $scope.data.currentTopic.name);
			});
		};

		$scope.deleteTopic = function deleteTopic() {
			KahunaData.deleteWithKey($scope.data.currentTopic['@metadata'].href, { ruleSummary: true, checksum: 'override' }, {apikey: kahuna.globals.apiKeyValue},
				function (data) {
					$scope.$evalAsync(function () {
						//console.log(data);
						var promise = fetchTopics();
						promise.then(function (data) {
							if (!data.length) {
								$scope.data.currentTopic = null;
							}
						});
					});
				}
			);
		};

		$scope.saveTopic = function saveTopic() {
			if ( ! $scope.data.currentTopic)
				return;
			$scope.data.currentTopic.description = kahuna.project.topicEditor.getData();
			KahunaData.update($scope.data.currentTopic, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					for (var i = 0; i < data.txsummary.length; i++) {
						var modObj = data.txsummary[i];
						if (modObj['@metadata'].resource === 'admin:topics' && modObj.ident === $scope.data.currentTopic.ident) {
							$scope.data.currentTopic = modObj;

							for (var i = 0; i < $scope.data.topics.length; i++) {
								if ($scope.data.topics[i].ident == modObj.ident) {
									$scope.data.topics[i] = modObj;
									break;
								}
							}
							break;
						}
					}
					kahuna.util.info("Topic was saved");

					// the select scope in IE is not reflecting name changes
					// here we grab the scope, push an empty object, digest, and then pop it off, forcing the IE DOM to refresh
					var ua = window.navigator.userAgent;
					var msie = ua.indexOf('MSIE ');
					var trident = ua.indexOf('Trident/');
					if (msie > 0 || trident > 0 || true) {
						$scope.data.topics.push({});
						var scope = angular.element('.ObjectList').scope();
						scope.$evalAsync(function () {
							scope.data.topics = $scope.data.topics;
							$timeout(function () {$scope.data.topics.pop();}, 1000);
						});
					}
				});
			});
		};

		if (angular.isDefined($rootScope.syncAction.topicEditor)) {
			var currentAction = angular.copy($rootScope.syncAction.topicEditor);
			if (currentAction.action === 'edit') {
				$scope.data.topicsTab = true;
				var deregFun = $scope.$watch("data.topics", function() {
					$scope.data.currentTopic = _.find($scope.data.topics, function(t) {
						return t.ident === currentAction.topic.ident;
					});
					if ($scope.data.topics)
						deregFun();
				});
			}
			delete $rootScope.syncAction.topicEditor;
		}
	}
};
