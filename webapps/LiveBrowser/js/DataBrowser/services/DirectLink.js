/**
 *
 */
espresso.app.service('DirectLink', [
	'$location', '$rootScope', '$routeParams', 'Settings', '$window', 'Storage', 'Tables',
	function ($location, $rootScope, $routeParams, Settings, $window, Storage, Tables) {
	var Module = {
		params: {
			open: null, //not implemented; optionally an object with open panel #ids?
			closed: null, //not implemented; optionall an object with closed panel #ids?
			dimensions: null, //not implemented; panel widths and heights (one day soon)
			editMode: null, //not implemented;
			filter: null, //not implemented;
			childTable: null, //not implemented;
			table: null,
			pk: null,
			search: null, //not implemented;
			server: null,
			username: null,
			apiKey: null
		},
		generators	: {
			table: 'getTableFragment',
			pk: 'getPkFragment'
		},
		getLoginValues : function (loginValues) {
			if (angular.isDefined($routeParams.server)) {
				loginValues.serverName = $routeParams.server;
			}
			if (angular.isDefined($routeParams.username)) {
				loginValues.userName = $routeParams.username;
			}
			return loginValues;
		},
		put: function (key, value) {
			Module.params[key] = value;
		},
		getTableFragment: function () {
			var mainTableDetails = Tables.getDetails(Tables.mainTable);
			if (angular.isDefined(mainTableDetails)) {
				var formTableDetails = Tables.getDetails(Tables.formTable);
				return formTableDetails.name;
			}
			return null;
		},
		getPkFragment: function ( ){
			var formTableDetails = Tables.getDetails(Tables.formTable);
			var $detailsScope = angular.element('.details-content').scope();
			if (angular.isDefined(formTableDetails) && angular.isDefined($detailsScope.scalarRow)) {
				return $detailsScope.scalarRow[formTableDetails.keys[0].columns];
			}
			return null;
		},
		checkLinkingUrl: function (callback) {
			callback = callback || function () {};
			if (Module.isLinkingUrl()) {
				callback();
				Module.broadcast();
			}
		},
		broadcast: function () {
			var params = $location.search();
			$rootScope.$emit('DirectLinkUpdate', angular.extend(Module.params, params));
		},
		isLinkingUrl: function () {
			var params = $location.search();
			var isLinkingUrl = false;
			angular.forEach(params, function (element, index) {
				if (angular.isDefined(Module.params[index])) {
					isLinkingUrl = true;
				}
			});
			if (angular.isDefined($routeParams.table)) {
				isLinkingUrl = true;
			}
			return isLinkingUrl;
		},
		generateUrl	: function (params) {
			var base = $location.absUrl().split('#')[0];
			var link = base;
			params = angular.extend({
				readable: true,
				username: false,
				server: false,
				apiKey: false
			}, angular.copy(params));

			var fragments = {};
			angular.forEach(Module.generators, function (element, index) {
				fragments[index] = Module[element]();
			});

			if (params.readable) {
				//readable link generation
				if (angular.isDefined(fragments.table)) {
					link += '#/link/' + fragments.table;
					if (angular.isDefined(fragments.pk)) {
						link += '/' + fragments.pk;
					}
				}
			}
			else {
				link += '#/?' + jQuery.param(fragments);
			}

			var authFragments = '';
			var authSession = Settings.getAuthSession();
			if (params.server) {authFragments += 'server=' + authSession.server + '&';}
			if (params.username) {authFragments += 'username=' + authSession.username + '&';}
			if (params.apiKey) {authFragments += 'apiKey=' + authSession.apikey + '&';}
			console.log

			if (_.contains(link, '?')) {
				link += '&' + authFragments;
			}
			else {
				link += '?' + authFragments;
			}
			return link;
		}
	};
	return Module;
}]);
