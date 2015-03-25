kahuna.perf = {

	PerfCtrl: function ($rootScope, $scope, $http, $resource, $routeParams, $location, $timeout, KahunaData) {

		$rootScope.currentPage = 'perf';
		$rootScope.currentPageHelp = 'docs/performance/metrics';
		$scope.data = {};
		$rootScope.helpDialog('perf', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.data.rulesTab = true;
		$scope.data.sqlsTab = false;
		$scope.data.urlsTab = false;
		$scope.data.adminTab = false;
		$scope.data.detailsShown = [];

		$scope.sort = {
			column: 'totalExecutionTime',
			descending: true
		};

		$scope.selectedCls = function selectedCls(column) {
			if (column != $scope.sort.column) {
				return null;
			}
			return $scope.sort.descending ? "icon-chevron-down" : "icon-chevron-up";
		};

		$scope.changeSorting = function changeSorting(column) {
			if ($scope.sort.column == column) {
				$scope.sort.descending = !$scope.sort.descending;
			}
			else {
				$scope.sort.column = column;
				$scope.sort.descending = false;
			}
		};

		$scope.iconForDetails = function iconForDetails(n) {
			return $scope.data.detailsShown[n] ? 'fa fa-minus' : 'fa fa-plus';
		};

		$scope.refresh = function refresh() {
			var save = $scope.ruleStats;
			$scope.ruleStats = null;
			$scope.ruleStats = save;
			$scope.data.refreshTimer = $timeout($scope.refresh, 5000);
		};

		//////////////////////////////////////////////////////
		// Rules

		$scope.$watch('data.rulesTab', function () {
			if ($scope.data.rulesTab) {
				$scope.fetchRuleStats();
			}
		});

		$scope.resetRuleStats = function resetRuleStats() {
			if ( ! confirm('Do you want to reset these measurements? They will be erased and reset to zero.')) {
				return;
			}
			var urlfrag = '@perf/rules?projectId=' + $scope.currentProject.ident;
			KahunaData.removeWithUrl(urlfrag,
				function () {
					$scope.fetchRuleStats();
				},
				function () {
				}
			);
		};

		$scope.fetchRuleStats = function fetchRuleStats() {
			KahunaData.query('@perf/rules', { projectId: $scope.currentProject.ident }, function (data) {
				for (var i = 0; i < data.stats.length; i++) {
					data.stats[i].averageExecutionTime = data.stats[i].totalExecutionTime / data.stats[i].numberOfExecutions;
				}
				$scope.ruleStats = data.stats;
				$scope.serverTime = data.meta.currentTime;
				$scope.timeDiff = ((new Date().getTime()) * 1000000) - data.meta.currentTime;
				if ($scope.data.refreshTimer) {
					$timeout.cancel($scope.data.refreshTimer);
				}
				$scope.data.refreshTimer = $timeout($scope.refresh, 5000);
			});

			kahuna.logEvalProgress("viewed metrics");
		};

		///////////////////////////////////////////////////
		// SQL

		$scope.$watch('data.sqlsTab', function() {
			if ($scope.data.sqlsTab) {
				$scope.fetchSqlStats();
			}
		});

		$scope.fetchSqlStats = function fetchSqlStats(admin) {
			var resourceName = admin ? 'adminSql' : 'sql';
			KahunaData.query('@perf/' + resourceName, { projectId: $scope.currentProject.ident },
				function (data) {
					for (var i = 0; i < data.stats.length; i++) {
						data.stats[i].averageExecutionTime = data.stats[i].totalExecutionTime / data.stats[i].numberOfExecutions;
					}
					$scope[admin ? 'adminSqlStats' : 'sqlStats'] = data.stats;

					$scope.serverTime = data.meta.currentTime;
					$scope.timeDiff = ((new Date().getTime()) * 1000000) - data.meta.currentTime;
					if ($scope.data.refreshTimer) {
						$timeout.cancel($scope.data.refreshTimer);
					}
					$scope.data.refreshTimer = $timeout($scope.refresh, 5000);
				}
			);
		};

		$scope.resetSqlStats = function resetSqlStats(admin) {
			if ( ! confirm('Do you want to reset these measurements? They will be erased and reset to zero.')) {
				return;
			}
			var resourceName = admin ? 'adminSql' : 'sql';
			var urlfrag = '@perf/' + resourceName + '?projectId=' + $scope.currentProject.ident;
			KahunaData.removeWithUrl(urlfrag,
				function () {
					$scope.fetchSqlStats(admin);
				},
				function () {
				}
			);
		};

		$scope.$on('$destroy', function () {
			if ($scope.data.refreshTimer) {
				$timeout.cancel($scope.data.refreshTimer);
			}
		});

		$scope.$watch('data.rulesTab', function (newVal, oldVal, scope) {
			$scope.fetchRuleStats();
		});

		$scope.$watch('data.sqlsTab', function (newVal, oldVal, scope) {
			$scope.fetchSqlStats(false);
		});

		$scope.$watch('data.adminSqlsTab', function (newVal, oldVal, scope) {
			$scope.fetchSqlStats(true);
		});

		$scope.formatTime = function formatTime(nanosecs) {
			// nanosecs is in nanoseconds, convert to microsec
			var n = Math.floor(nanosecs / 1000);
			if (n < 1000) {
				return n + "&nbsp;&micro;sec";
			}

			if (n < (1000 * 1000)) {
				return (Math.floor(n / 100) / 10) + "&nbsp;msec";
			}

			if (n < (1000 * 1000 * 1000)) {
				return (Math.floor(n / (1000 * 100)) / 10) + "&nbsp;sec";
			}

			if (n < (60 * 1000 * 1000 * 1000)) {
				return (Math.floor(n / (60 * 1000 * 100)) / 10) + "&nbsp;min";
			}

			if (n < (60 * 60 * 1000 * 1000 * 1000)) {
				return Math.floor(n / (60 * 60 * 1000 * 100)) / 10 + "&nbsp;hrs";
			}

			return Math.floor(n / (24 * 60 * 60 * 1000 * 100) / 10) + "&nbsp;days";
		};

		// Add thousands separators to a number
		$scope.formatNumber = function formatNumber(n) {
			var str = "" + n;
			var numCommas = Math.floor(Math.log(n) / Math.log(1000));
			for (var i = 0; i < numCommas; i++) {
				var commaIdx = str.length - (3 + i * 4);
				str = str.substring(0, commaIdx) + "," + str.substring(commaIdx);
			}
			return str;
		};

		$scope.formatDate = function formatDate(n) {
			var baseDate = ((new Date().getTime()) * 1000 * 1000) + $scope.timeDiff;
			var secs = Math.floor((baseDate - n) / (1000 * 1000 * 1000));
			if (secs <= 1) {
				return "1&nbsp;second&nbsp;ago";
			}

			if (secs < 60) {
				return secs + "&nbsp;seconds&nbsp;ago";
			}

			if (secs < 90) {
				return "1&nbsp;minute&nbsp;ago";
			}

			if (secs < 3600) {
				return Math.floor(secs / 60) + "&nbsp;minutes&nbsp;ago";
			}

			if (secs < (1.5 * 3600)) {
				return "1&nbsp;hour&nbsp;ago";
			}

			if (secs < (3600 * 24)) {
				return Math.floor(secs / 3600) + "&nbsp;hours&nbsp;ago";
			}

			if (secs < (3600 * 24 * 1.5)) {
				return "Yesterday";
			}

			return Math.floor(secs/(3600 * 24)) + "&nbsp;days&nbsp;ago";
		};
	}
};
