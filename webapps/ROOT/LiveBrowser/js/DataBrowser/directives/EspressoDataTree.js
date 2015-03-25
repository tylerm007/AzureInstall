espresso.app.directive('espressoDataTree', [
	'$rootScope', '$compile', '$timeout',
	function ($rootScope, $compile, $timeout) {
		var EspressoDataTree = {
			restrict: 'A',
			scope: {
				treeData: '=',
				treeName: '@'
			},
			template: '<div class="eslo-set-container {{className}}">' +
				'<div class="eslo-set-row eslo-set-{{$index}}" ng-repeat="key in setKeys">' +
					'<div class="set-column set-navigation-icon">' +
						'<a ng-if="setDescriptions[key].isNavigable" ng-click="toggleOpen(key)">' + 
							'<i ng-if="!setDescriptions[key].isOpen" class="fa fa-plus-square-o"></i>' +
							'<i ng-if="setDescriptions[key].isOpen" class="fa fa-minus-square"></i>' +
						'</a>' +
						'<a ng-if="!setDescriptions[key].isNavigable"><i class="fa fa-minus"></i></a>' +
					'</div>' +
					'<div class="set-column">' +
						'<a ng-if="setDescriptions[key].isNavigable" ng-click="selectObject($event, $index, cssHandle);toggleOpen(key);">{{setDescriptions[key].bestKey}}</a>' + 
						'<a ng-if="!setDescriptions[key].isNavigable" ng-click="selectObject($event, $index, cssHandle);toggleOpen(key);">{{setDescriptions[key].bestKey}} : {{setDescriptions[key].copy}}</a>' + 
					'</div>' +
					'<div class="nested-set" ng-if="setDescriptions[key].isNavigable" ng-show="setDescriptions[key].isOpen">' +
					'</div>' +
				'</div>' +
			'</div>' +
			'<div id="leftGridFooter" class="eslo-resource-footer" ng-if="params.pagination">' +
				'<button style="max-height:73px !important;" class="eslo-button" ng-click="controls.fetchMore()"><i class="fa fa-arrow-circle-down"></i>Fetch More</button>' +
				'<button style="max-height:73px !important;" class="eslo-button" ng-click="controls.expandAll()"><i class="fa fa-plus-square"></i>Expand All</button>' +
				'<button style="max-height:73px !important;" class="eslo-button" ng-click="controls.collapseAll()"><i class="fa fa-minus-square"></i>Collapse All</button>' +
			'</div>',
			//link: function (scope, element, attrs, controller) {},
			controller	: [
				'$scope', '$rootScope', 'ResourceHelper', 'CellTemplates', 'Events',
				function ($scope, $rootScope, ResourceHelper, CellTemplates, Events) {
					$scope.className = 'eslo-scope-' + $scope.$id; //template vv
					$scope.cssHandle = '.' + $scope.className; //$scope ^^
					$scope.sets = {};
					$scope.setKeys = [];
					$scope.setDescriptions = {};
					
					$scope.selectObject = function selectObject($event, $index, cssHandle) {
						if ($scope.isLeaf(cssHandle, $index)) {
							var set = $scope.$eval('$parent.set'); //if $scope.$parent.set is falsy, you're in the top most set
							var broadcast = {
								row: set
							};
							Events.broadcast('WatchResourceRow', broadcast);
						}
						else {
							var set = $scope.sets[$scope.setKeys[$index]];
							var broadcast = {
								row: set
							};
							Events.broadcast('WatchResourceRow', broadcast);
						}
					};
					$scope.isLeaf = function isLeaf(cssHandle, $index) {
						return !angular.element(cssHandle + ' > .eslo-set-' + $index + ' > .nested-set').length;
					};
					
					$scope.isNavigableElement = function isNavigableElement(element) {
						return angular.isObject(element);
					};
					
					$scope.params = {}; //parameters for template interfaces
					$scope.controls = {
						fetchMore: function fetchMore() {
							if ($scope.params.pagination) {
								Events.broadcast('ResourceFetchMore', {
									url: $scope.params.pagination.next_batch,
									hash: $scope.$id
								});
							}
						},
						expandAll: function expandAll() {
							$scope.$broadcast('TriggerExpandAll');
						},
						collapseAll: function collapseAll() {
							$scope.$broadcast('TriggerCollapseAll');
						}
					};

					$scope.$on('TriggerExpandAll', function () {
						_.each($scope.setDescriptions, function (element, index) {
							$scope.toggleOpen(index, true);
						});
					});
					$scope.$on('TriggerCollapseAll', function () {
						_.each($scope.setDescriptions, function (element, index) {
							$scope.toggleOpen(index, false);
						});
					});
					Events.on('ResourceDataAppend', function (event, data) {
						if ($scope.treeData) {
							$scope.treeData = $.merge($scope.treeData, data.append);
						}
					});
					
					$scope.helpers = {};
					$scope.params = {};
					$scope.params.lastBestKey = '';
					$scope.helpers.getSetKeys = function getSetKeys() {
						var defaultKeys = _.keys($scope.sets);
						var keys = [];
						_.each(defaultKeys, function (element, index) {
							if (parseInt(element) == element) {
								keys.push($scope.helpers.getBestKey($scope.sets[element], index));
							}
							else {
								keys.push(element);
							}
						});
						return keys;
					};
					
					//uses scope.params.lastBestKey
					$scope.helpers.getBestKey = function getBestKey(set, defaultIndex) {
						var key = null;
						var candidates = [];
						
						if (angular.isDefined(set[$scope.params.lastBestKey])) {
							return set[$scope.params.lastBestKey];
						}
						_.each(set, function findCandidates(element, index) {
							if (angular.isString(element)) {
								if (parseInt(element) == element) { //this is numeric, not ideal, but useable
									candidates.push(index);
								}
								else {
									candidates.unshift(index);
								}
							}
						});
						
						if (!candidates.length) {
							return defaultIndex;
						}
						
						$scope.params.lastBestKey = candidates[0];
						return set[candidates[0]];
					};

					$scope.$watch('treeData', function (current, previous) {
						$scope.sets = {};
						if (current && angular.isObject(current)) {
							try{
								if (ResourceHelper.isPaginatedData(current)) {
									$scope.params.pagination = ResourceHelper.getPaginationObject(current);
								}
								else {
									$scope.params.pagination = false;
								}
								_.each(current, function (element, index) {
									//console.log(index);
									if (index === '@metadata') {return;}
									//is conditionally excluded?
									if ($scope.params && element['@metadata'] && element['@metadata'].next_batch) {
										//exclude it
										return;
									}
									
									if ($scope.isNavigableElement(element)) {
										//go on, include it
										$scope.sets[index] = element;
										$scope.setDescriptions[index] = {
											isNavigable: $scope.isNavigableElement(element),
											isOpen: false,
											isMetaObject: $scope.isMetaObject(element),
											copy: angular.copy(element),
											bestKey: $scope.helpers.getBestKey(element, index) || index
										};
									} else {
										//console.log(element, $scope.treeData);
									}
								});
							} catch(e) {
								console.log(e);
								//if _.each(current) fails, it wasn't a loopable object
							}
							$scope.setKeys = _.keys($scope.sets);
							if ($scope.treeName) {
								$scope.$evalAsync(function () {
									$scope.openAll();
								});
							}
						} else {
							console.log('not an obj', current)
						}
					}, true);
				
					
					
					$scope.openAll = function openAll() {
						_.each($scope.setDescriptions, function (element, index) {
							$scope.toggleOpen(index, true);
						});
					};
					
					$scope.addNest = function addNest(key) {
						var scope = $scope.$new();
						scope.set = $scope.sets[key];
						var i = $scope.setKeys.indexOf(key);
						var nest = $compile('<div espresso-data-tree tree-data="set"></div>')(scope);
						var selector = $scope.cssHandle + ' > .eslo-set-' + i + ' > .nested-set';
						var $nest = angular.element(selector);// .nested-set:first-child');
						$nest.html(nest);
					};
					
					$scope.isMetaObject = function isMetaObject(element) {
						//if ()
						return false;
						//test for @metadata
							//long term, we should request from LD what the @metadata verb may be
					};
					
					$scope.toggleOpen = function toggleOpen(key, force) {
						$scope.addNest(key);
						if (angular.isDefined(force)) {
							$scope.setDescriptions[key].isOpen = force;
						}
						else {
							$scope.setDescriptions[key].isOpen = !$scope.setDescriptions[key].isOpen;
						}
					};
					
				}
			]
		};
		return EspressoDataTree;
}]);