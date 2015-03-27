

espresso.app.controller('espresso.LoginDialogController', [
	'$scope', '$location', '$rootScope', '$http', '$modalInstance', 'loginValues', 'Storage',
	'Auth', 'Dimensions', '$routeParams', 'DirectLink', '$timeout',
	function ($scope, $location, $rootScope, $http, $modalInstance, loginValues, Storage,
		Auth, Dimensions, $routeParams, DirectLink, $timeout) {
		//var $scope = $rootScope.$new(true);
		$scope.login = function() {
			$scope.errorMessage = null;
			var serverName = $scope.loginValues.serverName;
			//if (serverName.charAt(serverName.length - 1) == '/')
			//	$scope.loginValues.serverName = serverName.substring(0, serverName.length - 1);
			espresso.setServerUrl(serverName);
			$http.post(
					espresso.projectUrl + '@authentication',
					{username: $scope.loginValues.userName, password: $scope.loginValues.password}
				)
				.success(function(response) {
					
					if (response.email && !espresso.noTracking) {
						try {
							woopra.identify({
							    email: response.email
							});
							woopra.track();
						}
						catch(e) {
							console.log('Woopra error: ' + e);
						}
					}

					//args: username, server, apikey
					Auth.login( $scope.loginValues.userName , $scope.loginValues.serverName , response.apikey );
					
					//username, server, show password, apikey
					Auth.saveSession( $scope.loginValues.userName , $scope.loginValues.serverName , $scope.loginValues.showPassword , response.apikey );
	
					//this modal instance may have already closed, dependent on user esc
					try{ $modalInstance.close(); } catch (e) {}
				})
				.error(function(data, status) {
					if (status == 401)
						$scope.errorMessage = "Login failed: invalid user ID or password";
					else if (status == 400 && data.errorCode == 40024)
						$scope.errorMessage = "Login failed: you must use HTTPS to authenticate.";
					else
						$scope.errorMessage = "Unable to connect to server";
				});
		};
		
		$scope.loginValues = loginValues;
		
		var serverUrl = '';
		if (espresso.util.supports_html5_storage()) {
			serverUrl = localStorage.browser_lastServer;
			$scope.loginValues.userName = localStorage.browser_lastUsername;
			$scope.loginValues.showPassword = ('true' == localStorage.browser_showPassword);
		}
		else
			console.log("localStorage not supported");
		
		// Was a server specified in the URL?
		var urlServer = espresso.util.getURLParam('serverName');
		if (urlServer) {
			if (/#\/$/.test(urlServer))
				urlServer = urlServer.substring(0, urlServer.length - 2);
			serverUrl = urlServer;
		}
		$scope.loginValues.serverName = serverUrl;

		if (DirectLink.isLinkingUrl()) {
			$scope.loginValues = DirectLink.getLoginValues($scope.loginValues);
			if (angular.isDefined($routeParams.apiKey)) {
				Auth.login($scope.loginValues.userName, $scope.loginValues.serverName, $routeParams.apiKey);
				Auth.saveSession($scope.loginValues.userName, $scope.loginValues.serverName, $scope.loginValues.showPassword, $routeParams.apiKey);
				$scope.$evalAsync(function () {$modalInstance.close();});
			}
		}
		if ( ! serverUrl) { // Server name was not found anywhere, default to this server
			$scope.loginValues.serverName = $location.protocol() + "://" + $location.host();
		}
		
		var urlUserName = espresso.util.getURLParam('userName');
		if (urlUserName) {
			if (/#\/$/.test(urlUserName))
				urlUserName = urlUserName.substring(0, urlUserName.length - 2);
			$scope.loginValues.userName = urlUserName;
		}
		
		// Try to put the cursor in the most appropriate input
		setTimeout(function() {
			if ( ! $scope.loginValues.serverName)
				$("#serverName").focus();
			else if ( ! $scope.loginValues.userName)
				$("#userName").focus();
			else {
				if ($scope.loginValues.showPassword)
					$("#clearPassword").focus();
				else
					$("#password").focus(); 
			}
		}, 400);

		////////////////////////////////////////////////////////////////////////////
		// Allow the Logic Designer to communicate with us, if we are running in it
		function msgListener(event){
			//console.log('LiveBrowser - Got message: ' + JSON.stringify(event.data));
			if ( ! event.data || !event.data.action)
				return;
			if (event.data.action == 'setDemoLoginInfo') {
				espresso.util.setInRootScopeFun(function() {
					$rootScope.demoLoginInfo = {
						userName: event.data.userName,
						apiKey: event.data.apiKey,
						serverName: event.data.host,
						adminHost: event.data.adminHost,
						adminUserName: event.data.adminUserName,
						adminApiKey: event.data.adminApiKey
					};
					$rootScope.$broadcast('insideLogicDesigner'); // Let everyone know we are in the Logic Designer
				});
			}
		}

		if (window.addEventListener){
			addEventListener("message", msgListener, false);
		} else {
			attachEvent("onmessage", msgListener);
		}
		// Message the parent window, if present, to set up the login
		if (window.parent) {
			window.parent.postMessage({
				action: "getDemoLoginInfo"
			}, "*");
			
			$rootScope.$watch('demoLoginInfo', function demoLoginInfoChanged(newVal, oldVal) {
					//console.log('demoLoginInfo has changed -- attempting to log in - ' + JSON.stringify($rootScope.demoLoginInfo));
				var auth = Storage.get('authSession');
					//console.log($rootScope.root.authorInfo, auth);
					if (!$rootScope.demoLoginInfo) {
						return;
					}
					try {$modalInstance.close();} catch (e) {}
					if ($rootScope.root.authorInfo && $rootScope.root.authorInfo.apikey === $rootScope.demoLoginInfo.adminApiKey) {
						//caught in a login loop;
						return;
					}
					//console.log('Log in now');
					espresso.projectUrl = $rootScope.demoLoginInfo.serverName;
					Auth.login($rootScope.demoLoginInfo.userName, $rootScope.demoLoginInfo.serverName, $rootScope.demoLoginInfo.apiKey);
					Auth.saveSession($rootScope.demoLoginInfo.userName, $scope.loginValues.host, $scope.loginValues.showPassword, $rootScope.demoLoginInfo.apiKey);
					$rootScope.root.authorInfo = {
						url: $rootScope.demoLoginInfo.adminHost,
						username: $rootScope.demoLoginInfo.adminUserName,
						apikey: $rootScope.demoLoginInfo.adminApiKey
					};
			});
		}
	}
]);