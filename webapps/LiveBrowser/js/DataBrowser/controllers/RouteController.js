espresso.app.controller('espresso.RouteCtrl', [
	'DirectLink', '$location', '$modal', '$rootScope', '$routeParams', '$scope', '$window',
	function (DirectLink, $location, $modal, $rootScope, $routeParams, $scope, $window) {
		//do we have a table?, store it in DirectLink
		if (angular.isDefined($routeParams.table)) {
			DirectLink.put('table', $routeParams.table);
		}
		//do we have a primary key?, store it in DirectLink
		if (angular.isDefined($routeParams.pk)) {
			DirectLink.put('pk', $routeParams.pk);
		}
		//this only needs to know if we have a minimum number of updated DirectLink.params to justify broadcasting
			//for now, that just means we need a table 2014-03-18
		if (angular.isDefined($routeParams.table)) {
			$rootScope.$on('schemaProcessed', function () {
				DirectLink.broadcast();
			});
		}
	}
]);
