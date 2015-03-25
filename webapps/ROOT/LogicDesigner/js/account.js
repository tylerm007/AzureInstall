kahuna.account = {

	AccountCtrl: function($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData) {

		$rootScope.currentPage = 'account';
		$rootScope.currentPageHelp = 'docs';

		$scope.saveAccount = function() {
			KahunaData.update($rootScope.currentAccount, function(data) {
				if (data.txsummary.length == 1) {
					$rootScope.currentAccount = data.txsummary[0];
				}
			});
		};

		$scope.deleteAccount = function() {
			if ( ! confirm("Are you ABSOLUTELY SURE you want to delete this account (" + $scope.currentAccount.name +
			")? This will delete all projects, rules, resources, and everything else associated with this account." +
			"If you confirm that this account should be deleted, you will be logged out."))
				return;

			if ( ! confirm("Sorry for being a pain, but please confirm that you want to delete this account (" + $scope.currentAccount.name +
					")? This cannot be undone."))
				return;

			KahunaData.remove($scope.currentAccount, function(data){
				kahuna.util.info('Account ' + $scope.currentAccount.name + ' was deleted.');
				$rootScope.logout();
				delete kahuna;
				alert('Your account has been deleted, along with all projects and all related information.\n' +
						'Click OK to go to the Espresso Logic home page.');
				window.location = "http://www.espressologic.com";
			});
		};
	}
};
