
kahuna.rdsinstances = {
	RDSinstancesCtrl: function ($scope, $rootScope, $routeParams, $timeout, $http, KahunaData) {

		$rootScope.currentPage = 'rdsinstances';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authentication#TOC-Authentication-Provider';

		$scope.data = {};
		$scope.snapshotName = "";
		$scope.masterUserPassword = "";
		$scope.noSnapshotAvailable = "--no snapshots are available--";
		$scope.passwordError = "";
		$scope.timeoutInterval;
		$scope.showPassword = true;
		$scope.deleteConfirmed = "";

		$scope.statusClass = "";
		$scope.extraStatusInfo = "";
		$scope.restoreAsInstanceName ="";

		$scope.$on("$destroy", function (){
			clearTimeout($scope.timeoutInterval);
		});

		// TODO  use the correct server URLs and API Key
		var espressoMgmtServer = "http://mgmt3.espressologic.com";
		var acctDbServersURL = espressoMgmtServer+"/rest/abl/mgmt/v1/account_db_servers";
		var snapshotsHandlerURL = espressoMgmtServer+"/http/abl/mgmt/rdssnapshots/";

		//var espressoMgmtServer = "http://localhost:8080/KahunaService";
		//var acctDbServersURL = "http://localhost:8080/KahunaService/rest/abl/mgmt/v1/account_db_servers";
		//var snapshotsHandlerURL = espressoMgmtServer+"/http/abl/mgmt/rdssnapshots/";

		var myAPIKey =  {apikey : '98NBffTlkW5CXsoucpq6wVS7Ste1Zm80Pk' };  //TODO USE: kahuna.globals.apiKeyValue  ???

		var accountUrlName = kahuna.globals.currentAccount.url_name;

		console.info("accountUrlName=",accountUrlName);

		//  db.t1.micro instances can only be members of the default option group

		$scope.rdsClassOptions = [
			{ name: "small", value: "db.t1.micro", title : "~ $30 per month"},
			{ name: "medium", value: "db.m1.small", title : "~ $100 per month"},
			{ name: "large", value: "db.m1.medium", title : "~ $200 per month"}
		];

		$scope.estClassCost = {
			"db.t1.micro" : $scope.rdsClassOptions[0].title,
			"db.m1.small" : $scope.rdsClassOptions[1].title,
			"db.m1.medium" : $scope.rdsClassOptions[2].title
		};

		$scope.snapshotNames = [];

		// Get all the current RDSInstances for the current logged in User
		KahunaData.queryWithKey(acctDbServersURL, null, myAPIKey, function (data) {

			//kahuna.setInScope($scope, "users", data);
			$scope.data.instances = data;
			$scope.data.nextBatch = false;
			if (data.length > 0) {
				if (data[data.length - 1]['@metadata'].next_batch) {
					$scope.data.nextBatch = data[data.length - 1]['@metadata'].next_batch;
					$scope.data.instances.pop();
				}
			}
			if (data.length > 0 && ! $scope.data.selectedInstance) {
				$scope.data.selectedInstance = data[0];
				$scope.instanceSelected($scope.data.selectedInstance);
			}
		});

		$scope.fetchSnapshotNames  = function (selectedInstanceName) {

			var ts = '' + (new Date().getTime());

			$http({method: 'GET', url: snapshotsHandlerURL, params: {instancename: selectedInstanceName, ts: ts } }).
			success(function (data, status, headers, config) {
				$scope.snapshotNames = data;
				if (data.length == 0) $scope.snapshotNames.push($scope.noSnapshotAvailable);
				$scope.snapshotName = $scope.snapshotNames[0];
			}).
			error(function (data, status, headers, config) {
				$scope.snapshotNames = [$scope.noSnapshotAvailable];
				$scope.snapshotName = $scope.snapshotNames[0];
			});
		};

		$scope.instanceSelected  = function (selectedInstance) {
			clearTimeout($scope.timeoutInterval);

			if (selectedInstance.status != "available" && selectedInstance.status != "New Instance") {
				$scope.timeoutInterval = setTimeout($scope.getUpdateStatusCallBack(selectedInstance), 3000);
			}

			$scope.setStatusInfo(selectedInstance);

			// the host name is formated as : el-abl-rdstest.cvcnavw8kt2z.us-east-1.rds.amazonaws.com,Port: 3306"
			var hostNameRegexp = /(.+?),(Port: [0-9]+)/;
			var match = hostNameRegexp.exec(selectedInstance.host_name);
			if (match && match.length > 0) {
				selectedInstance.host_name = match[1];
				selectedInstance.portInfo = match[2];
			}
		};

		// A closure to update the status
		$scope.getUpdateStatusCallBack = function (selectedInstance) { //First function
			var srcInstance = selectedInstance;
			return function () { // this second function that will be called by the timer
				clearTimeout($scope.timeoutInterval);
				KahunaData.queryWithKey(acctDbServersURL+"/"+srcInstance.ident, null, myAPIKey, function (data) {
					if (data.length == 1) {
						srcInstance.status = data[0].status;
						// angular.copy(data[0], srcInstance); // can't update the entire instance, because this overwrites user edits
					}
				});

				if (srcInstance.status != "available" && srcInstance.status != "New Instance") {
					$scope.timeoutInterval = setTimeout($scope.getUpdateStatusCallBack(srcInstance), 3000);
				}

				$scope.setStatusInfo(srcInstance);
			};
		};

		$scope.setStatusInfo = function (selectedInstance) {

			if (selectedInstance.status == "deleted") {
				$scope.statusClass = "alert";
				$scope.extraStatusInfo = "This database has been deleted and is no longer available.";
			}
			else if (selectedInstance.status == "New Instance") {
				$scope.statusClass = "alert alert-info";
				$scope.extraStatusInfo = "You need to set the configuration parameters and admin password for this database, and then click Save.  The new instance will then be queued for creation.";
			}
			else if (selectedInstance.status == "available") {
				$scope.statusClass = "alert alert-success";
				$scope.extraStatusInfo = "";
			}
			else {
				$scope.statusClass = "alert";
				$scope.extraStatusInfo = "It may take 5 or more minutes for this database to become available.";
			}
		};

		$scope.saveInstance = function (urlparams) {

			if ($scope.data.selectedInstance.admin_credentials.length < 8) {
				$scope.passwordError = "Password must be at least 8 charaters long";
				kahuna.util.error("The entered password is too short; it must be at least 8 characters.");
				return;
			}

			$scope.passwordError = "";

			// Need to create a closure to capture the current (source) instance we are saving
			// If the save was success then we'll update the instance; allowing subsequent saves
			// having a valid checksum
			var updateSavedRowCallBack = function (selectedInstance, urlparams) { //First function
				var srcInstance = selectedInstance;
				var theParams = urlparams;
				return function (newData) { //Second function
					if (newData.statusCode == 200 && newData.txsummary.length > 0) {
						angular.copy(newData.txsummary[0], srcInstance);  // update the src instance to reflect and external changes
						$scope.instanceSelected(srcInstance);

						// If we were restoring from a snapshot (creation of a new instance really) then re-read the server list
						if (typeof(theParams.restorefromsnapshotname) !== "undefined") {
							$scope.refreshServerList();
						}
					}
				};
			};

			if (typeof urlparams === 'undefined') {
				urlparams = {accounturlname: accountUrlName };
			}
			else {
				urlparams.accounturlname = accountUrlName;
			}

			console.info("Pre-Save() checksum = " , $scope.data.selectedInstance['@metadata'].checksum);
			$scope.data.selectedInstance.instance_name  = angular.lowercase($scope.data.selectedInstance.instance_name);

			KahunaData.updateWithKey(acctDbServersURL, $scope.data.selectedInstance, urlparams, myAPIKey, updateSavedRowCallBack($scope.data.selectedInstance, urlparams));
		};

		$scope.deleteInstance = function () {

			var params = {checksum: 'override'};
			$scope.deleteConfirmed = "";

			KahunaData.deleteWithKey(acctDbServersURL+"/"+$scope.data.selectedInstance.ident, params, myAPIKey, function (data) {
				kahuna.util.info('RDSInstance ' + $scope.data.selectedInstance.instance_name + ' was deleted');
				var idx = $scope.data.instances.indexOf($scope.data.selectedInstance);
				$scope.data.instances.splice(idx, 1);
				if (idx > 0)
					$scope.data.selectedInstance = $scope.data.instances[idx - 1];
				else if ($scope.data.instances.length > 0)
					$scope.data.selectedInstance = $scope.data.instances[0];
				else
					$scope.data.selectedInstance = null;
			});
		};

		$scope.createInstance = function () {

			var data = {
					name:"demo",
					instance_name:  "el-"+accountUrlName,
					users_instance_name: "mysql001",
					admin_login: "admin",
					admin_credentials: "4u2Change",
					dbtype: "MySQL",
					dbversion: "5.6",
					db_server_type: "RDS",
					instance_class : "db.t1.micro",
					storage: 5,
					account_ident: kahuna.globals.currentAccount.ident,  // TODO Please confirm
					status: "New Instance",
					permitted_ip_range: "0.0.0.0/32",
					host_name: ""
					};

			KahunaData.createWithKey(acctDbServersURL, data, null, myAPIKey,  function (data){
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:account_db_servers' && modObj['@metadata'].verb === 'INSERT') {
						$scope.data.instances.push(modObj);
						$scope.data.selectedInstance = modObj;
						$scope.instanceSelected(modObj);
						break;
					}
				}
			});
		};


		$scope.rebootInstance = function () {

			if (! confirm('Reboot instance: ' + $scope.data.selectedInstance.instance_name + ' ?'))
				return;

			if ($scope.data.selectedInstance.status !== "New Instance" && $scope.data.selectedInstance.status !== "Rebooting") {
				$scope.data.selectedInstance.status = "Rebooting";  // trigger a reboot request
				$scope.saveInstance();
			}
		};


		$scope.snapshotInstance = function () {
				$scope.data.selectedInstance.status = "Creating Snapshot:"+$scope.snapshotName;  // trigger a Snapshot request
				$scope.saveInstance({snapshotname : $scope.snapshotName });
		};


		$scope.restoreFromSnapshot = function () {
			$scope.data.selectedInstance.status = "Restoring from Snapshot: "+  $scope.snapshotName ;  // trigger a restore from snapshot request
			$scope.saveInstance({restorefromsnapshotname : $scope.snapshotName, restoreAsInstanceName : $scope.restoreAsInstanceName });
		};


		$scope.refreshServerList = function () {

			KahunaData.queryWithKey(acctDbServersURL, null, myAPIKey, function (data) {

				$scope.data.instances = data;
				$scope.data.nextBatch = false;
				if (data.length > 0) {
					if (data[data.length - 1]['@metadata'].next_batch) {
						$scope.data.nextBatch = data[data.length - 1]['@metadata'].next_batch;
						$scope.data.instances.pop();
					}
					$scope.data.selectedInstance = data[0];
				}
				if (data.length > 0 && ! $scope.data.selectedInstance) {
					$scope.data.userPassword = passwordPlaceholder;
					$scope.data.selectedInstance = data[0];
				}
			});
		};

		$scope.setMasterUserPassword = function () {
			$scope.data.selectedInstance.status = "Setting new password";
			$scope.saveInstance({masteruserpassword : $scope.masterUserPassword });
		};
	}
};
