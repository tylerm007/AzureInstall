/**
 * A wrapper for authentication behaviors.
 */
angular.module( 'Auth' , [] ).factory( 'Auth' , [ '$rootScope' , '$http', 'Storage' , function( $rootScope , $http, Storage ){
	var Module = {
		authKey		: 'authSession',
		authObject	: {
			server: '',
			username: '',
			showPassword: '',
			apikey: ''
		},
		// checks for a saved "apikey" in local storage, and returns a boolean
		hasPreviousAuth : function(){
			var authSession = Storage.get( Module.authKey );
			if (authSession && authSession.apikey){
				return true;
			}
			return false;
		},
		// Module.login() wrapper, which passes values stored in localStorage
		authenticate	: function(failureCallback){
			var authSession = Storage.get( Module.authKey );
			if (! authSession) {
				if (failureCallback) {
					failureCallback();
				}
			}
			else {
				//console.log('Getting all tables (Auth.authenticate)');
				$http.get(authSession.server + '@tables', {headers: {
					Authorization: "Espresso " + authSession.apikey + ":1",
					'X-EspressoLogic-ResponseFormat': 'json'
				}})
				.success( function authenticate_success() {
					Module.login( authSession.username , authSession.server , authSession.apikey );
				})
				.error(function authenticate_failure(){
					console.log('Unable to use stored session - user must log in');
					if (failureCallback)
						failureCallback();
				});
			}
		},
		//
		login			: function( username , server , apikey){
			espresso.setApiKey(apikey);
			espresso.util.setInScope( $rootScope, "currentServer", server );
			espresso.baseUrl = server;
			espresso.util.setInScope( $rootScope, "currentUserName", username );
		},
		// saves values to localStorage
		saveSession		: function( username , server , showPassword , apikey ){
			//Storage.put( 'apikey' , apikey );
			if( espresso.util.supports_html5_storage() ){
				try {
					//authSession is used within this Module
					var authObject = angular.extend( angular.copy( Module.authObject ) , {
						'server'		: server,
						'username'		: username,
						'showPassword'	: showPassword,
						'apikey'		: apikey
					});
					Storage.put( Module.authKey , authObject );
					//michael holleran: I'm not sure where these values are being used, but it belongs here
					if (server && username) {
						localStorage.browser_lastServer = server;
						localStorage.browser_lastUsername = username;
						localStorage.browser_showPassword = showPassword;
					}
				}
				catch(e) {
					console.log("Unable to save login info into local storage: " + e);
				}
			}
		}
	};
	return Module;
}]);
