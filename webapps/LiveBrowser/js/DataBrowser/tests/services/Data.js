describe( 'EspressoData' , function(){
	var $httpBackend, $rootScope, EspressoData;
	beforeEach(function(){
		module( 'espresso.browser' );
		inject(function($injector){
			$httpBackend = $injector.get( '$httpBackend' );
			$rootScope = $injector.get( '$rootScope' );
			EspressoData = $injector.get( 'EspressoData' );
		});
	});

	describe( 'create()' , function(){
		//post
		describe( '[for success]' , function(){
			beforeEach(function(){
				
			});
			
			it( 'should send a post request to a defined url' , function(){
				
			});
			
			it( 'should fire a success callback' , function(){
				
			});
		});
		
		describe( '[for failure]' , function(){
			it( 'should fire a failure callback' , function(){
				
			});
		});
	});

	describe( 'batch()' , function(){
		//put
		describe( '[for success]' , function(){
			beforeEach(function(){
				
			});
			
			it( 'should send a post request to a defined url' , function(){
				
			});
			
			it( 'should fire a success callback' , function(){
				
			});
		});
		
		describe( '[for failure]' , function(){
			it( 'should fire a failure callback' , function(){
				
			});
		});
	});
	
	describe( 'update()' , function(){
		//put
		describe( '[for success]' , function(){
			beforeEach(function(){
				
			});
			
			it( 'should send a post request to a defined url' , function(){
				
			});
			
			it( 'should fire a success callback' , function(){
				
			});
		});
		
		describe( '[for failure]' , function(){
			it( 'should fire an event handler: espresso.services.handleError' , function(){
				
			});
		});
	});
	
	describe( 'query()' , function(){
		//get
		describe( '[for success]' , function(){
			beforeEach(function(){
				
			});
			
			it( 'should send a get request to a defined url' , function(){
				
			});
			
			it( 'should fire a success callback' , function(){
				
			});
		});
		
		describe( '[for failure]' , function(){
			it( 'should fire an event handler: espresso.services.handleError' , function(){
				
			});
		});
	});
	
	describe( 'formatForSQL()' , function(){
		it( 'should wrap column defined column types in quotes' , function(){
			
		});
	});
	
	describe( 'buildParentQuery()' , function(){
		it( 'should build an sql fragment for querying parent tables' , function(){
			
		});
	});
	
	describe( 'fillParents( children , tblInfo )' , function(){
		it( 'should populate @param:tblInfo with parent columns' , function(){
			
		});
	});
	
	describe( 'remove()' , function(){
		//not used in codebase (2014-03-09)
	});
	describe( 'removeWithUrl()' , function(){
		//not used in codebase (2014-03-09)
	});
	describe( 'pingServer()' , function(){
		//not used in codebase (2014-03-09)
	});
});