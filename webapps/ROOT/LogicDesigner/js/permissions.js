kahuna.permission = {
	PermissionsCtrl : function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData) {
		$scope.allTables = kahuna.meta.allTables;
		$scope.selectedTable = kahuna.util.getFirstProperty($scope.allTables);

		$scope.roleSelected = function() {
			KahunaData.query('admin:tablepermissions', 'role_ident=' + $scope.selectedRole.ident, function (data) {
				$scope.perms = data;
				if (data.length > 0) {
					$scope.selectedPerm = $scope.perms[0];
					$scope.permSelected();
				}
			});
		};

		$scope.createPerm = function () {
			var newPerm = {
					role_ident: $scope.selectedRole.ident,
					entity_name: $scope.selectedTable.name,
					name: 'New permission',
					access_type: 'N'
				};
			KahunaData.create('admin:tablepermissions', newPerm, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:tablepermissions' && modObj['@metadata'].verb === 'INSERT') {
						$scope.perms.push(modObj);
						$scope.selectedPerm = modObj;
					}
				}
			});
		};

		// Given a TablePermission object, find its index in $scope.perms, based on its ident.
		var findPermIndex = function (perm) {
			if ( ! $scope.perms)
				return -1;
			for (var idx = 0; idx < $scope.perms.length; idx++) {
				if ($scope.perms[idx].ident == perm.ident)
					return idx;
			}
		};

		$scope.deletePerm = function () {
			if ( ! confirm("Are you sure you want to delete this permission (" + $scope.selectedPerm.name + ")?"))
				return;
			KahunaData.remove($scope.selectedPerm, function(data){
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:tablepermissions' && modObj.ident === $scope.selectedPerm.ident) {
						var deletedIndex = findPermIndex(modObj);
						$scope.perms.splice(deletedIndex, 1);
						if ($scope.perms.length > 0)
							$scope.selectedPerm = $scope.perms[0];
						else {
							$scope.selectedPerm = null;
							$scope.permAccessRead = false;
							$scope.permAccessInsert = false;
							$scope.permAccessUpdate = false;
							$scope.permAccessDelete = false;
						}
					}
				}
			});
		};

		$scope.permSelected = function () {
			$scope.permAccessRead = $scope.selectedPerm.access_type.indexOf('A') > -1 || $scope.selectedPerm.access_type.indexOf('R') > -1;
			$scope.permAccessInsert = $scope.selectedPerm.access_type.indexOf('A') > -1 || $scope.selectedPerm.access_type.indexOf('I') > -1;
			$scope.permAccessUpdate = $scope.selectedPerm.access_type.indexOf('A') > -1 || $scope.selectedPerm.access_type.indexOf('U') > -1;
			$scope.permAccessDelete = $scope.selectedPerm.access_type.indexOf('A') > -1 || $scope.selectedPerm.access_type.indexOf('D') > -1;
		};

		$scope.savePerm = function () {
			if ($scope.permAccessRead && $scope.permAccessInsert && $scope.permAccessUpdate && $scope.permAccessDelete) {
				$scope.selectedPerm.access_type = 'A';
			}
			else {
				var permStr = '';
				if ($scope.permAccessRead) permStr += 'R';
				if ($scope.permAccessInsert) permStr += 'I';
				if ($scope.permAccessUpdate) permStr += 'U';
				if ($scope.permAccessDelete) permStr += 'D';
				if (permStr == '')
					permStr = 'N';
				$scope.selectedPerm.access_type = permStr;
			}

			KahunaData.update($scope.selectedPerm, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:tablepermissions' && modObj.ident === $scope.selectedPerm.ident) {
						var updatedIndex = findPermIndex(modObj);
						$scope.perms[updatedIndex] = modObj;
						$scope.selectedPerm = modObj;
					}
				}
			});
		};
	}
};
