espresso.app.controller('espresso.ResourceMainList', [
	'$rootScope', '$scope', 'Events', 'EspressoData', 'ResourceHelper', '$timeout',
	function ($rootScope, $scope, Events, EspressoData, ResourceHelper, $timeout) {
		$rootScope.refreshResourceEndpoints();
		var resource = {}; //current resource object
		$scope.gridData = [];
		$scope.gridControls = {};
		if (!ResourceHelper.isInitialized()) {
			ResourceHelper.initialize();
		}

		Events.on('InitLayoutToggle', function (event, data) {
			if (ResourceHelper.isRestorable(data)) {
				ResourceHelper.restoreLastRow();
			}
			else {
				ResourceHelper.saveCurrentRow();
			}
		});
		Events.on('WatchResourceRow', function (event, data) {
			ResourceHelper.resourceRow = data.row;
		});
		
		//sync as defined by an @resource request
		$scope.getEndpointDefinition = function getEndpointDefinition(endpoint) {
			return $rootScope.root.allResources[endpoint];
		};
		//async request : as defined by @resource/{resourceId}
		$scope.getResourceDetails = function getResourceDetails(resourceId) {
			var request = EspressoData.appQuery('@resources/' + resourceId);
			return request.then(function (data) {
			});
			//*/
		};
		
		Events.on('ResourceEndpointUpdated', function (event, endpoint) {
			var details = $scope.getEndpointDefinition(endpoint);
			if (details) {
				$scope.getResourceDetails(details.ident);
			}
		});

		Events.on('ResourceDataUpdate', function (event, data) {
			if (angular.isArray(data)) {				
				//listable data
				$scope.columns = ResourceHelper.getGridColumns(data);
				
				$scope.gridData = data;

				Events.broadcast('WatchResourceRow', {row: data[0]});
			}
			else if(angular.isObject(data)) {
				//apparently a single object, not worth listing:
				//broadcast to ResourceForm
				var broadcast = {
					row: data,
				};
				Events.broadcast('WatchResourceRow', broadcast);
			}
		});
		
		$rootScope.$watch('root.endpoint', function (current) {
			if (current) {
				$scope.getResourceEndpointData();
			}
		});
		
		$rootScope.root.newEndpointSelected = function newEndpointSelected() {
			$scope.getResourceEndpointData();
		};

		var currentData = []; //used when merging a fetch
		$scope.getResourceEndpointData = function () {
			resource = $rootScope.root.allResources[$rootScope.root.endpoint];
			
			EspressoData.queryResource(resource.name).success(function (data) {
				currentData = data;
				$scope.gridData = [];
				Events.broadcast('ResourceDataUpdate', data);
			})['error'](function () {
				$scope.gridData = [];
			});
		};
		
		Events.on('ResourceFetchMore', function (event, data) {
			EspressoData.queryResource(data.url).success(function (appendData) {
				Events.broadcast('ResourceDataAppend', {
					append: appendData,
					hash: data.hash
				});				
			});
		});
	}
]);