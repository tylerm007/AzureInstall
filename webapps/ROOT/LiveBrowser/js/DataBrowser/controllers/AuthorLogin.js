/**
 * @ngdoc controller
 * @name AuthorLogin
 */
espresso.app.controller( 'espresso.AuthorLoginCtrl', [
	'$scope' , 'Tables' , '$rootScope' , '$modalInstance', '$http', '$timeout', 'Settings', 'Events',
	function($scope, Tables, $rootScope, $modalInstance, $http, $timeout, Settings, Events){

		$scope.adminLogin = { userName: "", password: "Password1"};
		$scope.controls = {};
		$scope.controls.close = function () {
			$rootScope.suspendUnsavedPrompt = true;
			$modalInstance.close();
			$scope.$evalAsync(function () {
				$scope.$evalAsync(function () {
					$rootScope.suspendUnsavedPrompt = false;
				});
			});
		};

		$scope.close = function(){
			$scope.doLogin();
			$scope.controls.close();
		};

		// Get an admin API key
		$scope.adminLogin.login = function() {
			var url = espresso.projectUrl;

			var restIdx = url.indexOf('/rest/');
			var baseUrl = url.substring(0, restIdx) + "/rest/abl/admin/v2/";
			url = baseUrl + "@authentication";
			$scope.adminLogin.statusMessage = "Logging in...";
			$http.post(
					url,
					{username: $scope.adminLogin.userName, password: $scope.adminLogin.password}
				)
				.success(function(response) {

					$scope.adminLogin.errorMessage = null;
					espresso.util.setInScopeFun($rootScope, function() {
						$rootScope.root.authorInfo = {
								url: baseUrl,
								username: $scope.adminLogin.userName,
								apikey: response.apikey
							};
						$rootScope.root.authorMode = true;
					});
					//console.log('Author login success -- API key is ' + response.apikey);
					//it is not ideal to pass the scope, but it was better/more-expedient to define getApp() in one place (now in: controllers/Browser.js)
					$rootScope.getApp($scope, $modalInstance);
				})
				.error(function(data, status) {
					if (status == 401)
						$scope.adminLogin.errorMessage = "Login failed: invalid user ID or password";
					else
						$scope.adminLogin.errorMessage = "Unable to connect to server: " + data.errorMessage;
					$timeout(function() {
						$scope.adminLogin.errorMessage = null;
					}, 10000);
				});
			Events.broadcast('AuthorModeDialogClosed');
		};

		$scope.adminLogin.cancelLogin = function() {
			$scope.controls.close();
		};
}]);
