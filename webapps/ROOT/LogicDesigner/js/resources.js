var kahuna;
kahuna.resource = {
	allResources: {},
	topResources: [],
	scope: null,
	// codeMirror: null,
	aceEditor: null,

	// recently added or attempted names.  we won't try these again, even it they may not exist
	recentlyAttemptedNames: [],

	ResourcesCtrl: function ($rootScope, $scope, $http, $resource, $routeParams, $location, jqueryUI, KahunaData, $timeout, $modal, $q) {

		$rootScope.currentPage = 'resources';
		$rootScope.currentPageHelp = 'docs/logic-designer/rest-resources';

		// we need to hang on to this, as $rootScope.currentProject may change before we are thrown away (ie, saving gui etc)
		$scope.currentProject = $rootScope.currentProject;
		$scope.data = {};
		$scope.active = {};
		$scope.data.activeTabs = [true, false, false, false, false];

		$('.ResizableTd').resizable({
			handles: 'e',
			minWidth: 40
		});

		// Read all GUI settings, and initialize them if we haven't seen them before
		kahuna.readGuiSettings($scope.currentProject);
		$scope.data.resourcesListWidth = 250;
		$scope.data.subresourcesListWidth = 250;
		// $scope.data.resourcesListWidth = kahuna.getGuiSetting($scope.currentProject, 'resourcesListWidth', 200);
		// $scope.data.subresourcesListWidth = kahuna.getGuiSetting($scope.currentProject, 'subresourcesListWidth', 200);

		// Save all GUI settings before navigating away
		$scope.$on('$destroy', function () {
			var project = $scope.currentProject;
			kahuna.deleteGuiSetting(project);
			kahuna.storeGuiSetting(project, 'resource', 'resourcesListWidth', $("#resourcesListTd").width());
			kahuna.storeGuiSetting(project, 'resource', 'subresourcesListWidth', $("#subresourcesListTd").width());
			kahuna.saveGuiSettings(project);
		});

		// This has to be delayed because the CodeMirror box is in a tab that does not get rendered right away.
		setTimeout(function () {
			// var boxElem = document.getElementById('jsonTextBox');
			// if ( ! boxElem)
			//   return;
			// kahuna.resource.codeMirror = CodeMirror(boxElem, {
			//   mode:  "javascript",
			//   lineNumbers: true,
			//   lineWrapping: true
			// });
			// kahuna.resource.aceEditor = ace.edit("jsonTextBox");
			// kahuna.resource.aceEditor.setTheme("ace/theme/xcode");
			// kahuna.resource.aceEditor.getSession().setMode("ace/mode/json");

			kahuna.resource.sqlEditor = ace.edit("sqlTextBox");
			kahuna.resource.sqlEditor.setTheme("ace/theme/xcode");
			kahuna.resource.sqlEditor.getSession().setMode("ace/mode/sql");
			if ($scope.selectedResource) {
				kahuna.resource.sqlEditor.setValue($scope.selectedResource.code_text);
				kahuna.resource.sqlEditor.getSession().getSelection().moveCursorFileStart();
			}

			kahuna.resource.filterEditor = ace.edit("filterJSCode");
			kahuna.resource.filterEditor.setTheme("ace/theme/xcode");
			kahuna.resource.filterEditor.getSession().setMode("ace/mode/javascript");
			if ($scope.selectedSubResource) {
				kahuna.resource.filterEditor.setValue($scope.selectedSubResource.filter_code);
				kahuna.resource.filterEditor.getSession().getSelection().moveCursorFileStart();
			}
		}, 2000);

		kahuna.resource.scope = $scope;
		// if ($routeParams.projectId)
		//     $scope.currentProject = kahuna.globals.projects[$routeParams.projectId];

		function putInScope(name, value) {
			if (kahuna.resource.scope.$$phase) {
				if (name.indexOf('.') > 0) {
					var parts = name.split('.');
					kahuna.resource.scope[parts[0]][parts[1]] = value;
				}
				else {
					kahuna.resource.scope[name] = value;
				}
			}
			else {
				kahuna.resource.scope.$apply(function () {
					if (name.indexOf('.') > 0) {
						var parts = name.split('.');
						kahuna.resource.scope[parts[0]][parts[1]] = value;
					}
					else {
						kahuna.resource.scope[name] = value;
					}
				});
			}
		}

		// $scope.allTablesList = kahuna.util.convertToArray(kahuna.meta.allTables);
		$scope.data.selectedSubResourceTable = null;
		$scope.allTablesList = kahuna.meta.listOfTables;
		$scope.allTablesList.sort(function (a, b) {
			return kahuna.util.caseInsensitiveSort(a, b, "name");
		});

		// Make a list of all active prefixes
		$scope.allDbPrefixes = [];
		kahuna.meta.getAllSchemas($scope.currentProject, function (data) {
			for (var i = 0; i < kahuna.meta.allSchemas.length; i++) {
				var sch = kahuna.meta.allSchemas[i];
				if (sch.active) {
					$scope.allDbPrefixes.push(sch.prefix);
				}
			}
			$scope.allDbPrefixes.sort(kahuna.util.caseInsensitiveSort);
		});

		function sortTopResources() {
			kahuna.resource.topResources.sort(function (a, b) {
				return kahuna.util.caseInsensitiveSort(a, b, "name");
			});
		}

		// Get all the resources for the current API version
		// TODO - this could use the values in kahuna.meta.allResources to figure this out
		var loadAllResource = function () {
			var deferred = $q.defer();
			kahuna.resource.allResources = {};
			kahuna.resource.topResources = [];

			KahunaData.query('AllResources', {pagesize: 1000, filter: 'apiversion_ident=' + $scope.active.selectedApiVersion.ident }, function (data) {
				for (var i = 0; i < data.length; i++) {
					kahuna.resource.allResources[data[i].ident] = data[i];
					if ( ! data[i].container_ident) {
						// Keep track of top-level resources
						kahuna.resource.topResources.push(data[i]);
					}

					// AllResources has row event to create non-persistent attribute "entity_name" if regular resource
				}

				sortTopResources();
				$scope.allResources = kahuna.resource.topResources;
				if (kahuna.resource.topResources.length > 0) {
					var selResource = kahuna.resource.topResources[0];
					if ($routeParams.resourceId) {
						for (var i = 0; i < kahuna.resource.topResources.length; i++) {
							if (kahuna.resource.topResources[i].ident == $routeParams.resourceId) {
								selResource = kahuna.resource.topResources[i];
								break;
							}
						}
					}
					deferred.promise.then(function () {
						if (!$scope.selectedResource || ($scope.selectedResource.apiversion_ident != $scope.active.selectedApiVersion.ident)) {
							if (currentAction && currentAction.resource) {
								$scope.resourceSelected(currentAction.resource);
								subResourceSelected(currentAction.resource.ident);
								currentAction = undefined;
							}
							else {
								$scope.resourceSelected(selResource);
								subResourceSelected(selResource.ident);
							}
						}
					});
				}
				else {
					$scope.$evalAsync(function () {
						updateTreeNode(null);
					});

					putInScope("selectedResource", null);
				}
				deferred.resolve(data);
			});

			return deferred.promise;
		};

		function removeResource(resource) {
			delete kahuna.resource.allResources[resource.ident];
			for (var idx = 0; idx < kahuna.resource.topResources.length; idx += 1) {
				if (kahuna.resource.topResources[idx].ident === resource.ident) {
					kahuna.applyFunctionInScope($scope, function () {
						kahuna.resource.topResources.splice(idx, 1);
					});
					return;
				}
			}
		}

		// Find the resource attribute (if it exists) for the given column
		function getResourceAttributeForColumn(col) {
			if ( ! $scope.selectedSubResource || ! $scope.selectedSubResource.Attributes)
				return;
			for (var i = 0; i < $scope.selectedSubResource.Attributes.length; i++) {
				var attrib = $scope.selectedSubResource.Attributes[i];
				if (attrib.column_name === col.name)
					return attrib;
			}
			return null;
		}

		// When a new version of an attribute is received, put it in place
		function replaceResourceAttribute(att) {
			var res = kahuna.resource.allResources[att.resource_ident];
			var foundIdx = -1;
			for (var i = 0; i < res.Attributes.length; i++) {
				if (res.Attributes[i].column_name === att.column_name) {
					foundIdx = i;
					break;
				}
			}
			if (foundIdx >= 0) {
				res.Attributes[foundIdx] = att;
			}
		}

		function removeResourceAttribute(att) {
			var res = kahuna.resource.allResources[att.resource_ident];
			var foundIdx = -1;
			for (var i = 0; i < res.Attributes.length; i++) {
				if (res.Attributes[i].column_name === att.column_name) {
					foundIdx = i;
					break;
				}
			}
			if (foundIdx >= 0) {
				res.Attributes.splice(foundIdx, 1);
			}
		}

		$scope.apiVersionSelected = function () {
			loadAllResource();
		};

		$scope.getIsDefinedKeyPart = function (col) {
			var att = getResourceAttributeForColumn(col);
			return !!(att && att.is_defined_key_part);
		};

		// TODO - rework to use kahuna.meta.allApiVersions
		KahunaData.query('admin:apiversions', {pagesize: 100, filter: 'project_ident=' + $rootScope.currentProject.ident }, function (data) {
			$scope.active.selectedApiVersion = null;
			if (0 === data.length) {
				return;
			}
			$scope.active.selectedApiVersion = data[data.length - 1];
			$scope.apiVersions = data;
			$scope.apiVersionSelected($scope.active.selectedApiVersion);
		});

		// Find the subresources of the given resource
		var findChildrenOfResource = function (parentIdent) {
			var children = [];
			for (var ident in kahuna.resource.allResources) {
				if ( ! kahuna.resource.allResources.hasOwnProperty(ident))
					continue;
				var resource = kahuna.resource.allResources[ident];
				if (resource.container_ident == parentIdent)
					children.push(resource);
			}
			return children;
		};

		// Get the class for a resizable column item. The item is the object whose class is being determined,
		// varName is the name of the variable for the current object.
		$scope.getItemClass = function (item, varName) {
			if (item == $scope[varName])
				return 'SelectedListItem';
			return 'UnselectedListItem';
		};

		function entityName(resource) {
			if (resource.prefix && resource.table_name) {
				return resource.prefix + ':' + resource.table_name;
			}
			return null;
		}

		function setEntityName(resource) {
			resource.entity_name = entityName(resource);
		}

		$scope.resourceSelected = _.throttle(function (resource) {
			if ($scope.selectedResource) {
				kahuna.meta.getTableDetails(entityName($scope.selectedResource), function (data) {
					if (data.columns) {
						for (var i = 0; i < data.columns.length; i++) {
							data.columns[i].checked = false;
						}
					}
				});
			}
			var treeRef = jQuery.jstree._reference("#treeBox");

			$scope.selectedSubResource = null;
			setTimeout(function () {
				if (!treeRef) {
					createTree();
					treeRef = jQuery.jstree._reference("#treeBox");
				}

				treeRef.refresh();
				$timeout(function () { kahuna.resource.selectTreeNode(resource.ident); }, 300);
				$scope.selectedResource = resource;
				$scope.selectedSubResource = null;
				$scope.tableColumns = [];
				$scope.selectedColumn = null;
				$scope.resourceAttribute = null;
				$scope.showResAttribTable = {value: false};

				if (resource.resource_type_ident != 2 && kahuna.resource.sqlEditor) {
					kahuna.resource.sqlEditor.setValue($scope.selectedResource.code_text);
					kahuna.resource.sqlEditor.getSession().getSelection().moveCursorFileStart();
				}

				if (kahuna.resource.filterEditor) {
					kahuna.resource.filterEditor.setValue($scope.selectedResource.filter_code);
					kahuna.resource.filterEditor.getSession().getSelection().moveCursorFileStart();
				}
			}, 50);
		}, 3000);

		function inform(resource, msg) {
			kahuna.util.info('Resource ' + resource.name + '(' + resource.ident + ')' + (msg ? (' ' + msg) : ''));
		}

		// This gets called after an update to refresh the JSON objects
		var processUpdate = function (data, notifySaveStatusBoolean) {
			if (angular.isUndefined(notifySaveStatusBoolean)) { notifySaveStatusBoolean = true; }
			var updatedResource = null;
			var updatedAttribs = [];
			var attributesAffected = 0;
			for (var i = 0; i < data.txsummary.length; i++) {
				var modObj = data.txsummary[i];
				var metadata = modObj['@metadata'];
				switch (metadata.resource) {
				case 'AllResources':
					if (metadata.verb === 'UPDATE') {
						setEntityName(modObj);
						setEntityName($scope.selectedSubResource);
						updatedResource = modObj;
						updatedResource.Attributes = $scope.selectedSubResource.Attributes;
						if (notifySaveStatusBoolean) {
							inform(updatedResource, 'was saved');
						}
					}
					break;
				case 'AllResources.Attributes':
					attributesAffected++;
					switch (metadata.verb) {
					case 'DELETE':
						removeResourceAttribute(modObj);
						break;
					case 'UPDATE':
					case 'INSERT':
						// In case the resource itself was not updated
						replaceResourceAttribute(modObj);
						updatedAttribs.push(modObj);
						break;
					}
				}
			}

			if ( ! updatedResource && !attributesAffected) {
				if (notifySaveStatusBoolean) {
					kahuna.util.info('Nothing to save');
				}
				return;
			}

			if ( !updatedResource && attributesAffected) {
				if (notifySaveStatusBoolean) {
					kahuna.util.info( '' + attributesAffected + ' resource attribute(s) saved');
				}
				return;
			}

			for (var i = 0; i < updatedAttribs.length; i++) {
				replaceResourceAttribute(updatedAttribs[i]);
			}

			if ( ! updatedResource.entity_name) {
				alert('No entity_name!');
			}
			kahuna.resource.allResources[$scope.selectedSubResource.ident] = updatedResource;
			var idx = kahuna.resource.topResources.indexOf($scope.selectedSubResource);
			if (idx >= 0) {
				kahuna.resource.topResources[idx] = updatedResource;
				putInScope("selectedResource", updatedResource);
			}
			if (updatedResource.ident == $scope.selectedSubResource.ident) {
				putInScope("selectedSubResource", updatedResource);
			}
			if (updatedResource.container_ident) {
				updateTreeNode(updatedResource.container_ident);
			}
			else {
				jQuery.jstree._reference("#treeBox").refresh(-1);
			}

			setTimeout(function () {
				kahuna.resource.selectTreeNode(updatedResource.ident);
			}, 400);
		};

		// Create a new top-level resource.
		$scope.createResource = function createResource(table, name) {
			if ( ! $scope.active.selectedApiVersion) {
				alert("You cannot create a resource until you have created an API version.");
				return;
			}
			if ( ! kahuna.meta.getFirstTable()) {
				alert("You cannot create a resource until you have an active database.");
				return;
			}

			var firstTable = kahuna.meta.getFirstTable();
			if (table) {
				firstTable = kahuna.meta.allTables[table.name];
			}
			var newResource = {
					resource_type_ident: 1,
					apiversion_ident: $scope.active.selectedApiVersion.ident,
					name: "NewResource",
					prefix: firstTable.prefix,
					table_name: firstTable.entity,
					is_collection: "Y"
			};

			if (name) {
				newResource.name = name;
			}

			// spin thru all resources, if any match, mark as a collision
			var collisions = false;
			var nextResNum = 1;
			do {
				collisions = false;
				for (var r in kahuna.resource.allResources) {
					var res = kahuna.resource.allResources[r];
					if (res.name === newResource.name) {
						newResource.name = "NewResource" + nextResNum;
						collisions = true;
						break;
					}
				}
				if (!collisions && -1 != kahuna.resource.recentlyAttemptedNames.indexOf(newResource.name)) {
					newResource.name = "NewResource" + nextResNum;
					collisions = true;
				}
				nextResNum += 1;
			} while (collisions && nextResNum < 1000);

			if (collisions) {
				// ok to use the date number here, this is just a fall back
				newResource.name = "NewResource" + new Date().getTime();
			}

			kahuna.resource.recentlyAttemptedNames.push(newResource.name);

			KahunaData.create("AllResources", newResource, function (data) {
				$scope.$evalAsync(function () {
					kahuna.meta.getAllResources($rootScope.currentProject);
					if (201 !== data.statusCode) {
						alert('Internal error creating resource');
					}

					var modObj = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(data.txsummary, 'AllResources', 'INSERT'));
					if (modObj) {
						modObj.Attributes = [];
						setEntityName(modObj);
						kahuna.resource.allResources[modObj.ident] = modObj;
						kahuna.resource.topResources.push(modObj);
						$scope.selectedResource = modObj;
						$scope.resourceSelected(modObj);
						subResourceSelected(modObj.ident);
						$timeout(function () {
							kahuna.resource.selectTreeNode(modObj.ident);
							// empty top level resource lists was empty, itclosed all the tree nodes
							if ($scope.allResources.length == 1) {
								$scope.$broadcast('UpdatedVersionSuccess');
							}
						}, 300);
						$timeout(function () {
							kahuna.resource.selectTreeNode(modObj.ident);
						}, 300);
						$timeout(function () {
							$("#resourceName").select();
						}, 50);
					}
				});
			});

			kahuna.logEvalProgress("created resource", kahuna.resource.topResources.length );
		};

		$scope.$watch('selectedSubResource', function (current) {
			if (!current && $scope.allResources) {
				if ($scope.allResources.length === 1) {
					$scope.$broadcast('OpenNodes','#first-resource-container');
					$timeout(function () { kahuna.resource.selectTreeNode($scope.allResources[0].ident); });
				}
			}
		});

		$scope.deleteResource = function deleteResource() {
			if ( ! confirm("Are you sure you want to delete this resource (" + $scope.selectedResource.name +
					")? This will also delete all the resources it contains.")) {
				return;
			}
			KahunaData.remove($scope.selectedResource, function (data) {
				var deleted = _.filter(data.txsummary, function (r) {
					return r['@metadata'].resource === 'AllResources' && r['@metadata'].verb === 'DELETE';
				});
				_.each(deleted, function (r) {
					removeResource(r);
					inform(r, 'deleted');
				});

				if (kahuna.resource.topResources.length > 0) {
					$scope.selectedResource = kahuna.resource.topResources[0];
					updateTreeNode($scope.selectedResource.ident);
					setTimeout(function () {
						kahuna.resource.selectTreeNode($scope.selectedResource.ident);
					}, 300);
				}
				else {
					$scope.selectedResource = null;
					$scope.selectedSubResource = null;
					updateTreeNode(null);
				}
			});
		};

		// Select the node with the given ident in the resource tree
		kahuna.resource.selectTreeNode = function (ident) {
			var tree = $("#treeBox");
			var node = tree.find('li').filter(function () {
				if (this.attributes && this.attributes.ident) {
					return this.attributes.ident.value == ident;
				}
			});
			tree.jstree('select_node', node[0]);
		};

		function updateTreeNode(ident) {
			var tree = $("#treeBox");
			if ( ! ident) {
				tree.jstree('refresh');
			}
			else {
				var node = tree.find('li').filter(function () {
					if (this.attributes && this.attributes.ident) {
						return this.attributes.ident.value == ident;
					}
				});
				tree.jstree('refresh', node[0]);
			}
		}

		$scope.isTableResource = function isTableResource() {
			return !!$scope.data.selectedSubResourceTable;
		};

		$scope.helpers = {};
		// does the actually sub resource heavy lifting
		$scope.helpers.createSubResource = function helperCreateSubResource(subResourceObj) {
			if ($scope.selectedResource.resource_type_ident == 2) {
				alert('You cannot create sub-resources for a resource of type "Free SQL"');
				return;
			}
			$scope.saveResource();
			setTimeout(function () {
				var firstTable = kahuna.meta.getFirstTable();
				var newResource = {
						apiversion_ident: $scope.active.selectedApiVersion.ident,
						resource_type_ident: 1,
						name: "NewChildResource",
						prefix: firstTable.prefix,
						table_name: firstTable.entity,
						is_collection: "Y",
						root_ident: $scope.selectedResource.ident,
						container_ident: $scope.selectedSubResource.ident
					};
				if (angular.isDefined(subResourceObj)) {
					newResource = angular.extend(newResource, subResourceObj);
				}
				// spin thru all resources, if any match, mark as a collision
				var collisions = false;
				var nextResNum = 1;
				do {
					collisions = false;
					for (var r in kahuna.resource.allResources) {
						var res = kahuna.resource.allResources[r];
						if (res.name === newResource.name) {
							newResource.name = "NewChildResource" + nextResNum;
							collisions = true;
							break;
						}
					}
					if (!collisions && -1 != kahuna.resource.recentlyAttemptedNames.indexOf(newResource.name)) {
						newResource.name = "NewChildResource" + nextResNum;
						collisions = true;
					}
					nextResNum += 1;
				} while (collisions && nextResNum < 1000);

				if (collisions) {
					// ok to use the date number here, this is just a fall back
					newResource.name = "NewChildResource" + new Date().getTime();
				}

				kahuna.resource.recentlyAttemptedNames.push(newResource.name);

				$scope.activeTab = 1;

				KahunaData.create("AllResources", newResource, function (data) {
					kahuna.meta.getAllResources($rootScope.currentProject);
					var modObj = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(data.txsummary, 'AllResources', 'INSERT'));
					if (modObj) {
						modObj.Attributes = [];
						setEntityName(modObj);
						setEntityName($scope.selectedSubResource);
						kahuna.resource.allResources[modObj.ident] = modObj;
						$scope.selectedSubResource = modObj;
						var treeRef = jQuery.jstree._reference("#treeBox");
						treeRef.refresh(-1);
						setTimeout('kahuna.resource.selectTreeNode(' + modObj.ident + ')', 300);
						inform(modObj, 'was created');

						// cache all resource names when we have an updated list, clear any attempted names that failed or don't exist
						var names = _.keys(_.indexBy(kahuna.resource.allResources, 'name'));
						kahuna.resource.recentlyAttemptedNames = _.difference(names, kahuna.resource.recentlyAttemptedNames);
					}
					else {
						setEntityName($scope.selectedSubResource);
					}
					setTimeout(function () { $("#resourceName").select(); }, 50);
				});
			}, 250);
		};

		$scope.createSubResource = function createSubResource() {
			if (!$scope.selectedSubResource) {
				$scope.createResource();
				return;
			}

			if ($scope.isTableResource()) {
				var scope = $scope;
				var subResourceModal = $modal.open({
					templateUrl: 'partials/subResourceModal.html',
					controller: [
						'$modalInstance', 'resource', '$scope', 'table', '$location', '$rootScope', '$timeout',
						function ($modalInstance, resource, $scope, table, $location, $rootScope, $timeout) {

							$scope.resource = resource;

							$scope.getRoleTable = function getRoleTable(role) {
								if (!role) {
									role = $scope.relationships.selected;
								}
								return role.child_table || role.parent_table;
							};
							$scope.getRoleType = function getRoleType(role) {
								if (!role) {
									role = $scope.relationships.selected;
								}
								if (role.child_table) { return 'Child'; }
								else { return 'Parent'; }
							};
							$scope.createRelationship = function createRelationship(roleType) {
								$location.path('/projects/' + $rootScope.currentProject.ident + '/databases');
								$scope.close();
								$timeout(function () {
									$rootScope.$emit('CreateRelationship', kahuna.meta.allTables[$scope.relationships.table], roleType, table);
								}, 1000);
							};
							$scope.showRelationshipButtons = function showRelationshipButtons() {
								$scope.isShown = !$scope.isShown;
							};

							// init relationships
							$scope.relationships = {};
							$scope.relationships.definitions = {};
							$scope.relationships.options = {};

							angular.forEach(table.children, function (element, index) {
								$scope.relationships.definitions['child_' + index] = element;
								$scope.relationships.options['child_' + index] = element.child_table + ' (as ' + element.name + ') - Child';
							});
							angular.forEach(table.parents, function (element, index) {
								$scope.relationships.definitions['parent_' + index] = element;
								$scope.relationships.options['parent_' + index] = element.parent_table + ' (as ' + element.name + ') - Parent';
							});
							$scope.relationships.selected = $scope.relationships.definitions[_.keys($scope.relationships.definitions)[0]];
							$scope.$watch('relationships.definitions', function (current) {
								$scope.relationships.values = _.values(current);
							});

							// update after selection
							$scope.$watch('relationships.selected', function (current) {
								var definition = current;
								$scope.relationships.sqlFragment = '';
								$scope.relationships.name = definition.name;
								if (definition.child_table) {
									// the sub resource is a child table
									angular.forEach(definition.child_columns, function (element, index) {
										$scope.relationships.isCollection = 'Y';
										if (index > 0) { $scope.relationships.sqlFragment += ' AND '; }
										$scope.relationships.sqlFragment = element + ' = [' + definition.parent_columns + ']';
									});
									$scope.relationships.table = definition.child_table;
								}
								else {
									// the sub resource is a child table
									$scope.relationships.isCollection = 'N';
									angular.forEach(definition.parent_columns, function (element, index) {
										if (index > 0) { $scope.relationships.sqlFragment += ' AND '; }
										$scope.relationships.sqlFragment = element + ' = [' + definition.child_columns + ']';
									});
									$scope.relationships.table = definition.parent_table;
								}
							});

							$scope.close = function closeModal() { return $modalInstance.close(); };

							$scope.closeAndCreate = function closeAndCreate(customResourceBoolean) {
								var subResourceObj = {};
								if (!customResourceBoolean) {
									var table = '';
									var prefix = '';
									var tableSplit = $scope.relationships.table.split(':');
									if (tableSplit.length > 1) {
										prefix = tableSplit[0];
										table = tableSplit[1];
									}
									else {
										table = tableSplit[0];
									}
									subResourceObj.join_condition = $scope.relationships.sqlFragment;
									subResourceObj.is_collection = $scope.relationships.isCollection;
									subResourceObj.table_name = table;
									subResourceObj.prefix = prefix;
									subResourceObj.name = $scope.relationships.name;
									subResourceObj.root_ident = resource.root_ident;
								}
								scope.helpers.createSubResource(subResourceObj);
								$modalInstance.close();
							};
						}
					],
					resolve: {
						resource: function () { return $scope.selectedSubResource; },
						table: function () { return $scope.data.selectedSubResourceTable; }
					}
				});
			}
			else {
				$scope.helpers.createSubResource({});
			}
		};

		$scope.deleteSubResource = function deleteSubResource() {
			if ( ! confirm("Are you sure you want to delete this resource (" + $scope.selectedSubResource.name +
					")? This will also delete all the resources it contains.")) {
				return;
			}
			KahunaData.remove($scope.selectedSubResource, function (data) {
				kahuna.meta.getAllResources($rootScope.currentProject);
				var deleted = kahuna.util.findInTxSummary(data.txsummary, 'AllResources', 'DELETE');
				_.each(deleted, function (r) {
					removeResource(r);
					inform(r, 'was deleted');
				});
				kahuna.resource.selectTreeNode($scope.selectedResource.ident);
				$scope.resourceSelected($scope.selectedResource);
				setTimeout(function () {
					if ($scope.allResources[0]) {
						$('#second-resource-container li a').first().click();
					}
				}, 1000);
			});
		};

		$scope.isAttributeStateUpdated = false;
		$scope.checkAttributeState = function () {
			if ($scope.isAttributeStateUpdated) {
				var scope = $scope;
				 $modal.open({
						template: '<div class="modal-dialog"><div class="modal-content"><div class="modal-header">' +
							'Attributes have been updated, please save the table. <a class="btn btn-primary" ng-click="close()">Save</a></div></div></div>',
						controller: function ($scope, $modalInstance) {
							$scope.close = function close() {
								$modalInstance.close();
								scope.saveResource();
							};
						},
						resolve: {}
				 });
				setTimeout(function () {angular.element('body').click();});
			}
		};

		$scope.$watch('selectedSubResource', function (current, previous) {
			$scope.$evalAsync(function () { $scope.isAttributeStateUpdated = false; });
		});

		$scope.$watch('selectedSubResource.Attributes', function (current, previous) {
			if (current && previous && current != previous) {
				var currentArr = _.pluck(current, 'name');
				var previousArr = _.pluck(previous, 'name');
				if (!angular.equals(currentArr, previousArr)) {
					// something changed, update scope
					$scope.isAttributeStateUpdated = true;
				}
			}
		}, true);

		// Called when user clicks Save, or creates a subresource
		$scope.saveResource = function saveResource(notifySaveStatusBoolean) {
			if (angular.isUndefined(notifySaveStatusBoolean)) {
				notifySaveStatusBoolean = true;
			}
			var deferred = $q.defer();

			$scope.isAttributeStateUpdated = false;

			if ($scope.selectedSubResource.resource_type_ident != 1) {
				var sql = kahuna.resource.sqlEditor.getValue();
				sql = sql.replace(/\n/g, "\\n");
				sql = sql.replace(/"/g, "\\\n");
				$scope.selectedSubResource.code_text = kahuna.resource.sqlEditor.getValue();
			}

			var resourceCopy = $scope.selectedSubResource;
			if ($scope.selectedSubResource.entity_name) {
				var prefixTable = $scope.selectedSubResource.entity_name.split(':');
				$scope.selectedSubResource.prefix = prefixTable[0];
				$scope.selectedSubResource.table_name = prefixTable[1];
				resourceCopy = kahuna.util.cloneObject($scope.selectedSubResource);
				delete resourceCopy.entity_name;
			}
			$scope.selectedSubResource.filter_code = kahuna.resource.filterEditor.getValue();
			resourceCopy.filter_code = kahuna.resource.filterEditor.getValue();
			KahunaData.update(resourceCopy, function (data) {
				processUpdate(data, notifySaveStatusBoolean);
				$scope.$evalAsync(function () {
					deferred.resolve(data);
				});
			});

			$rootScope.trackAction('resource_saved', { resource_name: $scope.selectedSubResource.name });

			$scope.savedResource = true;
			$timeout(function () {
				deferred.resolve(false);
				$scope.savedResource = false;
			}, 500);
			return deferred.promise;
		};

		function showTableColumns() {
			if ($scope.tableColumns) {
				for (var i = 0; i < $scope.tableColumns.length; i++) {
					delete $scope.tableColumns.checked;
				}
			}
			if ( ! $scope.selectedSubResource) {
				return;
			}
			kahuna.meta.getTableDetails(entityName($scope.selectedSubResource), function (data) {
				// We could get nothing back if the resource's table no longer exists
				if (Object.keys(data).length == 0) {
					putInScope("tableColumns", []);
				}
				else {
					for (var i = 0; i < data.columns.length; i++) {
						var col = data.columns[i];
						col.checked = false;
						var resAtt = getResourceAttributeForColumn(col);
						if (resAtt && (!resAtt['@metadata'].action || resAtt['@metadata'].action != 'DELETE'))
							col.checked = true;
					}
					putInScope("tableColumns", data.columns);
				}
			});
		}

		$scope.exportResource = function exportResource() {
			var iframe = document.getElementById("downloadIframe");
			iframe.src = kahuna.baseUrl + "AllResources" + "?auth=" + kahuna.globals.apiKeyValue +
					":1&filter=root_ident=" + $scope.selectedResource.root_ident + "&downloadName="
					+ $scope.selectedResource.name + ".json";
		};

		// This is a little involved because an exported resource is not a tree,
		// it's an unordered list of resources.
		// So we have to find the root resource first, insert it, then insert
		// its children, then their children, etc...
		$scope.importResourceJson = function importResourceJson() {
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
						if (c === ' ' || c === '\n' || c === '\r' || c === '\t') {
							continue;
						}
						if (c !== '{' && c !== '[') {
							alert("This file does not contain valid JSON.");
							return;
						}
						break;
					}

					var rsrc = null;
					try {
						rsrc = JSON.parse(json);
					} catch (e2) {
						alert('Your JSON file contains an error: ' + e2);
						return;
					}

					var rootResource = _.find(rsrc, function (r) {
						return r.container_ident == null;
					});
					if ( ! rootResource) {
						throw "Unable to find root resource";
					}

					rootResource.name += "_clone";
					var newRootIdent = null;
					importResourceLevel(rootResource);

					function importResourceLevel(res, containerIdent) {
						var originalIdent = res.ident;
						delete res['@metadata'];
						delete res.ident;
						res.root_ident = newRootIdent;
						res.container_ident = containerIdent;
						delete res.entity_name;
						_.each(res.Attributes, function (a) {
							delete a.ident;
							delete a['@metadata'];
							delete a.resource_ident;
						});

						try {
							KahunaData.create("AllResources", res, function (data) {
								var newRes = _.find(data.txsummary, function (b) {
									return b['@metadata'].resource === 'AllResources';
								});
								if ( ! newRes) {
									throw "Unable to find newly created resource";
								}
								setEntityName(newRes);
								inform(newRes, 'created');

								kahuna.resource.allResources[newRes.ident] = newRes;
								if ( ! newRes.entity_name) {
									alert('No entity_name!');
								}

								// If this is the top resource
								if ( ! newRootIdent) {
									newRootIdent = newRes.ident;
									kahuna.applyFunctionInScope($scope, function () {
										kahuna.resource.topResources.push(newRes);
										sortTopResources();
									});
								}

								var children = _.filter(rsrc, function (r) {
									return r.container_ident === originalIdent;
								});
								_.each(children, function (c) {
									importResourceLevel(c, newRes.ident);
								});
							});
						}
						catch(err) {
							alert('Error while importing resource: ' + err);
						}
					}
				};
				reader.readAsText(importFile);
			}
		};

		$scope.importResource = function importResource() {
			setTimeout(function () {
				var options = {
					modal : true,
					buttons : {
						OK : function () {
							$(this).dialog("close");
							$scope.importResourceJson();
							$scope.$apply();
						},
						Cancel : function () {
							$(this).dialog("close");
							$scope.$apply();
						},
					},
					width: 500,
					height: 200
				};
				jqueryUI.wrapper('#newImportDialog', 'dialog', options);
			}, 50);
		};

		/////////////////////////////////////////////////////////////
		// Subresource tree

		// Called by the tree to load a node
		var treeNodeLoad = function (node, fun) {
			if (node == -1) {
				if ( ! $scope.selectedResource) {
					return null;
				}
				topNode = {
					data: 'Resources',
					state: 'open',
					attr: {ident: false, id: 'first-resource-container'},
					children: [{
						data:'All',
						state:'closed',
						attr: {id: 'second-resource-container'}
					}]
				};
				fun(topNode);
			}
			else {
				var nodes = [];
				var parentIdent = node.attr("ident");
				var children = findChildrenOfResource(parentIdent);
				children.forEach(function (child) {
					var node = {"data": child.name, "state": "closed", "attr": {"ident": child.ident, id: 'ident-' + child.ident}};
					nodes.push(node);
				});
				fun(nodes);
			}
		};

		$scope.domSelectActiveResource = function domSelectActiveResource(resource) {
			if (resource.ident) {
				kahuna.saveSetting('ActiveResource', resource.ident);
				$timeout(function () {
					subResourceSelected(resource.ident);
					$('#ident-' + resource.ident + ' > a').click();
				}, 1000);
			}
		};

		$scope.$evalAsync($scope.domSelectActiveResource);

		var firstOpenOperation = false;
		function treeNodeClick(event, dat) {
			$timeout(function () {
				console.log('selected node');
				var nodeIdent = dat.rslt.obj.attr("ident");
				if (!nodeIdent || nodeIdent == "false") {
					$scope.selectedSubResource = null;
					$scope.data.selectedSubResourceTable = null;
					$scope.selectedSubResourceParent = null;
					return;
				}

				subResourceSelected(nodeIdent);
				if (firstOpenOperation) {
					$scope.$broadcast('OpenNodes', '#' + $(dat.rslt.obj[0]).attr('id'));
				}
				else {
					firstOpenOperation = true;
				}
				kahuna.saveSetting('ActiveResource', nodeIdent);
			});
		}

		var openedNodes = false;
		$scope.$on('OpenNodes', _.throttle(function (event, selector) {
			openedNodes = selector;
			$('#treeBox').jstree('open_all', selector);
		}, 1500));
		$scope.resourceTypeSelected = function resourceTypeSelected() {
			$scope.selectedSubResource.resource_type_ident = parseInt($scope.selectedSubResource.resource_type_ident);
			console.log('test', typeof $scope.selectedSubResource.resource_type_ident);
		};

		function subResourceSelected(ident) {
			var selRes = kahuna.resource.allResources[ident];
			putInScope("data.selectedSubResourceTable", kahuna.meta.allTables[selRes.entity_name]);

			putInScope("selectedSubResource", selRes);
			if (selRes.container_ident) {
				putInScope("selectedSubResourceParent", kahuna.resource.allResources[selRes.container_ident]);
			}
			else {
				putInScope("selectedSubResourceParent", null);
			}

			putInScope("tableColumns", []);
			putInScope("selectedColumn", null);
			putInScope("resourceAttribute", null);
			putInScope("showResAttribTable", {value: false});
			showTableColumns();

			if (kahuna.resource.sqlEditor) {
				kahuna.resource.sqlEditor.setValue($scope.selectedSubResource.code_text);
				kahuna.resource.sqlEditor.getSession().getSelection().moveCursorFileStart();
			}
			if (kahuna.resource.filterEditor) {
				kahuna.resource.filterEditor.setValue($scope.selectedSubResource.filter_code);
				kahuna.resource.filterEditor.getSession().getSelection().moveCursorFileStart();
			}
		}

		function treeNodeMove(event, dat) {}
		function treeNodeRename(event, dat) {}
		function treeOpenNode(event, dat) {
			var ident = $(dat.rslt.obj[0]).attr('ident');
			if (ident) {
				$('#treeBox').jstree('open_all', '#' + $(dat.rslt.obj[0]).attr('id'));
			}
		}

		var createTree = _.throttle(function () {
			$("#treeBox").unbind();
			$("#treeBox")
			.bind("select_node.jstree", treeNodeClick)
			.bind("open_node.jstree", treeOpenNode)
			.bind("select_node.jstree", function (e, data) {
				var selectedLength = data.inst.get_selected().length;
				setTimeout(function () {
					if (selectedLength > 1) {
						var $delayedSelected = data.inst.get_selected();
						var $visible = $delayedSelected.find('.jstree-last:visible').last();
						if (!$visible.length) {
							$visible = $delayedSelected.filter(':visible').last();
						}
						angular.forEach($delayedSelected, function (element, index) {
							if ($visible.length && $(element).attr('ident') != $visible.attr('ident')) {
								data.inst.deselect_node(element);
							}
						});
					}
				}, 1000);
			})
			.bind('move_node.jstree', treeNodeMove)
			.bind('rename_node.jstree', treeNodeRename)
			.jstree({
				"core" : {
					"animation": 150
				},
				"ui" : {
					"select_limit": 1
				},
				"json_data" : {
					"data": treeNodeLoad
				},
				"crrm" : {
					"move" : {
						"check_move" : function (data) {
							return false;
							// if (data.np[0].id == "treeBox") { // Do not move anything to the top level
							//    console.log("Move not allowed");
							//    return false;
							// }
							// if (data.o[0].attributes.nodeType.nodeValue == 'Project') {
							//    return false;
							// }
							// return true;
						}
					}
				},
				// "plugins" : [ "themes", "json_data", "ui", "dnd", "crrm", "contextmenu" ]
				types: {
					"default": {
						icon: {
							image: 'test'
						}
					}
				},
				"plugins" : [ "themes", "json_data", "ui", "types" ]
			})
			.bind('loaded.jstree', function (event, data) {
				if (!firstOpenOperation) {
					$scope.$broadcast('OpenNodes', '#treeBox');
					$scope.$evalAsync(function () {
						$scope.$broadcast('CloseNodes', '#second-resource-container');
					});
				}
			});
		}, 1000);

		$scope.$on('CloseNodes', function (event, selector) {
			if (!openedNodes) {
				$('#treeBox').jstree('close_all', selector);
			}
			else {
				setTimeout(function () {
					$('#treeBox').jstree('close_all', selector);
					$('#treeBox').jstree('open_all', selector + ' li:first');
					$(selector + ' li:first > a').click();
				});
			}
		});

		$scope.$watch('apiVersions', function () {
			if (!$scope.active.selectedApiVersion && $scope.apiVersions) {
				$scope.active.selectedApiVersion = $scope.apiVersions[0];
			}
		});

		$scope.updateApiSelection = function () {
			$scope.selectedSubResource = null;
			$scope.$evalAsync(function () {
				loadAllResource().then(function (data) {
					$scope.$broadcast('UpdatedVersionSuccess');
				});
			});
		};

		$scope.$on('UpdatedVersionSuccess', function () {
			$timeout(function () {
				$('#treeBox').jstree('open_node', $('#second-resource-container'));
			}, 150);
		});

		// If user selects a table, guess what the join should be
		$scope.tableSelected = function () {
			if ( ! $scope.selectedSubResource) {
				return;
			}

			if ( ! $scope.selectedSubResource.Attributes) {
				$scope.selectedSubResource.Attributes = [];
			}
			for (var i = 0; i < $scope.selectedSubResource.Attributes.length; i++) {
				$scope.selectedSubResource.Attributes[i]['@metadata'].action = 'DELETE';
			}

			$scope.selectedSubResource.prefix = $scope.data.selectedSubResourceTable.prefix;
			$scope.selectedSubResource.table_name = $scope.data.selectedSubResourceTable.entity;
			$scope.selectedSubResource.entity_name = $scope.data.selectedSubResourceTable.name;

			showTableColumns();

			if ( ! $scope.selectedSubResource.container_ident) {
				$scope.saveResource();
				return;
			}
			else{
				$scope.guessJoin();
				$scope.saveResource();
			}
		};

		// Try to guess the join condition
		$scope.guessJoin = function guessJoin() {
			var superResource = kahuna.resource.allResources[$scope.selectedSubResource.container_ident];
			kahuna.meta.getTableDetails($scope.selectedSubResource.entity_name, function (superTableDetails) {
				var join = '';
				if ($scope.selectedSubResource.is_collection == 'Y') {
					if ( ! superTableDetails.parents) {
						$scope.selectedSubResource.join_condition = '';
						return;
					}
					for (var idx = 0; idx < superTableDetails.parents.length; idx++) {
						var parent = superTableDetails.parents[idx];
						if (parent.parent_table == superResource.entity_name) {
							for (var j = 0; j < parent.parent_columns.length; j++) {
								if (join.length > 0) {
									join += " AND ";
								}
								join += parent.child_columns[j] + ' = [' + parent.parent_columns[j] + ']';
							}
						}
						if (join.length > 0) break;
					}
				}
				else {
					if ( ! superTableDetails.children) {
						$scope.selectedSubResource.join_condition = '';
						return;
					}
					for (var idx = 0; idx < superTableDetails.children.length; idx++) {
						var child = superTableDetails.children[idx];
						if (child.child_table == superResource.entity_name) {
							for (var j = 0; j < child.child_columns.length; j++) {
								if (join.length > 0)
									join += " AND ";
								join += child.parent_columns[j] + ' = [' + child.child_columns[j] + ']';
							}
						}
						if (join.length > 0) break;
					}
				}

				$scope.selectedSubResource.join_condition = join;
				kahuna.setInScope($scope, 'selectedSubResource', $scope.selectedSubResource);
			});
		};

		$scope.isCollectionClicked = function () {
			$scope.guessJoin();
		};

		$scope.getColumnClass = function (col) {
			if (col == $scope.selectedColumn) {
				return 'Checklist Selected';
			}
			return 'Checklist';
		};

		$scope.columnClicked = function (col) {
			$scope.selectedColumn = col;
			$scope.resourceAttribute = getResourceAttributeForColumn(col);
			$scope.showResAttribTable.value = col.checked;
		};

		// When the user changes the value of the checkbox for an attribute
		$scope.columnSelectChanged = function (col) {
			if (col.checked) {
				$scope.showResAttribTable.value = true;
				$scope.resourceAttribute = getResourceAttributeForColumn(col);
				if ( ! $scope.resourceAttribute) {
					$scope.resourceAttribute = {
						"@metadata": { action: "INSERT" },
						resource_ident: $scope.selectedSubResource.ident,
						name: col.name,
						column_name: col.name
					};
					$scope.selectedSubResource.Attributes.push($scope.resourceAttribute);
				}
			}
			else {
				$scope.showResAttribTable.value = false;
				$scope.resourceAttribute = null;
				var attrib = getResourceAttributeForColumn(col);
				if ( ! attrib)
					throw "Unable to find resource attribute for column: " + col;
				if ( ! attrib['@metadata'] || !attrib['@metadata'].href) {
					var idx = $scope.selectedResource.Attributes.indexOf(attrib);
					$scope.selectedSubResource.Attributes.splice(idx, 1);
				}
				else {
					attrib['@metadata'].action = 'DELETE';
				}
			}
			$scope.columnClicked(col);
		};

		// Select all columns as attributes
		$scope.selectAllColumns = function () {
			var i, col;
			for (i = 0; i < $scope.tableColumns.length; i++) {
				col = $scope.tableColumns[i];
				if (!col.checked) {
					col.checked = true;
					$scope.columnSelectChanged(col);
				}
			}
		};

		///////////////////////////////////////////////////////////////////////////////////////
		// JSON test tab
		$scope.params = $rootScope.params;

		// Get all API keys for the current project, for the dropdown in the Test tab.
		KahunaData.query('admin:apikeys', 'project_ident=' + $rootScope.currentProject.ident, function (data) {
			if (data.length > 0) {
				$scope.params.selectedApiKey = data[0];
			}
			$scope.apiKeys = data;
		});

		// Grab a sample JSON from the server using the currently selected resource, and the selected API key,
		// and display it in the CodeMirror widget.
		$scope.fetchJson = function () {
			var boxElem = document.getElementById('jsonTextBox');
			if ( ! boxElem) {
				return;
			}
			kahuna.resource.aceEditor = ace.edit("jsonTextBox");
			kahuna.resource.aceEditor.setTheme("ace/theme/xcode");
			kahuna.resource.aceEditor.getSession().setMode("ace/mode/json");
			if ( ! $scope.params.selectedApiKey) {
				alert('You must have an API key before you can do this.');
				return;
			}

			console.log(_.indexBy($scope.allResources, 'ident'), $scope.selectedSubResource);

			var rootResource = $scope.selectedSubResource;
			if (rootResource.root_ident != rootResource.ident) {
				var allRootResource = _.indexBy($scope.allResources, 'ident');
				rootResource = allRootResource[rootResource.root_ident];
			}

			KahunaData.queryWithKey(kahuna.serverUrl + $scope.currentAccount.url_name + '/' +
					$scope.currentProject.url_name + '/' + $scope.active.selectedApiVersion.name + '/' +
					rootResource.name, $scope.queryParams, $scope.params.selectedApiKey, function (data) {
				var formattedJson = kahuna.util.formatToJson(data);
				kahuna.resource.aceEditor.setValue(formattedJson);
				kahuna.resource.aceEditor.getSession().getSelection().moveCursorFileStart();
			});
		};

		$scope.goToRestlab = function goToRestlab() {
			$scope.saveResource(false).then(function () {
				$location.path('/projects/' + $rootScope.currentProject.ident + '/restlab');
				$rootScope.selectedSubResource = $scope.selectedSubResource;
			});
		};

		$scope.getApiVersionIndex = function getApiVersionIndex(versionName) {
			// get the current version object
			var versionObj = _.indexBy($scope.apiVersions, 'name')[versionName];
			// return the index
			return $scope.apiVersions.indexOf(versionObj);
		};

		// versionName LIKE 'v1' || 'v2'
		$scope.triggerApiSelection = function triggerApiSelection (versionName) {
			$scope.active.selectedApiVersion = $scope.apiVersions[$scope.getApiVersionIndex(versionName)];
			$scope.updateApiSelection($scope.active.selectedApiVersion);
		};
		$scope.$on('CreateTableResource', function (event, table) {
			$scope.createResource(table, table.entity + 'Resource');
		});

		if (angular.isDefined($rootScope.syncAction.resources)) {
			var currentAction = angular.copy($rootScope.syncAction.resources);
			console.log(currentAction);
			if (currentAction.action === 'create') {
				$timeout(function () {
					$scope.triggerApiSelection(currentAction.version);
					$timeout(function () { $scope.$broadcast('CreateTableResource', currentAction.table); });
				}, 1500);
			}
			if (currentAction.action === 'edit') {
				$timeout(function () {
					kahuna.saveSetting('ActiveResource', currentAction.resource.ident);
					$scope.triggerApiSelection(currentAction.version);
					$timeout(function () { $scope.domSelectActiveResource(currentAction.resource); }, 0);
				}, 1500);

			}
			delete $rootScope.syncAction.resources;
		}
	}
};
