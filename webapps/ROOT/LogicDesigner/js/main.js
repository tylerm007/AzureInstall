// Main code for Admin

var kahuna = {

	globals : {
		version: '0.8',
		apiKeyValue: '',
		projects: [],
		currentAccountOptions: [],
		email: ''
	},

	cache : {},

	layout : null,

	setBaseUrl : function (url) {
		// For e.g. WebSockets, we need to know the URL part after the hostname, including port
		var ssIdx = url.indexOf('//');
		var slashIdx = url.indexOf('/', ssIdx + 2);
		if (slashIdx == -1)
			slashIdx = url.length;
		var colIdx = url.indexOf(':', ssIdx);
		if (colIdx == -1 || colIdx > slashIdx)
			kahuna.urlEnd = url.substring(slashIdx);
		else
			kahuna.urlEnd = url.substring(colIdx);

		if (url == null) {
			kahuna.serverUrl = null;
			kahuna.rootUrl = null;
			kahuna.baseUrl = null;
			kahuna.wsUrl = null;
		}
		else {
			kahuna.hostUrl = url;
			kahuna.serverUrl = url + '/rest/';
			kahuna.rootUrl = url + '/rest/abl/admin/';
			kahuna.baseUrl = url + '/rest/abl/admin/v2/';
			if (url.substring(0, 5) == 'https') {
				kahuna.wsUrl = 'wss' + url.substring(5) + "/";
			}
			else {
				kahuna.wsUrl = 'ws' + url.substring(4) + "/";
			}
		}
	},

	setApiKey : function (apiKey) {
		if (apiKey) {
			kahuna.globals.apiKeyValue = apiKey;
			kahuna.services.kahunaHeaders = {Authorization: "Espresso " + apiKey + ":1"};
		}
		else {
			kahuna.globals.apiKeyValue = null;
			kahuna.services.kahunaHeaders = null;
		}
	},

	clearSetting : function clearSetting(name) {
		if (('localStorage' in window) && window['localStorage']) {
			delete localStorage[name];
		}
	},

	saveSetting : function saveSetting(name, value) {
		if (('localStorage' in window) && window['localStorage']) {
			localStorage[name] = JSON.stringify(value);
		}
	},

	readSetting : function readSetting(name, defaultValue) {
		var value = defaultValue;
		if (('localStorage' in window) && window['localStorage']) {
			if (localStorage.hasOwnProperty(name)) {
				var readvalue = localStorage[name];
				if (readvalue) {
					value = JSON.parse(readvalue);
				}
			}
		}
		return value;
	},

	setLiveBrowserUrl : function setLiveBrowserUrl(rootScope, project) {
		var accountUrlName = kahuna.globals.currentAccount.url_name;
		var projectUrlFrag = project.url_name;
		var apivers = kahuna.meta.allApiVersions;
		var apiversion = kahuna.util.getLastProperty(apivers);
		apiversion = (apiversion && apiversion.name) || "[none]";
		rootScope.liveBrowserUrl = kahuna.serverUrl + accountUrlName + "/" + projectUrlFrag + "/" + apiversion + "/";
		rootScope.fullLiveBrowserUrl = "../LiveBrowser/#/?serverName=" + kahuna.serverUrl + accountUrlName + "/" + projectUrlFrag + "/" + apiversion + "/?forceLogin=true";
	},

	// Generalized function to fetch data from the server
	// This is used to get data outside of AngularJS.
	fetchData : function (url, params, doneFunction, errorFunction) {
		var statusId = kahuna.startFetch();
		$.ajaxSetup({
			contentType: "application/json"
		});

		if (url.substring(0, 4) != 'http')
			url = kahuna.baseUrl + url;
		jQuery.support.cors = true;

		var defaultErrorFunction = function (jqXHR, textStatus, errorThrown) {
			kahuna.endFetch(statusId);
			if (jqXHR && jqXHR.responseText) {
				errorThrown = jqXHR.responseText;
				if (errorThrown.substring(0, 1) == "{") {
					try {
						errorThrown = JSON.parse(errorThrown).errorMessage;
					}
					catch(e2) {
					}
				}
			}
			console.log("Ajax error:" + errorThrown, url, params);
		};
		errorFunction = errorFunction || defaultErrorFunction;

		$.ajax({
			type: 'GET',
			url: url,
			headers: {"Authorization": "Espresso " + kahuna.globals.apiKeyValue + ":1"},
			data: params,
			cache: false,
			dataType: "json",
			async: true,
			timeout: 180000,
			error : errorFunction
		}).done(function (data) {
			kahuna.endFetch(statusId);
			doneFunction && doneFunction(data);
		}).fail(function (xhr, statusText, errorThrown) {
			console.log('Error in kahuna.fetchData: ' + statusText);
			errorFunction && errorFunction(statusText);
		});
	},

	topScope : function () {
		return angular.element($('#MainView')).scope();
	},

	// Put an object in the root AngularJS scope
	putInScope : function (name, obj) {
		var scope = kahuna.topScope();
		if (scope.$$phase) {
			scope[name] = obj;
		}
		else {
			scope.$apply(function () {
				scope[name] = obj;
			});
		}
	},

	// Remove an object from the root scope
	removeFromScope : function (name) {
		var scope = kahuna.topScope();
		if (scope.$$phase)
			delete scope[name];
		else {
			scope.$apply(function () {
				delete scope[name];
			});
		}
	},

	// Get a value from the AngularJS scope
	getFromScope : function (name) {
		var scope = kahuna.topScope();
		return scope[name];
	},

	// Set a value in the given scope, forcing it in if necessary
	setInScope : function (scope, name, obj) {
		// applyFunctionInScope(scope, function () { scope[name] = obj; });
		if (scope.$$phase)
			scope[name] = obj;
		else {
			scope.$apply(function () {
				scope[name] = obj;
			});
		}
	},

	// Set a value in the given scope, forcing it in if necessary
	applyFunctionInScope : function (scope, fun) {
		if (fun) {
			if (scope.$$phase) {
				fun();
			}
			else {
				scope.$apply(fun);
			}
		}
	},

	setLocation : function (scope, location, url) {
		if (scope.$$phase)
			location.path(url);
		else {
			scope.$apply(function () {
				location.path(url);
			});
		}
	},

	fetchId : 0,
	fetches : {},

	startFetch : function (msg) {
		var img = '<img src="images/ajax-loader.gif" width="16" height="11"/>';
		var fullMessage = 'Fetching ' + img;
		if (msg)
			fullMessage = msg + ' ' + img;
		kahuna.fetchId++;
		kahuna.fetches[kahuna.fetchId] = fullMessage;
		$('#statusBarStatus').html(fullMessage);
		return kahuna.fetchId;
	},

	endFetch : function (id) {
		if ( ! kahuna.fetches[id]) {
			console.log("Error: unknown id in endFetch: " + id);
			return;
		}
		delete kahuna.fetches[id];
		var keys = Object.keys(kahuna.fetches);
		if (keys.length > 0)
			$('#statusBarStatus').html(kahuna.fetches[keys[keys.length - 1]]);
		else
			$('#statusBarStatus').html('OK');
	},

	// Get the value of a parameter from the URL. Returns null if no such parameter.
	getURLParam : function (name) {
		var args = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		for (var i = 0; i < args.length; i++) {
			var paramParts = args[i].split('=');
			if (paramParts.length >= 1 && paramParts[0] == name) {
				return paramParts.length >= 2 ? decodeURIComponent(paramParts[1]) : null;
			}
		}
		return null;
	},

	toggleLeftNav : function () {
		if (kahuna.layout.state.west.isClosed) {
			kahuna.layout.open('west');
		}
		else {
			kahuna.layout.close('west');
		}
	},

	logEvalProgress : function (action, value) {
		// action is a string such as "created database", or "created rule"
		if ((typeof ga) == 'function') {
			if (typeof(value) == 'number') {
				// record this action with a count of objects
				ga('send','event', 'LogicDesigner Eval', action, 'count', value);
			}
			else {
				// record this action as an event on google analytics
				ga('send','event', 'LogicDesigner Eval', action );
			}
		}

		if (!! kahuna.globals.email && (typeof _agile) !== 'undefined') {
			_agile.add_note({ "subject": "LogicDesigner Eval",
				"description": action },
				{ success : function (data) {},
					error : function (data)
					{ console.log("failed to log agile event"); }
				});
		}
	},

	// Keep track of which JS has already been dynamically loaded
	dynamicallyLoadedFiles: {},

	loadRemoteFile: function (filename, filetype) {
		if (kahuna.dynamicallyLoadedFiles[filename]) {
			return;
		}

		var fileref = null;
		if (filetype == "js") {
			fileref = document.createElement('script');
			fileref.setAttribute("type", "text/javascript");
			fileref.setAttribute("src", filename);
		}
		else if (filetype == "css") {
			fileref = document.createElement("link");
			fileref.setAttribute("rel", "stylesheet");
			fileref.setAttribute("type", "text/css");
			fileref.setAttribute("href", filename);
		}
		else {
			throw "Unknown type for loadRemoteFile: " + filetype;
		}
		if (fileref) {
			document.getElementsByTagName("head")[0].appendChild(fileref);
		}
		kahuna.dynamicallyLoadedFiles[filename] = true;
	}
};


// Start AngularJS
kahuna.app = angular.module('admin', ['ngResource',
                                      'ngRoute',
                                      'ngAnimate',
                                      'ngSanitize',
                                      'AdminServices',
                                      /*'ui',*/
                                      'ui.bootstrap',
                                      'ui.utils',
                                      'ngGrid',
                                      'Storage',
                                      'ngLocale',
                                      'mgo-angular-wizard',
                                      'ui.select'
                                      ],
		function ($routeProvider, $locationProvider, $httpProvider, $compileProvider) {
			$routeProvider
				.when('/', {templateUrl: 'partials/home.html', controller: kahuna.home.HomeCtrl, eventHandle:'HomeCtrl'})
				.when('/account', {templateUrl: 'partials/account.html', controller: kahuna.account.AccountCtrl, eventHandle:'AccountCtrl'})
				.when('/projects', {templateUrl: 'partials/projects.html', controller: kahuna.project.ProjectCtrl, eventHandle:'ProjectCtrl'})
				.when('/projects/:projectId', {templateUrl: 'partials/home.html', controller: kahuna.home.HomeCtrl, eventHandle:'HomeCtrl'})
				.when('/projects/:projectId/databases', {templateUrl: 'partials/database-editor.html', controller: kahuna.database.DatabaseListCtrl, eventHandle:'DatabaseListCtrl'})
				.when('/projects/:projectId/rds', {templateUrl: 'partials/rds-instances.html', controller: kahuna.rdsinstances.RDSinstancesCtrl, eventHandle:'RDSinstancesCtrl'})
				.when('/projects/:projectId/schema', {templateUrl: 'partials/schema.html', controller: kahuna.schema.SchemaCtrl, eventHandle:'SchemaCtrl'})
				.when('/projects/:projectId/rules', {templateUrl: 'partials/rules.html', controller: kahuna.rules.AllRulesCtrl, eventHandle:'AllRulesCtrl'})
				.when('/projects/:projectId/rule/:ruleId', {templateUrl: 'partials/rule-main.html', controller: kahuna.rules.RuleEditCtrl, eventHandle:'RuleEditCtrl'})
				.when('/projects/:projectId/resources', {templateUrl: 'partials/resources.html', controller: kahuna.resource.ResourcesCtrl, eventHandle:'ResourcesCtrl'})
				.when('/projects/:projectId/resources/:resourceId', {templateUrl: 'partials/resources.html', controller: kahuna.resource.ResourcesCtrl, eventHandle:'ResourcesCtrl'})
				.when('/projects/:projectId/roles', {templateUrl: 'partials/roles.html', controller: kahuna.role.RoleCtrl, eventHandle:'RoleCtrl'})
				.when('/projects/:projectId/apiversions', {templateUrl: 'partials/apiversions.html', controller: kahuna.apiversions.ApiVersionsCtrl, eventHandle:'ApiVersionsCtrl'})
				.when('/projects/:projectId/apikeys', {templateUrl: 'partials/apikeys.html', controller: kahuna.apikey.ApiKeyCtrl, eventHandle:'ApiKeyCtrl'})
				.when('/projects/:projectId/apidocs', {templateUrl: 'partials/apidocs.html', controller: kahuna.apidoc.ApiDocCtrl, eventHandle:'ApiDocCtrl'})
				.when('/projects/:projectId/logs', {templateUrl: 'partials/logs.html', controller: kahuna.log.LogCtrl, eventHandle:'LogCtrl'})
				.when('/projects/:projectId/restlab', {templateUrl: 'partials/restlab.html', controller: kahuna.restlab.RestLabCtrl, eventHandle:'RestLabCtrl'})
				.when('/projects/:projectId/debug', {templateUrl: 'partials/debug.html', controller: kahuna.debug.DebugCtrl, eventHandle:'DebugCtrl'})
				.when('/projects/:projectId/perf', {templateUrl: 'partials/perf.html', controller: kahuna.perf.PerfCtrl, eventHandle:'PerfCtrl'})
				.when('/projects/:projectId/users', {templateUrl: 'partials/users.html', controller: kahuna.users.UsersCtrl, eventHandle:'UsersCtrl'})
				.when('/projects/:projectId/problems', {templateUrl: 'partials/problems.html', controller: kahuna.problems.ProblemsCtrl, eventHandle:'ProblemsCtrl'})
				.when('/projects/:projectId/handlers', {templateUrl: 'partials/handlers.html', controller: kahuna.handlers.HandlerCtrl, eventHandle:'HandlerCtrl'})
				.when('/projects/:projectId/events', {templateUrl: 'partials/events.html', controller: kahuna.events.EventCtrl, eventHandle:'EventCtrl'})
				.when('/livebrowser', {templateUrl: 'partials/livebrowser.html', controller: kahuna.livebrowser.LiveBrowserCtrl, eventHandle:'LiveBrowserCtrl'})
				.when('/server', {templateUrl: 'partials/server.html', controller: kahuna.server.ServerCtrl, eventHandle:'ServerCtrl'})
				.when('/install', {templateUrl: 'partials/install.html', controller: kahuna.server.InstallCtrl, eventHandle:'InstallCtrl'})
				.otherwise({redirectTo: '/'});

			// Allow local URL's for debugging purposes.
			// $compileProvider.urlSanitizationWhitelist(/(file|http|https):/);

			// var interceptor = ['$rootScope', '$q', function (scope, $q) {
			//   function success(response) {
			//     return response;
			//   }
			//
			//   function error(response) {
			//     var status = response.status;
			//
			//     if (status == 401) {
			//       var deferred = $q.defer();
			//       var req = {
			//         config: response.config,
			//         deferred: deferred
			//       };
			//       window.location = "./index.html";
			//     }
			//     // otherwise
			//     return $q.reject(response);
			//   }
			//
			//   return function (promise) {
			//     return promise.then(success, error);
			//   };
			// }];
}).run(['$rootScope', '$window', '$location', 'Storage', '$timeout', function ($rootScope, $window, $location, Storage, $timeout) {
	//
	var runDelay = 3000;

	var isDelayed = true;

	setTimeout(function () { isDelayed = false; }, runDelay);

	//Detect if there are open dropdown buttons
	$rootScope.$on('$locationChangeStart', function (event, location, base) {
		if (!isDelayed) {
			Storage.put('PreviousLocation', location.split('#')[1]);
		}
		var opens = angular.element('.btn-group.open'); //bootstrap assigned classes marking open buttons
		if (opens.length>0) {
			event.preventDefault();
		}
	});

	$rootScope.$on('$routeChangeSuccess', function (event, request) {
		if (request.$$route && request.$$route.eventHandle) {
			//broadcast now active controller scope to any listeners
			$rootScope.$evalAsync(function () {
				if (!$rootScope.appInitialized) {
					//the home controller has been instantiated!, go home
					$location.path('/');
					return;
				}
				//broadcast after the controller has had at least one digest cycle
				$rootScope.$broadcast(request.$$route.eventHandle + 'Init', request.$$route.eventHandle);
				$rootScope.$broadcast('EventCtrlInit', request.$$route.eventHandle); //in case we are listening for every route change rather than a specific one
			});
		}
	});

	$rootScope.$on('AutoLogin', function (event) {
		var currentProject = Storage.get('CurrentProject');
		if (currentProject) {
			if (angular.isUndefined($rootScope.currentProject)) {
				$rootScope.$evalAsync(function () {
					$rootScope.currentProject = currentProject;
					$rootScope.projectSelected(currentProject, undefined, runDelay);
					$timeout(function () {
						var previousLocation = Storage.get('PreviousLocation');
						if (previousLocation) {
							$location.path(previousLocation);
						}
					}, 1000);
				});
			}
		}
	});

	///////////////////////////////////////////////////////////
	// Agile CRM
	$rootScope.$watch('userEmail', function (newValue) {
		if ( ! newValue) {
			return;
		}
		try {
			_agile.set_account('322km2enjl35e2utdsfa4c691f', 'elogic');
			_agile.track_page_view();
			_agile.set_email($rootScope.userEmail);
		}
		catch(e) {
			console.log('Agile error: ' + e);
		}
	});

	// Set properties for the user's contact in AgileCRM
	// Note that Agile requires that calls to set_property be chained, e.g.
	// a call can be done only after the previous one succeeds.
	var setAgileProperty = function (ns, vs, idx) {
		_agile && _agile.set_property({
			"name": ns[idx],
			"value": vs[idx]
		}, {
			success: function (data) {
				console.log("Agile property recorded: " + ns[idx]);
				if (idx < ns.length - 1) {
					setAgileProperty(ns, vs, idx + 1);
				}
			},
			error: function (data) {
				console.log("Agile property failed: " + ns[idx]);
			}
		});
	};

	$rootScope.setAgileProperties = function (props) {
		var names = [];
		var values = [];
		for (n in props) {
			names.push(n);
			values.push(props[n]);
		}

		setAgileProperty(names, values, 0);
	};

	// WOOPRA
	kahuna.noTracking = $location.search()['noTracking'];
	if (!kahuna.noTracking) {
		try {
			(function () {
				var t,i,e,n=window,o=document,a=arguments,s="script",r=["config","track","identify","visit","push","call"],c=function(){var t,i=this;for(i._e=[],t=0;r.length>t;t++)(function(t){i[t]=function(){return i._e.push([t].concat(Array.prototype.slice.call(arguments,0))),i}})(r[t])};for(n._w=n._w||{},t=0;a.length>t;t++)n._w[a[t]]=n[a[t]]=n[a[t]]||new c;i=o.createElement(s),i.async=1,i.src="//static.woopra.com/js/w.js",e=o.getElementsByTagName(s)[0],e.parentNode.insertBefore(i,e)
			})("woopra");

			woopra.config({
				domain: 'espressologic.com'
			});
			woopra.track();
		}
		catch(e) {
			console.log('Woopra error: ' + e);
		}
	}
	else {
		woopra = { track: function () {}};
	}
	// END WOOPRA

	// Call this to track a user action. The actionName must be defined in Woopra first.
	$rootScope.trackAction = function (actionName, params) {
		if (kahuna.noTracking)
			return;
		try {
			woopra.track(actionName, params);
		}
		catch(e) {
			console.log('Woopra error: ' + e);
		}
	};
}]);

// Set up the Angular/jQuery bridge
kahuna.app.factory('jqueryUI', function ($window, $templateCache, $document, $compile) {
	return {
		wrapper : function (cssSelector, pluginName, options, templateName, dialogScope) {
			if (templateName) {
				var templateDom = $($templateCache.get(templateName));
				$document.append(templateDom);
				$compile(templateDom)(dialogScope);
			}
			$(cssSelector)[pluginName](options);
		},

		performAction : function (cssSelector, pluginName, action, options) {
			if (options) {
				$(cssSelector)[pluginName](action, options);
			}
			else {
				$(cssSelector)[pluginName](action);
			}
		}
	};
});

// Global directives
kahuna.app.directive('selectOnClick', function () {
	return function (scope, element, attrs) {
		element.click(function () {
			element.select();
		});
	};
});

kahuna.app.directive('optionsDisabled', function ($parse) {
	var disableOptions = function (scope, attr, element, data, fnDisableIfTrue) {
		// refresh the disabled options in the select element.
		$("option[value!='?']", element).each(function (i, e) {
			var locals = {};
			locals[attr] = data[i];
			$(this).attr("disabled", fnDisableIfTrue(scope, locals));
		});
	};
	return {
		priority: 0,
		require: 'ngModel',
		link : function (scope, iElement, iAttrs, ctrl) {
			// parse expression and build array of disabled options
			var expElements = iAttrs.optionsDisabled.match(/^\s*(.+)\s+for\s+(.+)\s+in\s+(.+)?\s*/);
			var attrToWatch = expElements[3];
			var fnDisableIfTrue = $parse(expElements[1]);
			scope.$watch(attrToWatch, function (newValue, oldValue) {
				if (newValue)
					disableOptions(scope, expElements[2], iElement, newValue, fnDisableIfTrue);
			}, true);
			// handle model updates properly
			scope.$watch(iAttrs.ngModel, function (newValue, oldValue) {
				var disOptions = $parse(attrToWatch)(scope);
				if (newValue)
					disableOptions(scope, expElements[2], iElement, disOptions, fnDisableIfTrue);
			});
		}
	};
});

kahuna.app.directive('fileChange', [
	function () {
		return {
			link : function (scope, element, attrs) {
				element[0].onchange = function () {
					scope[attrs['fileChange']](element[0]);
				};
			}
		};
	}
]);

kahuna.app.directive('ngBlur', function () {
	return function (scope, elem, attrs) {
		elem.bind('blur', function () {
			scope.$apply(attrs.ngBlur);
		});
	};
});

kahuna.app.filter('shorten', function () {
	return function (input, maxlen) {
		input = input || '';
		if (input.length > maxlen) {
			return input.substring(0, maxlen - 2) + "&hellip;";
		}
		return input;
	};
});

// Go to login screen if this is a reload
if ( !kahuna || !kahuna.serverUrl) {
	if (window.location.href.indexOf('#') > 0 && window.location.href.indexOf('apiKey=') == -1) {
		console.log("This seems to be a reload - redirecting to login screen from " + window.location);
		window.location = window.location.href.substring(0, window.location.href.indexOf('#'));
	}
}

//////////////////////////////////////////////////////////////////////////
// Tour

kahuna.takeTour = function () {
	if ( ! kahuna.readSetting("logicDesignerTourSeen", false)) {
		var steps = [
			{
				element: "#image-arch",
				title: "Welcome",
				content: "It looks like this is your first time using Logic Designer." +
					"We'd like to give you a very quick tour -- this will only take a few seconds."
			},
			{
				element: "#sideBarDiv",
				title: "Navigation",
				content: "You can access all the areas of Logic Designer using the navigation bar."
			},
			{
				element: '#projectSelect',
				title: 'Project Selection',
				content: "Use this dropdown to select a project, or to create a new project.",
				placement: 'bottom'
			},
			{
				element: '#connectWizardButton',
				title: 'Connect Wizard',
				content: 'This is the <strong>fastest</strong> way to start',
				placement: 'right'
			},
			{
				title: 'REST Lab',
				element: "#leftBarRestLab",
				content: "You can exercise your API using the REST Lab."
			},
			{
				title: 'Resources',
				element: "#leftBarResources",
				content: "You can shape your API using resources, which are much more flexible that direct access to tables."
			},
			{
				title: 'JavaScript/Reactive',
				element: "#leftBarRules",
				content: "Your API can react to insert, updates and deletes, using reactive expressions or server-side JavaScript."
			},
			{
				title: 'Live Browser',
				element: "#leftBarLiveBrowser",
				content: "You can also view and update your data using the Live Browser."
			},
			{
				title: 'Tour End',
				element: false,
				content: "Espresso Logic is a rich, exciting environment. We hope you have as much fun " +
					"using it as we had creating it. Thanks for using Espresso!",
					orphan: true
			}
		];
		for (var i = 0; i < steps.length; i+= 1) {
			if (steps[i].title) {
				steps[i].title += ' (' + (i + 1) + ' of ' + (steps.length) + ')';
			}
		}

		var tour = new Tour({
			name: 'logicDesignerTour',
			backdrop: true,
			storage: false,
			steps: steps
		});

		// Initialize the tour
		tour.init();

		// Start the tour
		tour.start();

		kahuna.saveSetting("logicDesignerTourSeen", true);
	}
};
