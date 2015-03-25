kahuna.role = {

	RoleCtrl : function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData) {

		$rootScope.currentPage = 'roles';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authorization#TOC-Role-Permissions';

		$scope.data = {};
		$scope.currentProject = $rootScope.currentProject;

		$scope.allTables = kahuna.meta.allTables;
		$scope.allViews = kahuna.meta.allViews;
		$scope.allProcedures = kahuna.meta.allProcedures;
		$scope.allResources = kahuna.meta.allResources;

		// $scope.apiVisibility
		// .serverData - data from server from AllRoles.ApiVisibility aliased into a 2-level map
		// .rawData - data as AllProjects.Tables, etc. mapped by name
		// .lists - used for drawing screen and for updates
		// each array entry contains
		// name
		// enabled
		// serverRef - is only non-null when there is a record in apivisibilities

		// .enableAll - which are fully enabled - will hide each list and replace description
		$scope.apiVisibility = (function () {
			var obj = {
				names : {
					TABLE : { apiType : "TABLE", code : "T", title : "Table", titlePlural : "Tables" },
					VIEW : {  apiType : "VIEW", code :"V",title :"View", titlePlural : "Views" },
					RESOURCE : {  apiType : "RESOURCE", code :"R", title :"Resource", titlePlural : "Resources" },
					PROCEDURE : {  apiType : "PROCEDURE", code : "P",title :"Procedure", titlePlural : "Procedures" },
					METATABLE : {  apiType : "METATABLE", code : "M", title : "Meta Table", titlePlural : "Meta Tables" }
				},
				orderedNames : null,
				serverData : null,
				lists : {},
				enableAll : {},
				rawData : {}
			};
			obj.orderedNames = [obj.names.TABLE, obj.names.VIEW, obj.names.PROCEDURE, obj.names.RESOURCE, obj.names.METATABLE];

			for (var apiType in obj.names) {
				obj.enableAll[apiType] = false;
				obj.lists[apiType] =[];
				obj.rawData[apiType] = [];
			}

			return obj;
		})();

		$scope.setAllApiType = function (apitype, val) {
			var list = $scope.apiVisibility.lists[apitype];
			var apiname = undefined;
			for (apiname in list) {
				var myapiobj = list[apiname];
				if (val !== myapiobj.enabled) {
					myapiobj.enabled= val;
				}
			}
		};

		// Fetch all roles for the current project
		KahunaData.query('AllRoles', {
			filter : 'project_ident=' + $scope.currentProject.ident,
			pagesize : 100
		}, function (data) {
			kahuna.applyFunctionInScope($scope, function () {
				$scope.data.selectedRole = null;
				$scope.data.roles = data;
				if (data.length) {
					$scope.data.selectedRole = data[0];
				}
				$scope.roleSelected();
			});
		});

		var findRoleIndex = function (role) {
			if ($scope.data.roles) {
				for (var idx = 0; idx < $scope.data.roles.length; idx += 1) {
					if ($scope.data.roles[idx].ident === role.ident) {
						return idx;
					}
				}
			}
			return -1;
		};

		$scope.saveRole = function () {
			var permStr = '';
			if ($scope.data.roleAccessRead) permStr += 'R';
			if ($scope.data.roleAccessInsert) permStr += 'I';
			if ($scope.data.roleAccessUpdate) permStr += 'U';
			if ($scope.data.roleAccessDelete) permStr += 'D';
			if (permStr == '') permStr = 'N';
			if ("RIUD" === permStr) permStr = 'A';
			$scope.data.selectedRole.default_permission = permStr;

			$scope.data.selectedRole.default_apivisibility = (function () {
				var s = '', i = undefined, j, list;
				for (i in $scope.apiVisibility.names) {
					if ($scope.apiVisibility.enableAll[i]) {
						s += $scope.apiVisibility.names[i].code;

						// mark disabled any enabled ones so they are deleted - the enableAll will grant them permission
						// if we want to remember the selection across changes in enableAll and saves
						// remove this block
						list = $scope.apiVisibility.lists[i];
						for (j = 0; j < list.length; ++j) {
							if (list[j].enabled) {
								list[j].enabled = false;
							}
						}
					}
				}
				return s;
			})();

			for (var i = 0; i < $scope.data.selectedRole.PermissionData.length; i++) {
				$scope.data.selectedRole.PermissionData[i].query_order = i + 1;
			}

			var apitype = undefined;
			for (apitype in  $scope.apiVisibility.names) {
				var list = $scope.apiVisibility.lists[apitype];
				for (i = 0; i < list.length; ++i) {
					apiobj = list[i];
					// enabled   serverRef
					//   T       exists      no action
					//   T       null        create
					//   F       exists      delete
					//   F       null        no action
					if (apiobj.enabled) {
						if (null === apiobj.serverRef) {
							var newobj = {
								"@metadata" : { action : "INSERT" },
								apitype : apitype,
								role_ident : $scope.data.selectedRole.ident
							};
							if ("RESOURCE" === apitype) {
								newobj.resource_ident = apiobj.resourceIdent;
								newobj.object_name = "resource=" + apiobj.resourceIdent;
							}
							else {
								newobj.resource_ident = null;
								newobj.object_name = apiobj.name;
							}
							$scope.data.selectedRole.ApiVisibility.push(newobj);
						}
					}
					else {
						if (null !== apiobj.serverRef) {
							apiobj.serverRef["@metadata"]["action"] = "DELETE";
						}
					}
				}
			}

			KahunaData.update($scope.data.selectedRole, function (txresult) {
				if (txresult.txsummary.length > 0) {
					KahunaData.query('AllRoles/' + $scope.data.selectedRole.ident, null, function (updatedRoleData) {
						if (updatedRoleData.length > 0) {
							updated = updatedRoleData[0];
							var updatedIndex = findRoleIndex(updated);
							if (updatedIndex >= 0) {
								$scope.data.roles[updatedIndex] = updated;
								$scope.data.selectedRole = updated;
							}
							else {
								$scope.data.selectedRole = null;
							}
							$scope.roleSelected();

							$scope.refreshApiVisibility();
							kahuna.util.info('Role "' + updated.name + '" was saved');
						}
					});
				}
			});
		};

		$scope.roleSelected = function () {
			var default_permission = ($scope.data.selectedRole && $scope.data.selectedRole.default_permission) || '';
			$scope.data.roleAccessRead = default_permission.indexOf('A') > -1 || default_permission.indexOf('R') > -1;
			$scope.data.roleAccessInsert = default_permission.indexOf('A') > -1 || default_permission.indexOf('I') > -1;
			$scope.data.roleAccessUpdate = default_permission.indexOf('A') > -1 || default_permission.indexOf('U') > -1;
			$scope.data.roleAccessDelete = default_permission.indexOf('A') > -1 || default_permission.indexOf('D') > -1;

			var  default_apivisibility = ($scope.data.selectedRole && $scope.data.selectedRole.default_apivisibility) || '';
			$scope.apiVisibility.enableAll["TABLE"] = default_apivisibility.indexOf('T') > -1;
			$scope.apiVisibility.enableAll["VIEW"] = default_apivisibility.indexOf('V') > -1;
			$scope.apiVisibility.enableAll["RESOURCE"] = default_apivisibility.indexOf('R') > -1;
			$scope.apiVisibility.enableAll["PROCEDURE"] = default_apivisibility.indexOf('P') > -1;
			$scope.apiVisibility.enableAll["METATABLE"] = default_apivisibility.indexOf('M') > -1;

			if ($scope.data.selectedRole && $scope.data.selectedRole.PermissionData && $scope.data.selectedRole.PermissionData.length > 0) {
				$scope.data.selectedPermData = $scope.data.selectedRole.PermissionData[0];
			}
			else {
				$scope.data.selectedPermData = null;
			}
			$scope.permdata.perms = null;
			$scope.permdata.selectedPerm = null;
			$scope.permSelected();

			if ($scope.data.selectedRole) {
				KahunaData.query('admin:tablepermissions', {
					filter : 'role_ident=' + $scope.data.selectedRole.ident,
					pagesize : 100
				}, function (data) {
					$scope.permdata.perms = data;
					if (data.length > 0) {
						$scope.permdata.selectedPerm = $scope.permdata.perms[0];
					}
					$scope.permSelected();
					$scope.refreshApiVisibility();
				});
			}
			else {
				$scope.refreshApiVisibility();
			}
		};

		$scope.refreshApiVisibility = function () {
			var apiVisibilityServerData = ($scope.data.selectedRole && $scope.data.selectedRole.ApiVisibility) || [];
			var i, serverData, list, rawData, idval, myobj, myapitype;
			var apiType = undefined;
			var map = {};
			for (apiType in $scope.apiVisibility.names) {
				map[apiType] = {};
			}

			for (i = 0; i < apiVisibilityServerData.length; ++i) {
				myobj = apiVisibilityServerData[i];
				myapitype = myobj.apitype;
				if (map.hasOwnProperty(myapitype)) {
					idval = "RESOURCE" === myapitype ? myobj.resource_ident : myobj.object_name;
					map[myapitype][idval] = myobj;
				}
			}

			$scope.apiVisibility.serverData = map;

			for (apiType in $scope.apiVisibility.names) {
				serverData = map[apiType];
				// brand new
				$scope.apiVisibility.lists[apiType] = [];
				list = $scope.apiVisibility.lists[apiType];
				rawData = $scope.apiVisibility.rawData[apiType];
				$scope.mergeUpdateApiVisibility(apiType, list, rawData, serverData);
			}

			$scope.applyList("TABLE", $scope.allTables);
			$scope.applyList("PROCEDURE", $scope.allProcedures);
			$scope.applyList("VIEW", $scope.allViews);
			$scope.applyList("RESOURCE", $scope.allResources);
		};

		$scope.mergeUpdateApiVisibility = function (apiType, list, rawData, serverData) {
			// go thru each the onscreen list
			// REMOVE reference to any old server entry no longer available
			// REMOVE non server entries that are NOT in rawData
			// add serverRef for entries already there and not so marked
			var idval, found = {}, i, obj;
			for (i = 0; i < list.length; ++i) {
				obj = list[i];
				idval = "RESOURCE" === apiType ? obj.resourceIdent : obj.name;
				found[idval] = obj;
				if (null == obj.serverRef) {
					if (serverData.hasOwnProperty(idval)) {
						obj.serverRef = serverData[idval];
					}
				}
				else {
					if (!serverData.hasOwnProperty(idval)) {
						obj.serverRef =  null;
					}
				}

				// not in either list of tables or list of apivisibilities, delete
				if (!rawData.hasOwnProperty(idval) && !serverData.hasOwnProperty(idval)) {
					list.splice(i, 1);
					--i;
					continue;
				}
			}

			// go thru serverData and add any not added
			for (i in serverData) {
				var sd = serverData[i];
				idval = "RESOURCE" === apiType ? sd.resource_ident : sd.object_name;

				if (!found.hasOwnProperty(idval)) {
					var theResourceIdent, theName, theApiVersion;
					if ("RESOURCE" === apiType) {
						theResourceIdent = sd.Resource.ident;
						theApiVersion = sd.Resource.ApiVersion.name;
						theName = sd.Resource.name;
					}
					else {
						theResourceIdent = null;
						theApiVersion = null;
						theName = sd.object_name;
					}
					found[idval] = sd;
					list.push({
						resourceIdent : theResourceIdent,
						apiVersion : theApiVersion,
						name : theName,
						enabled : true,
						serverRef : sd
					});
				}
			}

			// go thru rawData and add any not added
			for (i in rawData) {
				var rd = rawData[i];
				idval = "RESOURCE" === apiType ? rd.ident : rd.name;
				if (!found.hasOwnProperty(idval)) {
					found[idval] = rd;
					list.push({
						resourceIdent : "RESOURCE" === apiType ? rd.ident : null,
						apiVersion : "RESOURCE" === apiType ? rd.apiVersion : null,
						name : rd.name,
						enabled : false,
						serverRef : null
					});
				}
			}
		};

		$scope.applyList = function (apiType, apiData) {
			$scope.apiVisibility.rawData[apiType] = apiData;
			var serverData = $scope.apiVisibility.serverData[apiType];
			var list = $scope.apiVisibility.lists[apiType];
			var rawData = $scope.apiVisibility.rawData[apiType];
			$scope.mergeUpdateApiVisibility(apiType, list, rawData, serverData);
		};

		$scope.createRole = function () {
			var newRoleName = 'New Role';
			if ($scope.data.roles) {
				for (var i = 1; i < 10000; i++) {
					var tentativeName = 'New Role ' + i;
					if ($scope.data.roles.some(function (role) {
						return role.name === tentativeName;
					})) {
						continue;
					}
					newRoleName = 'New Role ' + i;
					break;
				}
			}
			var newRole = {
				"project_ident" : $scope.currentProject.ident,
				"name" : newRoleName,
				"default_permission" : "N",
				"default_apivisibility" : "TVRPM"
			};
			KahunaData.create("AllRoles", newRole, function (data) {
				if (201 !== data.statusCode) {
					console.log("trouble in paradise");
				}

				var inserted = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(data.txsummary, 'AllRoles', 'INSERT'));
				if (inserted) {
					var newRoleIdent = inserted.ident;
					KahunaData.query('AllRoles/' + newRoleIdent, {
						pagesize : 100
					}, function (newroledata) {
						kahuna.applyFunctionInScope($scope, function () {
							if (newroledata.length) {
								$scope.data.roles.push(newroledata[0]);
								$scope.data.selectedRole = newroledata[0];
								$scope.roleSelected();
								kahuna.util.info('Created "' + newRoleName + '" (' + newRoleIdent + ')');
							}
						});
					});
				}
			});
			kahuna.logEvalProgress("created role", $scope.data.roles.length);
		};

		$scope.deleteRole = function () {
			if (!$scope.data.selectedRole) {
				return;
			}
			var deletedName = $scope.data.selectedRole.name;
			if (!confirm("Are you sure you want to delete role " + deletedName
					+ "? This will also delete all the associated settings and permissions."))
				return;
			KahunaData.remove($scope.data.selectedRole, function (data) {
				var deleted = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(data.txsummary, 'AllRoles', 'DELETE'));
				if (deleted) {
					var deletedIndex = findRoleIndex(deleted);
					if (-1 !== deletedIndex) {
						$scope.data.roles.splice(deletedIndex, 1);
						if ($scope.data.roles.length > 0) {
							$scope.data.selectedRole = $scope.data.roles[Math.min($scope.data.roles.length - 1, deletedIndex)];
						}
						else {
							$scope.data.selectedRole = null;
						}
						$scope.roleSelected();
					}
					kahuna.util.info('Role "' + deleted.name + '" has been deleted');
				}
			});
		};

		$scope.filterPermData = function () {
			return function (permData) {
				return !permData['@metadata'] || permData['@metadata'].action != 'DELETE';
			};
		};

		$scope.upcaseName = function (arg) {
			return arg.name.toUpperCase();
		};

		$scope.upcaseApiVersion = function (arg) {
			return arg.apiVersion.toUpperCase();
		};

		// Make a list of all active prefixes
		$scope.allDbPrefixes = [];
		kahuna.meta.getAllSchemas($scope.currentProject, function(data) {
			for (var i = 0; i < kahuna.meta.allSchemas.length; i++) {
				var sch = kahuna.meta.allSchemas[i];
				if (sch.active) {
					$scope.allDbPrefixes.push(sch.prefix);
				}
			}
		});

		$scope.createPermData = function () {
			var newPermDataName = 'Data';
			if ($scope.data.selectedRole.PermissionData.length > 0) {
				for (var i = 1; i < 10000; i++) {
					var tentativeName = 'Data ' + i;
					if ($scope.data.selectedRole.PermissionData.some(function (permData) {
						return permData.name == tentativeName;
					})) {
						continue;
					}
					newPermDataName = 'Data ' + i;
					break;
				}
			}
			var prefix = kahuna.util.getFirstProperty($scope.dbPrefixes);
			prefix = prefix || 'main';
			console.log('setting prefix for permission data to ' + prefix);
			var newPermData = {
				"@metadata" : {
					action : "INSERT"
				},
				name : newPermDataName,
				prefix: prefix,
				query : "'Hello'",
				query_order : $scope.data.selectedRole.PermissionData.length + 1,
				required : true,
				code_type : 'SQL',
				role_ident : $scope.data.selectedRole.ident
			};
			$scope.data.selectedRole.PermissionData.push(newPermData);
			$scope.data.selectedPermData = newPermData;
		};

		$scope.deletePermData = function () {
			$scope.data.selectedPermData['@metadata'].action = 'DELETE';
			$scope.data.selectedPermData = null;
			for (var i = 0; i < $scope.data.selectedRole.PermissionData.length; i++) {
				var pd = $scope.data.selectedRole.PermissionData[i];
				if (!pd['@metadata'] || pd['@metadata'].action != 'DELETE') {
					$scope.data.selectedPermData = pd;
					break;
				}
			}
		};

		// ////////////////////////////////////////////////////////////////////////////////
		// Permissions tab
		$scope.selectedTable = kahuna.util.getFirstProperty($scope.allTables);
		$scope.permdata = {};
		$scope.permdata.perms = [];

		$scope.createPerm = function () {
			var newPerm = {
				role_ident : $scope.data.selectedRole.ident,
				entity_name : $scope.selectedTable.name,
				name : 'New permission',
				access_type : 'N'
			};
			var scope = $scope;
			KahunaData.create('admin:tablepermissions', newPerm, function (data) {
				var inserted = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(data.txsummary, 'admin:tablepermissions', 'INSERT'));
				if (inserted) {
					scope.permdata.perms.push(inserted);
					scope.permdata.selectedPerm = inserted;
					scope.permSelected()

					kahuna.util.info('Permission "' + inserted.name + '" (' + inserted.ident + ') created.');
				}
			});
		};

		// Given a TablePermission object, find its index in $scope.perms, based on its ident.
		var findPermIndex = function (perm) {
			if (!$scope.permdata.perms)
				return -1;
			for (var idx = 0; idx < $scope.permdata.perms.length; idx++) {
				if ($scope.permdata.perms[idx].ident == perm.ident)
					return idx;
			}
		};

		$scope.deletePerm = function () {
			if (!confirm('Are you sure you want to delete this permission "' + $scope.permdata.selectedPerm.name + '" (' + $scope.permdata.selectedPerm.ident + ')?'))
				return;
			KahunaData.remove($scope.permdata.selectedPerm, function (data) {
				var deleted = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(data.txsummary, 'admin:tablepermissions', 'DELETE'));
				if (deleted) {
					kahuna.util.info('Permission "' + deleted.name + '" (' + deleted.ident + ') was deleted.');
					var deletedIndex = findPermIndex(deleted);
					$scope.permdata.perms.splice(deletedIndex, 1);
					if ($scope.permdata.perms.length > 0) {
						// set the active to the one just below where we deleted (if possible)
						if (deletedIndex >= $scope.permdata.perms.length) {
							deletedIndex = $scope.permdata.perms.length - 1;
						}
						$scope.permdata.selectedPerm = $scope.permdata.perms[deletedIndex];
					}
					else {
						$scope.permdata.selectedPerm = null;
					}
					$scope.permSelected();
				}
			});
		};

		$scope.permSelected = function () {
			var pd = $scope.permdata;
			var permStr = (pd.selectedPerm && pd.selectedPerm.access_type) || 'N';
			if (permStr == 'A') permStr = 'RIUD';
			pd.permAccessRead = permStr.indexOf('R') > -1;
			pd.permAccessInsert = permStr.indexOf('I') > -1;
			pd.permAccessUpdate = permStr.indexOf('U') > -1;
			pd.permAccessDelete = permStr.indexOf('D') > -1;
		};

		$scope.savePerm = function () {
			var permStr = '';
			var pd = $scope.permdata;
			if (pd.permAccessRead) permStr += 'R';
			if (pd.permAccessInsert) permStr += 'I';
			if (pd.permAccessUpdate) permStr += 'U';
			if (pd.permAccessDelete) permStr += 'D';
			if (permStr == '') permStr = 'N';
			if (permStr == 'RIUD') permStr = 'A';
			pd.selectedPerm.access_type = permStr;

			KahunaData.update(pd.selectedPerm, function (data) {
				var modObj = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(data.txsummary, 'admin:tablepermissions', 'UPDATE'));
				if (modObj) {
					var updatedIndex = findPermIndex(modObj);
					pd.perms[updatedIndex] = modObj;
					pd.selectedPerm = modObj;
					$scope.permSelected();
					kahuna.util.info('Permission "' + pd.selectedPerm.name + '" (' + pd.selectedPerm.ident + ') was saved.');
				}
				else {
					kahuna.util.info('Permission "' + pd.selectedPerm.name + '" (' + pd.selectedPerm.ident + ') unchanged');
				}
			});
		};
	}
};
