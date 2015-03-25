describe( 'Service: DirectLink' , function(){
	beforeEach(function(){
		link = module( 'DirectLink' );
		inject(function( $injector ){
			DirectLink = $injector.get( 'DirectLink' );
			$location = $injector.get( '$location' );
			$rootScope = $injector.get( '$rootScope' );
			$scope = $rootScope.$new();
		});
	});
	
	it( 'should identify urls with linking parameters.' , function(){
		expect( DirectLink.isLinkingUrl() ).toBe( false );
		$location.search({table:'customer'});
		expect( DirectLink.isLinkingUrl() ).toBe( true );
		$location.search({});
	});
	
	it( 'should broadcast an event when updating' , function(){
		$location.search({table:'customer'});
		spyOn( $rootScope, '$broadcast' );
		DirectLink.checkLinkingUrl()
		expect( $rootScope.$broadcast ).toHaveBeenCalledWith( 'DirectLinkUpdate' , DirectLink.params );
		$location.search({});
	});
});