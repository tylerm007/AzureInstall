var kahuna;
kahuna.events = {

	EventCtrl : function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData, $timeout) {

		$rootScope.currentPage = 'events';
		$rootScope.currentPageHelp = 'docs/logic-designer/events';
		$rootScope.helpDialog('events', 'Help', localStorage['eslo-ld-learn-complete']);

		//give the DOM time to compile
		$timeout(function(){
			kahuna.events.aceEditor = ace.edit('handlerJSCode');
			kahuna.events.aceEditor.setTheme('ace/theme/xcode');
			kahuna.events.aceEditor.getSession().setMode('ace/mode/javascript');
			$scope.$broadcast('AceReady');
		}, 1000);

		$scope.data = {};

		var findHandlerIndex = function findHandlerIndex(handler) {
			if ( ! $scope.handlers)
				return -1;
			for (var idx = 0; idx < $scope.handlers.length; idx++) {
				if ($scope.handlers[idx].ident == handler.ident)
					return idx;
			}
			return -1;
		};

		$scope.$on('AceReady', function () {
			// Fetch all event handlers for the current project
			KahunaData.query('admin:eventhandlers', {pagesize: 100, filter: 'project_ident=' + $scope.currentProject.ident}, function (data) {
				$scope.handlers = data;
				if (data.length == 0)
					return;
				$scope.selectedHandler = data[0];
				kahuna.events.aceEditor.setValue($scope.selectedHandler.code);
				kahuna.events.aceEditor.getSession().getSelection().moveCursorFileStart();
				$scope.handlerSelected();
			});
		});

		$scope.handlerSelected = function handlerSelected() {
			if ($scope.selectedHandler) {
				kahuna.events.aceEditor.setValue($scope.selectedHandler.code);
			}
			else {
				kahuna.events.aceEditor.setValue('');
				return;
			}
			kahuna.events.aceEditor.getSession().getSelection().moveCursorFileStart();
			kahuna.events.aceEditor.getSession().getSelection().clearSelection();

			KahunaData.query('admin:breakpoints', 'eventhandler_ident=' + $scope.selectedHandler.ident, function (data) {
				$scope.data.breakpoints = data;
				var bps = [];
				for (var i = 0; i < data.length; i++) {
					bps.push(data[i].line_num - 1);
				}
				kahuna.events.aceEditor.getSession().setBreakpoints(bps);
			});
		};

		$scope.createHandler = function createHandler() {
			var newHandler = {
					project_ident: $scope.currentProject.ident,
					name: 'New event handler',
					active: true,
					eventtype_ident: 1, // request event by default
					code: '// Event handling code goes here\n'
				};
			KahunaData.create('admin:eventhandlers', newHandler, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:eventhandlers' && modObj['@metadata'].verb === 'INSERT') {
						$scope.handlers.push(modObj);
						$scope.selectedHandler = modObj;
						$scope.handlerSelected();
					}
				}
			});
		};

		$scope.deleteHandler = function deleteHandler() {
			if ( ! confirm('Are you sure you want to delete this event handler (' + $scope.selectedHandler.name +
						')?'))
				return;
			KahunaData.remove($scope.selectedHandler, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:eventhandlers' && modObj.ident === $scope.selectedHandler.ident) {
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
				kahuna.util.info('Event handler was deleted');
			});
		};

		$scope.saveHandler = function saveHandler() {
			$scope.selectedHandler.code = kahuna.events.aceEditor.getValue();
			KahunaData.update($scope.selectedHandler, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:eventhandlers' && modObj.ident === $scope.selectedHandler.ident) {
						var updatedIndex = findHandlerIndex(modObj);
						$scope.handlers[updatedIndex] = modObj;
						$scope.selectedHandler = modObj;
						kahuna.util.info('Event handler was saved');
					}
				}
			});
		};
	}
};
