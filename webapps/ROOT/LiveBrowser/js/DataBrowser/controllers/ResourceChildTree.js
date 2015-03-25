espresso.app.controller('espresso.ResourceChildTree', [
	'$rootScope', '$scope', 'Events', 'EspressoData', 'ResourceHelper',
	function ($rootScope, $scope, Events, EspressoData, ResourceHelper) {
		$scope.treeData = null;
		Events.on('WatchResourceRow', function (event, data) {
			$scope.treeData = data.row;
		});
	}
]);