kahuna.livebrowser = {

	LiveBrowserCtrl: function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData) {
		$rootScope.updateLiveBrowserUrl();

		kahuna.layout.close('east');
		$rootScope.currentPage = 'livebrowser';
		$rootScope.currentPageHelp = 'docs/rest-apis/urls#TOC-API-version-Request';
		$rootScope.helpDialog('livebrowser', 'Help', localStorage['eslo-ld-learn-complete']);
	}
};
