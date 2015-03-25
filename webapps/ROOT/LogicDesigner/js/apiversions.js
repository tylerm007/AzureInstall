kahuna.apiversions = {

	ApiVersionsCtrl: function($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData) {

		$rootScope.currentPage = 'apiversions';
		$rootScope.currentPageHelp = 'docs/rest-apis/urls#TOC-API-version-Request';
		$rootScope.helpDialog('apiversions', 'Help', localStorage['eslo-ld-learn-complete']);

		// Fetch all API versions for the current project
		kahuna.meta.getAllApiVersions($rootScope.currentProject, function (data) {
			$scope.selectedApiVersion = null;
			$scope.apiVersions = data;
			if (data.length == 0)
				return;
			kahuna.applyFunctionInScope($scope, function() {
				$scope.selectedApiVersion = data[data.length - 1];
			});
		});

		var findApiVersionIndex = function(version) {
			if ( ! $scope.apiVersions)
				return -1;
			for (var idx = 0; idx < $scope.apiVersions.length; idx++) {
				if ($scope.apiVersions[idx].ident == version.ident)
					return idx;
			}
		};

		// Update the currently selected API version
		$scope.saveApiVersion = function() {
			KahunaData.update($scope.selectedApiVersion, function(data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:apiversions' && modObj.ident === $scope.selectedApiVersion.ident) {
						var updatedIndex = findApiVersionIndex(modObj);
						$scope.apiVersions[updatedIndex] = modObj;
						$scope.selectedApiVersion = modObj;
					}
				}
				kahuna.meta.getAllApiVersions($rootScope.currentProject, function () {
					kahuna.applyFunctionInScope($scope, function () {
						kahuna.setLiveBrowserUrl($rootScope, $scope.currentProject);
					});
				});
				kahuna.util.info('API version was saved');
			});
		};

		// Create a new API version
		$scope.createApiVersion = function() {
			// Look for available name, starting with v1 and going up
			var versionName = 'v1';
			if ($scope.apiVersions) {
				for (var versionNumber = 1; versionNumber < 10000; versionNumber++) {
					var tentativeName = 'v' + versionNumber;
					if ($scope.apiVersions.some(function(version) { return version.name == tentativeName; })) {
						continue;
					}
					versionName = 'v' + versionNumber;
					break;
				}
			}
			var newObj = {
					"project_ident": $scope.currentProject.ident,
					"name": versionName
				};
			KahunaData.create('admin:apiversions', newObj, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:apiversions' && modObj['@metadata'].verb === 'INSERT') {
						$scope.apiVersions.push(modObj);
						$scope.selectedApiVersion = modObj;

					}
				}
				kahuna.meta.getAllApiVersions($rootScope.currentProject, function () {
					kahuna.applyFunctionInScope($scope, function () {
						kahuna.setLiveBrowserUrl($rootScope, $scope.currentProject);
					});
				});
			});
		};

		$scope.deleteApiVersion = function() {
			if ( ! confirm("Are you sure you want to delete this API version (" + $scope.selectedApiVersion.name +
					")? This will also delete all the resources it contains."))
				return;

			// If this is a brand-new, not-yet-saved object
			if ( ! $scope.selectedApiVersion['@metadata']) {

				// Remove from list
				var idx = $scope.apiVersions.indexOf($scope.selectedApiVersion);
				if (idx > -1) {
					$scope.apiVersions.splice(idx, 1);

					// And select whatever API version is left
					if ($scope.apiVersions.length > 0)
						$scope.selectedApiVersion = $scope.apiVersions[0];
					else
						$scope.selectedApiVersion = null;
				}
				return;
			}

			KahunaData.remove($scope.selectedApiVersion, function(data){
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:apiversions' && modObj.ident === $scope.selectedApiVersion.ident) {
						var deletedIndex = findApiVersionIndex(modObj);
						$scope.apiVersions.splice(deletedIndex, 1);
						if ($scope.apiVersions.length > 0) {
							$scope.selectedApiVersion = $scope.apiVersions[0];
						}
						else {
							$scope.selectedApiVersion = null;
						}
					}
				}
				kahuna.meta.getAllApiVersions($rootScope.currentProject, function () {
					kahuna.applyFunctionInScope($scope, function () {
						kahuna.setLiveBrowserUrl($rootScope, $scope.currentProject);
					});
				});
				kahuna.util.info('API version was deleted');
			});
		};
	}
};
