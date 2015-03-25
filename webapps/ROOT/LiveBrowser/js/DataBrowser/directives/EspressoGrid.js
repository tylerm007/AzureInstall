espresso.app.directive('espressoGrid', [
	'$rootScope' ,
	function ($rootScope) {
		var EspressoGrid = {
			restrict	: 'A',
			scope: true,
			link		: function (scope, element, attributes, controller){
			},
			controller	: function ($scope) {
				if (angular.isDefined($scope.$parent) && angular.isUndefined($scope.$parent.grid)) {
					$scope.$parent.grid = {data:'empty'};
				}
			}
		};
		return EspressoGrid;
}]);