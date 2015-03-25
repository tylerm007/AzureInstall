describe('Masks', function () {
	//var $scope, controller, Settings, Tables, $rootScope, tableName, broadcaster, $rootScope;
	var Masks;
	
	beforeEach(function ($injector) {
		module( 'espresso.browser' );
		inject(function($injector){
			Masks = $injector.get('Masks');
		});
	});
	
	describe('Masks.getTemplate()', function () {
		it('should return a template or false', function () {
			var expectFalse = Masks.getTemplate('noTemplateExists');
			var expectTrue = Masks.getTemplate('rich');
			expect(expectFalse).toEqual(false);
			expect(expectTrue).toBeTruthy(true);
		});
	});
});