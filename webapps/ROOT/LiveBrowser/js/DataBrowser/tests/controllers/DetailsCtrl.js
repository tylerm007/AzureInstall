describe('espresso.DetailsCtrl', function () {
	var $scope, controller, Events, Tables;
	beforeEach(function () {
		module('espresso.browser');
		inject(function ($injector, $rootScope, $controller, _Events_, _Tables_) {
			$scope = $rootScope.$new();
			Events = _Events_;
			Tables = _Tables_;
			controller = $controller('espresso.DetailsCtrl', {
				$scope: $scope,
				Tables: Tables,
				Events: Events
			}); 
		});
		return;
	});

	//Form window back behaviors:
	describe('$scope.formWindowBack()', function () {
		it('should revert $scope.scalarRow to a previous value', function () {
			return;
			var previousRow = {
				columnA: 'valueA'
			};
			FormWindowHelper.previousRows[0] = previousRow;
			$scope.scalarRow = {
				columnA: 'valueB'
			};
			$scope.formWindowBack();
			waits(50);
			runs(function () {
				expect($scope.scalarRow).toEqual();
			});
		});
	});
	
	//Form window row insertion
	describe('$scope.createRow()', function(){
		it('should broadcast "WatchMainRow"' , function () {
			Tables.getSettings = function () {return {};};
			spyOn(Events, 'broadcast');
			$scope.createRow();
			
			expect(Events.broadcast).toHaveBeenCalledWith('WatchMainRow', jasmine.any(Object));
		});
	});
	describe('$scope.createRow()', function(){
		it('should event data to contain row.@metadata.action' , function () {
			Tables.getSettings = function () {return {};};
			var data = $scope.createRow();

			expect(data.row['@metadata'].action).toBeDefined();
			
			expect(data.row['@metadata'].action).toBe('INSERT');
		});
	});
	
	//called during $scope.createRow, also part of Form window row insertion
	describe('$scope.initializeFormWindowParameters()', function () {
		it('should initialize required $scope variables' , function () {
			var eventData = {
				row: {'@metadata':{}},
				settings: {name: 'TableName', scalarColumns: {'ColumnA': {}, 'ColumnB': {}}}
			};
			spyOn(Events, 'broadcast'); //not used, but prevents an actual Event.on call
			var data = $scope.initializeFormWindowParameters({}, eventData);

			expect($scope.scalarRow).toEqual({'@metadata':{}});
			
			expect($scope.formTableName).toEqual('TableName');
			
			expect($scope.formColumns).toEqual({'ColumnA': {}, 'ColumnB': {}});
		});
	});
	describe('$scope.initializeFormWindowParameters()', function () {
		it('should broadcast "WatchFormRow"' , function () {
			var eventData = {
				row: {'@metadata':{}},
				settings: {name: 'TableName', scalarColumns: {'ColumnA': {}, 'ColumnB': {}}}
			};
			spyOn(Events, 'broadcast');
			var data = $scope.initializeFormWindowParameters({}, eventData);
			
			expect(Events.broadcast).toHaveBeenCalledWith('WatchFormRow', jasmine.any(Object));
		});
	});
	describe('$scope.initializeFormWindowParameters()', function () {
		it('should update the pk' , function () {
			var eventData = {
				row: {'@metadata':{}},
				settings: {name: 'TableName', scalarColumns: {'ColumnA': {}, 'ColumnB': {}}}
			};
			spyOn(Events, 'broadcast');
			spyOn($scope, 'updateScalarRowPK');
			var data = $scope.initializeFormWindowParameters({}, eventData);
			
			expect($scope.updateScalarRowPK).toHaveBeenCalled();
		});
	});

	describe('$scope.initializeFormRowParameters()', function () {
		it('should initialize/reset controller variables', function () {
			var eventData = {
				row: {'@metadata':{}},
				details: {name: 'TableName'},
			};
			spyOn(Events, 'broadcast');
			spyOn($scope, 'updateScalarRowPK');
			$scope.attribSearchString = '';
			var scalarTableInfo = {};
			scalarTableInfo = $scope.initializeFormRowParameters({}, eventData);

			//reset attribute search filter
			expect($scope.attribSearchString).toBe('');
			
			expect(scalarTableInfo.name).toBe('TableName');
		});
	});
	describe('$scope.initializeFormRowParameters()', function () {
		it('should update Tables.formTable', function () {
			var eventData = {
				row: {'@metadata':{}},
				details: {name: 'TableName'},
			};
			spyOn(Events, 'broadcast');
			spyOn($scope, 'updateScalarRowPK');
			
			Tables.formTable = 'OldTableName';
			var scalarTableInfo = $scope.initializeFormRowParameters({}, eventData);

			expect(Tables.formTable).toBe('TableName');
		});
	});
	describe('$scope.initializeFormRowParameters()', function () {
		it('should update the pk', function () {
			var eventData = {
				row: {'@metadata':{}},
				details: {name: 'TableName'},
			};
			spyOn(Events, 'broadcast');
			spyOn($scope, 'updateScalarRowPK');
			$scope.attribSearchString = '';
			var scalarTableInfo = {};
			scalarTableInfo = $scope.initializeFormRowParameters({}, eventData);
			
			expect($scope.updateScalarRowPK).toHaveBeenCalled();
		});
	});
	
	return;
	describe('$scope.', function () {
		it('should ', function () {
			
		});
	});
});