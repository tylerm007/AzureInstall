// Namespace
espresso.baseUrl = null;
espresso.projectUrlFragment = 'rest/abl/demo/v1/';
espresso.globals = {
		apiKeyValue: null //"demo_full"
	};

espresso.projectUrl = espresso.baseUrl + espresso.projectUrlFragment;
espresso.settings = null;

espresso.services = {
	espressoHeaders: {Authorization: "Espresso " + espresso.globals.apiKeyValue + ":1"},
	
	handleError: function(data, status, url) {
		if (data && data.errorMessage) {
			if (
				data.errorMessage === 'API key cannot be accepted: API key not found' ||
				data.errorMessage === 'API key cannot be accepted: API key has expired'
			) {
				var scope = angular.element('body').scope();
				scope.showLogin().result.then(function () {
					//this fires after the login dialog is successfully closed
						//it's not unreasonable to assume expect a valid api key now exists
					//additional login behaviors here
				});
				return;
			}
			alert(data.errorMessage);
		}
		else {
			alert('Error ' + status);
		}
	}
};

/***performance debugging utilities***/
allTheChildren = {};
var lambda = 0;
eop = false;
tablesDebug = [];
function liveDebug(event, callback) {
	jQuery('body').one(event, function (event, arg1, arg2) {
		console.log(arg1);
		console.log(arg2);
	});
}
equalsEvent = false;
function toggleDebug() {
	equalsEvent = !equalsEvent;
}
/*** END performance debugging utilities***/

function isIpad() {
	return navigator.userAgent.match(/iPad/i) != null;
}
espresso.list = {};

/**
 * @doc overview
 * @name Initilization
 * @description #Application Initialization
 * 0. config()
 *  - defines routes
 * 0. run()
 *  - attempts to authenticate
 *  - DirectLink attempts to update the page
 */
espresso.app = angular.module(
	'espresso.browser',
	['ngResource', 'ngRoute', 'ngSanitize', 'AdminServices', 'ui.bootstrap', 'ngGrid' , 'Storage' , 'Auth', 'Settings', 'Dimensions','ui.mask', 'textAngular']
).config([ '$routeProvider' , '$locationProvider' , '$httpProvider' , '$compileProvider' , '$rootScopeProvider', 
	function($routeProvider, $locationProvider, $httpProvider, $compileProvider, $rootScopeProvider) {
	//$rootScopeProvider.digestTtl(10);
		$routeProvider.
		when('/', {controller: 'espresso.RouteCtrl'}).
		when('/link/:table/', {controller: 'espresso.RouteCtrl',template:null}).
		when('/link/:table/:pk', {controller: 'espresso.RouteCtrl',template:null}).
		otherwise({redirectTo: '/'});
}]).run([
	'$rootScope', 'Storage', 'Auth', 'Settings', 'Tables', '$routeParams', '$location',
	function($rootScope, Storage, Auth, Settings, Tables, $routeParams, $location){
		if (isIpad()) {
			angular.element('body').css({'padding-bottom':'20px'});
		}
//		if( Auth.hasPreviousAuth() ){
//			Auth.authenticate(function(){
//				console.log('Unable to log in automatically');
//			});
//		}
		$rootScope.alerts = [];
		$rootScope.closeAlert = function(idx) { espresso.util.closeAlert(idx); };

		////////////////////////////////////////////////////////////////////////////
		// Woopra tracking
		espresso.noTracking = $location.search()['noTracking'];
		if ( ! espresso.noTracking) {
			try {
			    (function(){
			        var t,i,e,n=window,o=document,a=arguments,s="script",r=["config","track","identify","visit","push","call"],c=function(){var t,i=this;for(i._e=[],t=0;r.length>t;t++)(function(t){i[t]=function(){return i._e.push([t].concat(Array.prototype.slice.call(arguments,0))),i}})(r[t])};for(n._w=n._w||{},t=0;a.length>t;t++)n._w[a[t]]=n[a[t]]=n[a[t]]||new c;i=o.createElement(s),i.async=1,i.src="//static.woopra.com/js/w.js",e=o.getElementsByTagName(s)[0],e.parentNode.insertBefore(i,e)
			    })("woopra");
			
			    woopra.config({
			        domain: 'espressologic.com'
			    });
			    woopra.track('livebrowser_access', {
			        url: window.location.pathname+window.location.search,
			        title: document.title
			    });
			}
			catch(e) {
			    console.log('Woopra error: ' + e);
			}
		}
		
		// Call this to track a user action. The actionName must be defined in Woopra first.
		$rootScope.trackAction = function(actionName, params) {
			if (espresso.noTracking)
				return;
			try {
				woopra.track(actionName, params);
			}
			catch(e) {
				console.log('Woopra error: ' + e);
			}
		};
}]);


espresso.app.config(['$sceProvider', function($sceProvider) {
    $sceProvider.enabled(false);
}]);

/////////////////////////////////////////////////////////////////////////////////
// Filters

// Filter out child tabs that are not displayed
espresso.app.filter('filterChildTabs', function() {
	return function(childSettings) {
		if ( ! childSettings)
			return;
		var result = {};
		_.each(childSettings, function(c, cName) {
			if (c.displayed)
				result[cName] = c;
		});
		return result;
	};
});

// Convert an object in an array. This is used to filter ng-repeat when
// the collection is an object, because Angular filters do not work
// with objects, only arrays.
espresso.app.filter('array', function() {
	return function(items) {
		var filtered;  // Trick to avoid Eclipse warning - break it into 2 lines
		filtered = [ ];
		angular.forEach(items, function(item) {
			filtered.push(item);
		});
		return filtered;
	};
});

///////////////////////////
// KEY BINDINGS

//option+a :: open authormode login
Mousetrap.bind(['option+a'], function() {
	var $headerScope = $('.toggle-author').scope();
	$headerScope.toggleAuthoring();
});
//option+x :: open app settings modal
Mousetrap.bind(['option+x'], function() {
	var $headerScope = $('.toggle-author').scope();
	$headerScope.editAppSettings();
});

//['command+s', 'ctrl+s', 'option+s'] :: save
Mousetrap.bind(['command+s', 'ctrl+s', 'option+s'], function(event) {
	var $headerScope = $('.save-action').scope();
	$headerScope.saveAll();
	event.preventDefault();
	return false; //prevents other browser specific events from firing
});

//['command+z', 'ctrl+z', 'option+z'] :: undo
Mousetrap.bind(['command+z', 'ctrl+z', 'option+z'], function(event) {
	var $headerScope = $('.undo-action').scope();
	$headerScope.undoButtonClicked();
	event.preventDefault();
	return false;
});

//['command+option+f+e', 'ctrl+option+f+e'] :: form window edit row columns
Mousetrap.bind(['command+option+f+e', 'ctrl+option+f+e'], function(event) {
	var $formScope = $('.formEditColumnSelection').scope();
	if ($formScope.$root.root.authorMode) {
		$formScope.editColumnSelection('scalar');
		event.preventDefault();
	}
});