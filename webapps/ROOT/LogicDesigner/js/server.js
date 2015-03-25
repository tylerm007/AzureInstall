kahuna.server = {

	ServerCtrl: function ($rootScope, $scope, $http, $resource, $routeParams, $location, jqueryUI, KahunaData) {
		$rootScope.currentPage = 'server';
		$rootScope.currentPageHelp = 'docs/rest-apis/urls#TOC-API-version-Request';
		$rootScope.helpDialog('server', 'Help');

		$scope.refreshServer = function() {
			kahuna.fetchData(kahuna.baseUrl + "@serverinfo", null, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.serverinfo = data;
					$scope.serverinfo.freeMemoryStr = kahuna.util.formatMemory(data.freeMemory);
					$scope.serverinfo.maxMemoryStr = kahuna.util.formatMemory(data.maxMemory);
					$scope.serverinfo.totalMemoryStr = kahuna.util.formatMemory(data.totalMemory);
					$scope.serverinfo.uptimeStr = kahuna.util.formatElapsedSeconds(data.uptime);
					$scope.serverinfo.loadAverageStr = Number(data.loadAverage).toFixed(1);
				});
			});
		};
		$scope.refreshServer();

		// We want to go straight to the license upload
		if ($location.search('uploadLicense')) {
			$scope.licenseTab = true;
		}

		////////////////////////////////////////////////////////////////////////////////////////////////////////
		// License stuff

		$scope.refreshLicense = function () {
			kahuna.fetchData(kahuna.baseUrl + "@license", null, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.license = data;
					if ( ! data.company) {
						$scope.license.status = "invalid";
						return;
					}
					switch(data.license_type) {
						case "EVAL": data.license_typeStr = "Evaluation"; break;
						case "PRODUCTION": data.license_typeStr = "Production"; break;
						case "ESPRESSO_EVAL": data.license_typeStr = "Espresso internal eval"; break;
						case "ESPRESSO_INTERNAL_DEV": data.license_typeStr = "Espresso internal engineering"; break;
						default: data.license_typeStr = "Unknown -- this is an error";
					}

					data.expiration_dateStr = dateFormat(data.license_expiration, dateFormat.masks.longDate, true);
				});
			}, function errorFetchingLicense(jqXHR, textStatus, errorThrown) {
				console.log('Error while creating license: ' + textStatus);
			});
		};
		$scope.refreshLicense();

		// Verify that the two files look roughly OK, then create the license, then
		// upload the files.
		$scope.checkLicenseFiles = function (dlg) {
			if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
				alert("We're sorry - your browser does not support this function.");
				return;
			}

			function fileChecksOut () {
				KahunaData.create("admin:server_licenses", {}, function (newLicenseData) {
					var newLicense = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(newLicenseData.txsummary, 'admin:server_licenses', 'INSERT'));
					if (!newLicense) {
						console.log('Did not find inserted license in txsummary');
						return;
					}

					var formData = new FormData();
					formData.append('checksum', newLicense['@metadata'].checksum);
					formData.append('authorization', kahuna.globals.apiKeyValue + ':1');
					formData.append('license_text', $('#licenseFile')[0].files[0]);
					$.ajax({
						url: newLicense['@metadata'].href,
						type: 'POST',
						success: function (data) {
							$(dlg).dialog("close");
							kahuna.util.info('New license was successfully updated');
							$scope.refreshLicense();
							console.log('License upload complete');
						},
						error: function (err) {
							$(dlg).dialog("close");
							kahuna.util.error("File upload failed : " + err);
							console.log("Error during upload: " + err);
						},
						// Form data
						data: formData,
						//Options to tell jQuery not to process data or worry about content-type.
						cache: false,
						contentType: false,
						processData: false
					});
				},
				function(err) {
					console.log('Error in 2nd post for license upload');
				});
			}

			// Check the license file
			if (document.getElementById('licenseFile').files.length == 0) {
				kahuna.util.error("You need to select a license file.");
				return;
			}
			var licenseFile = document.getElementById('licenseFile').files[0];
			var reader = new FileReader();
			reader.onloadend = function (e) {
				var json = e.target.result;
				for (var i = 0; i < json.length; i++) {
					var c = json.charAt(i);
					if (c == ' ' || c == '\n' || c == '\r' || c == '\t')
						continue;
					if (c != '{' && c != '[') {
						alert("The license file does not contain valid JSON.");
						return;
					}
					break;
				}

				try {
					JSON.parse(json);
				} catch (e2) {
					alert('The license file contains an error: ' + e2);
					return;
				}

				fileChecksOut();
			};
			reader.readAsText(licenseFile);
		};

		$scope.uploadLicense = function () {
			if ($rootScope.currentUserName != 'sa') {
				alert('Sorry, you can do this only if you are logged in as user sa');
				return;
			}
			$scope.licenseFileName = null;
			var options = {
				modal : true,
				buttons : {
					OK : function () {
						$scope.checkLicenseFiles(this);
						// $(this).dialog("close");
						// $rootScope.importProject();
						// $scope.$apply();
					},
					Cancel : function () {
						$(this).dialog("close");
						//$scope.$apply();
					},
				},
				width: 600,
				height: 500
			};
			jqueryUI.wrapper('#licenseImportDialog', 'dialog', options);
		};

		$scope.maskedClickThrough = function (selector) {
			angular.element(selector).click();
		};
	}
};
