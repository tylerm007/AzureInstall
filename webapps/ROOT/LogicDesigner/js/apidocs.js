kahuna.apidoc = {

	ApiDocCtrl : function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData) {

		$rootScope.currentPage = 'apidocs';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authentication';
		$rootScope.helpDialog('apidocs', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.data = {};
		$scope.data.serverUrl = kahuna.serverUrl;

		var ssIdx = kahuna.serverUrl.indexOf("//");
		var sIdx = kahuna.serverUrl.indexOf("/", ssIdx + 2);
		$scope.data.hostname = kahuna.serverUrl.substring(ssIdx + 2, sIdx);

		$scope.data.allTables = kahuna.meta.allTables;
		$scope.data.tableDetails = {};
		$scope.data.tableNames = [];
		$scope.data.tableAccordion = [];
		$scope.data.resourceDetails = {};

		// Gets called when a table accordion is open
		function showTableDetails(idx) {
			var tblName = $scope.data.tableNames[idx];
			console.log("Show details for table " + tblName);
			if ($scope.data.tableDetails[tblName])
				return;
			KahunaData.query('@tables/' + tblName, {projectId: $scope.currentProject.ident}, function (data) {

				var dtl = "<table>";
				for (var i = 0; i < data.columns.length; i++) {
					dtl += "<tr><td>" + data.columns[i].name + "</td><td>" + data.columns[i].type + "</td></tr>";
				}
				dtl += "</table>";
				if ($scope.$$phase)
					$scope.data.tableDetails[tblName] = dtl;
				else {
					$scope.$apply(function () {
						$scope.data.tableDetails[tblName] = dtl;
					});
				}
			});
		}

		// Sort the tables
		$scope.data.tableNames = [];
		for (var tblName in kahuna.meta.allTables) {
			if ( ! kahuna.meta.allTables.hasOwnProperty(tblName))
			continue;
			$scope.data.tableNames.push(tblName);
		}
		$scope.data.tableNames.sort();

		// Watch tables accordion
		$scope.$watch(function () {
			var openFlags = '';
			for (var i = 0; i < $scope.data.tableNames.length; i++) {
				openFlags += $scope.data.tableAccordion[i] ? 'Y' : 'N';
			}
			return openFlags;
		}, function (idx) {
			console.log('Watch idx: ' + idx);
			var numOpen = 0;
			for (var i = 0; i < idx.length; i++) {
				if (idx.charAt(i) == 'Y') {
					console.log("Table " + $scope.data.tableNames[i] + " is open: " + $scope.data.tableAccordion[i]);
					numOpen++;
					showTableDetails(i);
				}
			}
			if ( ! numOpen)
				console.log("No table is open");
		}, true);

		function showResourceDetails(idx) {
			var res = $scope.data.topResources[idx];
			if ( ! res.accordionOpen)
				return;
			if ($scope.data.resourceDetails[idx])
				return;

			var resIdent = res.ident;
			KahunaData.query('AllResources', {filter: 'ident=' + resIdent}, function (data) {
				var resource = data[0];
				$scope.data.resourceDetails[resource.ident] = resource;
				$scope.data.debugMsg = resource;
			});
		}

		KahunaData.query('admin:apiversions', {filter: 'project_ident=' + $scope.currentProject.ident, order: 'ident desc'}, function (data) {
			$scope.data.newestApiVersion = null;
			if (data.length == 0)
				return;
			$scope.data.apiVersions = data;
//			kahuna.setInScope($scope, 'apiVersions', data);
			$scope.data.selectedApiVersion = data[0];

			KahunaData.query('AllTopResources', {pagesize: 100, filter: 'apiversion_ident=' + $scope.data.selectedApiVersion.ident,
						order: 'name'}, function (topResourcesData) {
				$scope.data.topResources = topResourcesData;
				var resourceNames = [];
//				for (var tblName in kahuna.meta.allTables) {
//					if ( ! kahuna.meta.allTables.hasOwnProperty(tblName))
//						continue;
//					resourceNames.push(tblName);
//				}
				for (var i = 0; i < topResourcesData.length; i++)
					resourceNames.push(topResourcesData[i].name);
				//resourceNames.sort();
				$scope.data.resourceNames = resourceNames;
				if (resourceNames.length > 0)
					$scope.data.selectedResourceName = resourceNames[0];
				else
					$scope.data.selectedResourceName = "MyResource";

				// Set a watch for the accordions
				$scope.$watch(function () {
					var openFlags = '';
					for (var i = 0; i < topResourcesData.length; i++) {
						openFlags += topResourcesData[i].accordionOpen ? 'Y' : 'N';
					}
					return openFlags;
				}, function (idx) {
					console.log('Watch idx: ' + idx);
					var numOpen = 0;
					for (var i = 0; i < idx.length; i++) {
						if (idx.charAt(i) == 'Y') {
							console.log("Resource " + $scope.data.topResources[i].name + " is open: " + $scope.data.topResources[i].accordionOpen);
							numOpen++;
							showResourceDetails(i);
						}
					}
					if ( ! numOpen)
						console.log("No resource is open");
				}, true);
			});
		});

		$scope.getJsonForTable = function (tbl) {
			if ($scope.data.tableJson[tbl.name])
				return;
			kahuna.meta.getTableDetails(tbl.name, function (data) {
				var apiVersionName = "?";
				if ($scope.data.selectedApiVersion)
					apiVersionName = $scope.data.selectedApiVersion.name;
				var json = "{\n";
				json += "    \"@metadata\": {\n";
				json += "        \"href\": \"" + $scope.data.serverUrl + $scope.currentAccount.url_name + "/" +
						$scope.currentProject.url_name + "/" + apiVersionName + "/" + tbl.name + "\"\n";
				json += "        \"checksum\": \"abcdef0123456789\"\n";
				json += "    }";
				//for (var i = 0; i < )
				json += "\n}\n";
				$scope.data.tableJson[tbl.name] = json;
			});
		};

		KahunaData.query('AllApiKeys', {
					pagesize: 1000,
					filter: 'project_ident=' + $scope.currentProject.ident + ' AND status=\'A\' AND origin is null',
					order: 'name'},
				function (data) {
			$scope.data.apiKeys = data;
			if (data.length > 0)
				$scope.data.selectedApiKey = data[0];
		});

		$scope.refreshDebug = function () {
			$scope.debugMsg = "$scope.data.resources[1].accordionOpen=" + $scope.data.resources[1].accordionOpen;
		};

		$scope.viewDocs = function () {
			var url = location.href;
			if (url.indexOf('#') > 0)
				url = url.substring(0, url.indexOf('#'));
			if (url.indexOf('?') > 0)
				url = url.substring(0, url.indexOf('?'));
			if (url.charAt(url.length - 1) != '/')
				url += '/';
			if (url.substring(0, 22) == ("http://localhost:8080/")) {
				url = "http://localhost:8080/LogicDesigner/";
			}
			var srcUrl = url + "../rest/" + kahuna.globals.currentAccount.url_name + "/" +
				$rootScope.currentProject.url_name + "/" + $scope.data.selectedApiVersion.name + "/%40docs";
			if (url.substring(0, 22) == ("http://localhost:8080/")) {
				srcUrl = "http://localhost:8080/KahunaService/rest/" + kahuna.globals.currentAccount.url_name + "/" +
				$rootScope.currentProject.url_name + "/" + $scope.data.selectedApiVersion.name + "/%40docs";
			}
//			window.open(url + 'swagger-ui?url=' + srcUrl + "&key=" + $scope.data.selectedApiKey.apikey, '_blank');
			$('#docsView').attr('src', url + 'swagger-ui?url=' + srcUrl + "&key=" + $scope.data.selectedApiKey.apikey);
		};
	}
};
