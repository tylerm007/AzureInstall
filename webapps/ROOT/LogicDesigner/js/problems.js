
kahuna.problems = {

	refreshProblems: function($rootScope, KahunaData) {
		KahunaData.query('admin:projectproblems', 'project_ident=' + $rootScope.currentProject.ident + " AND status in ('O', 'F', 'f')", function (data) {
			$rootScope.problemCount = data.length ? data.length : null;
		});
	},

	ProblemsCtrl: function($scope, $rootScope, $routeParams, $location, KahunaData) {

		$rootScope.currentPage = 'problems';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authentication#TOC-Authentication-Provider';
		$rootScope.helpDialog('problems', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.data = {};

		$scope.problemSelected = function(p) {
			$scope.data.selectedProblem = p;
			$scope.data.selectedProblemType = p.ProblemType;
		};

		KahunaData.query('ProjectProblems', 'project_ident=' + $rootScope.currentProject.ident + " AND status in ('O', 'F', 'f')", function (data) {
			$scope.data.problems = data;
			$scope.data.nextBatch = false;
			if (data.length > 0) {
				if (data[data.length - 1]['@metadata'].next_batch) {
					$scope.data.nextBatch = data[data.length - 1]['@metadata'].next_batch;
					$scope.data.problems.pop();
				}
			}
			if (data.length > 0 && ! $scope.data.selectedProblem) {
				$scope.problemSelected(data[0]);
			}
			$rootScope.problems = {};
			for (var i = 0; i < data.length; i++) {
				$rootScope.problems[data[i].ident] = data[i];
			}
			$rootScope.problemCount = data.length ? data.length : null;
		});

		$scope.getProblemClass = function(p, idx) {
			if (p === $scope.data.selectedProblem)
				return "SelectedItem";
			return (idx % 2) ? "OddItem" : "EvenItem";
		};

		$scope.fixProblem = function(p) {
			if (p.ProblemType.defaultfix_is_destructive) {
				if ( ! confirm('This will apply the default fix to this problem, which is destructive. Proceed?'))
					return;
			}
			if (p.status == 'F') // If a problem is still in F mode, we still need to update to trigger actions
				p.status = 'f';
			else
				p.status = 'F';
			KahunaData.update(p, function (data) {
				var resolution = "";
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'ProjectProblems' && modObj.ident === p.ident) {
						if (modObj.status != 'C')
							throw "Unable to fix problem";
						resolution = modObj.resolution;
						break;
					}
				}
				delete $rootScope.problems[p.ident];
				$scope.data.problems.splice($scope.data.problems.indexOf(p));
				$rootScope.problemCount = $rootScope.problemCount <= 1 ? null : $rootScope.problemCount - 1;

				if ($scope.data.problems.length > 0)
					$scope.problemSelected($scope.data.problems[0]);
				else {
					$scope.data.selectedProblem = null;
					$scope.data.selectedProblemType = null;
				}

				kahuna.util.info('Problem has been fixed' + (resolution ? " : " + resolution : ""));
			});
		};

		$scope.closeProblem = function(p) {
			p.status = 'C';
			p.resolution = 'Problem was manually closed.';
			KahunaData.update(p, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'ProjectProblems' && modObj.ident === p.ident) {
						if (modObj.status != 'C')
							throw "Unable to fix problem";
						break;
					}
				}
				delete $rootScope.problems[p.ident];
				$scope.data.problems.splice($scope.data.problems.indexOf(p));
				$rootScope.problemCount = $rootScope.problemCount <= 1 ? null : $rootScope.problemCount - 1;

				if ($scope.data.problems.length > 0)
					$scope.problemSelected($scope.data.problems[0]);
				else {
					$scope.data.selectedProblem = null;
					$scope.data.selectedProblemType = null;
				}

				kahuna.util.info('Problem has been closed.');
			});
		};

		$scope.showProblem = function (p) {
			var pageName;
			switch (p.entity_name) {
			case 'admin:resources':
			case 'admin:resourceattributes':
				pageName = 'resources';
				break;
			case 'admin:rules':
				pageName = 'rule';
				break;
			default:
				throw "Unknown problem entity: " + p.entity_name;
			}
			$location.path("/projects/" + $scope.currentProject.ident + "/" + pageName + "/" + (p.row_ident2 ? p.row_ident2 : p.row_ident));
		};
	}
};
