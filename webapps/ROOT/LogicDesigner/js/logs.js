kahuna = kahuna || {};
kahuna.log = {

	LogCtrl : function ($rootScope, $scope, $http, $resource, $routeParams, $sce, $location, KahunaData) {

		$rootScope.currentPage = 'logs';
		$rootScope.currentPageHelp = 'docs/debugging/logging';
		$rootScope.helpDialog('logs', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.loggingLevel = '3';
		$scope.logsSelected = {'admini': true, 'buslog': true, 'depend': true,
				'generl': true, 'persis': true, 'securi': true, 'engine': true, 'resrcs': true, 'sysdbg': true, 'ulogic': true};

		$scope.logSelected = function () {
			KahunaData.getUrl($scope.selectedLog.href, function (data) {
				for (var i = 0; i < data.messages.length; i++) {
					data.messages[i].message = data.messages[i].message.replace(/\\n/g, "<br/>");
					data.messages[i].message = data.messages[i].message.replace(/\\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
					data.messages[i].trustedMessage = $sce.trustAsHtml(data.messages[i].message);
				}
				$scope.logEntries = data.messages;
			});
			kahuna.logEvalProgress("viewed logs");
		};

		// Filter the log records per minimum log level
		$scope.checkLogLevel = function (log) {
			// Is the logger even supposed to be shown
			if ( ! $scope.logsSelected[log.logger])
				return false;

			// If there is a search, does the log item match?
			if ($scope.logFind && log.message && log.message.search($scope.logFind) == -1)
				return false;

			switch (log.level) {
				case 'FINEST': return $scope.loggingLevel <= 1;
				case 'FINER': return $scope.loggingLevel <= 2;
				case 'FINE': return $scope.loggingLevel <= 3;
				case 'INFO': return $scope.loggingLevel <= 4;
				case 'WARNING': return $scope.loggingLevel <= 5;
				case 'SEVERE': return $scope.loggingLevel <= 6;
			}

			return true;
		};

		$scope.apiKeySelected = function () {
			KahunaData.getUrl($scope.selectedApiKey.href, function (data){
				$scope.logs = data;
				if (data.length == 0)
					return;
				$scope.selectedLog = data[data.length - 1];
				$scope.logSelected();
			});
		};

		$scope.refreshApiKeys = function () {
			// Fetch all active API keys for the current project
			KahunaData.getUrl(kahuna.serverUrl + kahuna.globals.currentAccount.url_name + '/' +
					$scope.currentProject.url_name + '/@logs', function (data) {
				$scope.apiKeys = data;
				if (data.length == 0)
					return;
				$scope.selectedApiKey = data[0];
				$scope.apiKeySelected();
			});
		};
		$scope.refreshApiKeys();

		$scope.refreshButtonPressed = function () {
			$scope.refreshApiKeys();
			$scope.apiKeySelected();
		};

		$scope.toggleLogEntry = function (idx) {
			var hgt = $('#logEntry' + idx).css('max-height');
			if (hgt && hgt != 'none') {
				$('#logEntry' + idx).css('max-height', '');
				$('#logEntry' + idx).css('overflow', '');
				$('#logEntryButton' + idx).html('-');
			}
			else {
				$('#logEntry' + idx).css('max-height', '1.25em');
				$('#logEntry' + idx).css('overflow', 'hidden');
				$('#logEntryButton' + idx).html('+');
			}
		};

		// Flush out the logs for this selected API key
		$scope.logPurge = function () {
			$scope.logEntries = [];
			if ( ! $scope.selectedApiKey)
				return;

			KahunaData.removeWithUrl(kahuna.serverUrl + kahuna.globals.currentAccount.url_name + '/' +
					$scope.currentProject.url_name + '/@logs/' + $scope.selectedApiKey.ident,
				function (data) {
					$scope.apiKeySelected();
				}
			);
		};
	}
};
