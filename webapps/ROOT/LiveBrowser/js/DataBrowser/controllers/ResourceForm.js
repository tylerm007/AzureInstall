espresso.app.controller('espresso.ResourceForm', [
	'$rootScope', '$scope', 'Events', 'EspressoData', 'ResourceHelper',
	function ($rootScope, $scope, Events, EspressoData, ResourceHelper) {
		$scope.editing = false;
		$scope.params = {};
		
		$scope.clearResourceForm = function clearResourceForm() {
			//if a WatchResourceRow is broadcast with a data.row empty, this function is called;
		};
		
		Events.on('WatchResourceRow', function (event, data) {
			if (data.row) {
				$scope.params.row = data.row;
				$scope.params.attributes = ResourceHelper.getSimpleAttributes($scope.params.row);
				ResourceHelper.updateFormResource($scope.params.row);
			}
			else {
				$scope.clearResourceForm();
			}
		});
		
		$scope.editAttribute = function editAttribute(column, value) {
			if ($scope.editing != column) {
				$scope.editing = column;
			}
			else {
				$scope.editing = false;
				$scope.params.row[column] = value;
				$scope.params.attributes[column] = value;
			}
		};
	}
]);