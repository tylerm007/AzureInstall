kahuna.install = {

	InstallCtrl: function ($rootScope, $scope, $http, $resource, $routeParams, $location, jqueryUI, KahunaData) {
		$rootScope.currentPage = 'install';
		//$rootScope.currentPageHelp = 'docs/rest-apis/urls#TOC-API-version-Request';
		$rootScope.helpDialog('install', 'Help');
		$scope.data = {};

		$scope.saveInstall = function() {
			var payload = {
				setupInfo: {
					db_connection_url: "jdbc:mysql://localhost/dblocal_admin",
					dba_user: "espresso_admin",
					dba_current_password: "espresso123",
					dba_new_password: $scope.data.dba_new_password,
					sa_new_password: $scope.data.sa_new_password,
					admin_new_password: $scope.data.admin_new_password
				}
			};

			KahunaData.create("@setup", payload, function (data) {
				console.log('Install response: ' + data);
				if (data.error_message) {
					alert(data.error_message);
				}
				else if (data.errorMessage) {
					alert(data.errorMessage);
				}
			});
		};
	}
};
