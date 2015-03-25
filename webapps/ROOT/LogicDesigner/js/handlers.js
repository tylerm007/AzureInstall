kahuna.handlers = {

	HandlerCtrl : function ($rootScope, $scope, $http, $resource, $routeParams, $location, $timeout, KahunaData) {

		// $( "#EditorTabs" ).tabs();
		$rootScope.currentPage = 'handlers';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authentication';
		$rootScope.helpDialog('handlers', 'Help', localStorage['eslo-ld-learn-complete']);

		$timeout(function(){
			kahuna.handlers.aceEditor = ace.edit("handlerJSCode");
			kahuna.handlers.aceEditor.setTheme("ace/theme/xcode");
			kahuna.handlers.aceEditor.getSession().setMode("ace/mode/javascript");
			$scope.$broadcast('AceReady');
		}, 1000);

		/*  not yet in use
		 * kahuna.handlers.aceEditor.container.addEventListener('keyup',
		 *   function (e) {
		 *      if( !! $scope.$$childHead.handlersForm ) {
		 *        $scope.$$childHead.handlersForm.$setDirty();
		 *      }
		 *    }
		 *  , false);
		 */

		$scope.data = {};
		$scope.data.serverUrl = kahuna.serverUrl.substring(0, kahuna.serverUrl.length - 5);

		var findHandlerIndex = function(handler) {
			if ( ! $scope.handlers)
				return -1;
			for (var idx = 0; idx < $scope.handlers.length; idx++) {
				if ($scope.handlers[idx].ident == handler.ident)
					return idx;
			}
			return -1;
		};

		// Fetch all handlers for the current project
		$scope.$on('AceReady', function () {
			KahunaData.query('admin:handlers', {pagesize: 100, filter: 'project_ident=' + $scope.currentProject.ident}, function(data){
				$scope.handlers = data;
				if (data.length == 0) {
					return;
				}
				$scope.selectedHandler = data[0];
				kahuna.handlers.aceEditor.setValue($scope.selectedHandler.code);
				kahuna.handlers.aceEditor.getSession().getSelection().moveCursorFileStart();
				$scope.handlerSelected();
			});
		});

		$scope.handlerSelected = function() {
			if ($scope.selectedHandler) {
				kahuna.handlers.aceEditor.setValue($scope.selectedHandler.code);
				$scope.handlerGet = $scope.selectedHandler.verbs.indexOf('GET') > -1;
				$scope.handlerPost = $scope.selectedHandler.verbs.indexOf('POST') > -1;
				$scope.handlerPut = $scope.selectedHandler.verbs.indexOf('PUT') > -1;
				$scope.handlerDelete = $scope.selectedHandler.verbs.indexOf('DELETE') > -1;
			}
			else {
				kahuna.handlers.aceEditor.setValue("");
				$scope.handlerGet = false;
				$scope.handlerPost = false;
				$scope.handlerPut = false;
				$scope.handlerDelete = false;
			}
			kahuna.handlers.aceEditor.getSession().getSelection().moveCursorFileStart();
		};

		$scope.createHandler = function() {
			var newHandler = {
					project_ident: $scope.currentProject.ident,
					name: "New handler",
					active: true,
					url_pattern: ".*",
					verbs: "GET",
					code: "var res = {result: 'Hello'};\nreturn JSON.stringify(res);\n"
			};
			KahunaData.create('admin:handlers', newHandler, function(data){
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:handlers' && modObj['@metadata'].verb === 'INSERT') {
						$scope.handlers.push(modObj);
						$scope.selectedHandler = modObj;
						$scope.handlerSelected();
					}
				}
			});
			kahuna.logEvalProgress("created handler", $scope.handlers.length );
		};

		$scope.deleteHandler = function() {
			if ( ! confirm("Are you sure you want to delete this handler (" + $scope.selectedHandler.name +
						")?"))
				return;
			KahunaData.remove($scope.selectedHandler, function(data){
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:handlers' && modObj.ident === $scope.selectedHandler.ident) {
						var idx = findHandlerIndex(modObj);
						if (idx > -1) {
							$scope.handlers.splice(idx, 1);
							if ($scope.handlers.length > 0)
								$scope.selectedHandler = $scope.handlers[0];
							else
								$scope.selectedHandler = null;
							$scope.handlerSelected();
							break;
						}
					}
				}
				kahuna.util.info('Handler was deleted');
			});
		};

		$scope.saveHandler = function() {
			$scope.selectedHandler.code = kahuna.handlers.aceEditor.getValue();
			$scope.selectedHandler.verbs = "";
			if ($scope.handlerGet) $scope.selectedHandler.verbs += "GET,";
			if ($scope.handlerPost) $scope.selectedHandler.verbs += "POST,";
			if ($scope.handlerPut) $scope.selectedHandler.verbs += "PUT,";
			if ($scope.handlerDelete) $scope.selectedHandler.verbs += "DELETE";
			KahunaData.update($scope.selectedHandler, function(data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:handlers' && modObj.ident === $scope.selectedHandler.ident) {
						var updatedIndex = findHandlerIndex(modObj);
						$scope.handlers[updatedIndex] = modObj;
						$scope.selectedHandler = modObj;
						kahuna.util.info('Handler was saved');
					}
				}
			});
		};
	}
};
