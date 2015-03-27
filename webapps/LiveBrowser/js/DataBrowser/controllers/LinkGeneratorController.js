espresso.app.controller('espresso.LinkGeneratorCtrl', [
	'DirectLink', '$modalInstance', '$rootScope', '$scope',
	function (DirectLink, $modalInstance, $rootScope, $scope) {
		$scope.toggles = {
			readable: true,
			server: false,
			username: false,
			apiKey: false
		};

		$rootScope.$on('linkGeneratorLoaded', function () {
			angular.element('label[for=readableTrue]').click();
			angular.element('label[for=serverTrue]').click();
			angular.element('label[for=usernameTrue]').click();
			angular.element('label[for=apiKeyTrue]').click();
		});

		$scope.$watch('toggles', function (current, previous) {
			$scope.link = DirectLink.generateUrl({
				readable: $scope.toggles.readable,
				server: $scope.toggles.server,
				username: $scope.toggles.username,
				apiKey: $scope.toggles.apiKey
			});
		}, true);

		$scope.update = function (key, value) {
			$scope.toggles[key] = value;
		};

		$scope.close = function () {
			$modalInstance.close();
		};
	}
]);
