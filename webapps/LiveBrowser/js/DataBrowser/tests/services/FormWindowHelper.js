describe('espresso.app.service:FormWindowHelper', function () {
	var FormWindowHelper;
	
	beforeEach(function ($injector) {
		module( 'espresso.browser' );
		inject(function($injector){
			FormWindowHelper = $injector.get('FormWindowHelper');
		});
	});
	
	//previous row behaviors:
	describe('FormWindowHelper.getTemplate(truncateBoolean)', function () {
		it('should return the first element of FormWindowElement.previousRows', function () {
			FormWindowHelper.previousRows[0] = {
				row: {
					columnA: 'valueA'
				}
			};
			
			var lastRow = FormWindowHelper.getLastRow();
			
			expect(lastRow).toEqual(FormWindowHelper.previousRows[0]);
		});
		it('should truncate FormWindowHelper.previousRows if truncateBoolean is TRUE', function () {
			FormWindowHelper.previousRows[0] = {
				row: {
					columnA: 'valueA'
				}
			};
			FormWindowHelper.previousRows[0] = {
				row: {
					columnB: 'valueB'
				}
			};
			var lastRow = FormWindowHelper.getLastRow(true);
			expect(FormWindowHelper.previousRows.length).toEqual(1);
		});
	});
	describe('FormWindowHelper.addToPreviousRows(row)', function () {
		it('should prepend row to FormWindowHelper.previousRows', function () {
			var prepend = {
				row: {
					columnA: 'valueA'
				}
			};
			
			FormWindowHelper.addToPreviousRows(prepend);
			
			expect(FormWindowHelper.previousRows[0]).toEqual(prepend);
		});
	});
	describe('FormWindowHelper.isPreviousRow(row)', function () {
		it('should indicate whether or not a row was flagged as being in FormWindowHelper.previousRows history', function () {
			var row = {
				columnA: 'valueA'
			};
			FormWindowHelper.addToPreviousRows(row);
			var isPrevious = FormWindowHelper.getLastRow();
			
			expect(isPrevious).toEqual(jasmine.any(Object));
		});
	});
	
	return;
	describe('FormWindowHelper.', function () {
		it('should', function () {
			
		});
	});
});