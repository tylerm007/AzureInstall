describe('Auth', function () {
	var $httpBackend, $rootScope, Auth, Storage, authObject;
	
	beforeEach(function(){
		module( 'espresso.browser' );
		inject(function($injector){
			$httpBackend = $injector.get('$httpBackend' );
			$rootScope = $injector.get('$rootScope' );
			Auth = $injector.get( 'Auth' );
			Storage = $injector.get( 'Storage' );
			var keys = _.keys( Auth.authObject );
			authObject = _.object( keys , keys );
		});
	});
	
	describe('hasPreviousAuth()', function(){
		it( 'should check local storage and return a boolean' , function(){
			expect( Auth.hasPreviousAuth() ).toBe( false );
			Storage.put( Auth.authKey , authObject );
			expect( Auth.hasPreviousAuth() ).toBe( true );
			Storage.remove( Auth.authKey );
		});
	});
	
	describe( 'authenticate()' , function(){
		describe( '[for success]' , function(){
			beforeEach(function(){
				$httpBackend.when( 'GET' , authObject.server + '@tables' ).respond([{}]);
			});
			
			it( 'should successfully query an endpoint' , function(){
				$httpBackend.expectGET( authObject.server + '@tables' );
				Storage.put( Auth.authKey , authObject );
				Auth.authenticate();
				$httpBackend.flush();
				Storage.remove( Auth.authKey );
			});
			
			it( 'should log a user in' , function(){
				spyOn( Auth , 'login' );
				Storage.put( Auth.authKey , authObject );
				Auth.authenticate();                             
				$httpBackend.flush();
				expect( Auth.login ).toHaveBeenCalled();
				Storage.remove( Auth.authKey );
			});
		});
		describe( '[for failure]' , function(){
			beforeEach(function(){
				$httpBackend.when( 'GET' , authObject.server + '@tables' ).respond(401);
			});
			it( 'should fire the failure callback if no auth session exists' , function(){
				var hasFailed = false;
				Storage.put( Auth.authKey , authObject );
				Auth.authenticate(function(){
					hasFailed = true;
				});
				$httpBackend.flush();
				expect( hasFailed ).toBe( true );
				Storage.remove( Auth.authKey );
			});
			
			it( 'should fire the failure callback if the auth session is invalid' , function(){
				var hasFailed = false;
				Auth.authenticate(function(){
					hasFailed = true;
				});
				expect( hasFailed ).toBe( true );
			});
		});
	});

	describe( 'login()' , function(){
		it( 'should set an API key and base url in the espresso object' , function(){
			//whitebox
			spyOn( espresso , 'setApiKey' );
			espresso.baseUrl = 'previous';
			Auth.login( 'username' , 'server' , 'apiKey' );
			expect( espresso.setApiKey ).toHaveBeenCalled();
			expect( espresso.baseUrl ).not.toBe( 'previous' );
		});
		
		it( 'should set $rootScope.currentServer and $rootScope.currentUserName' , function(){
			//whitebox
			Auth.login( 'username' , 'server' , 'apiKey' );
			expect( $rootScope.currentServer ).toBe( 'server' );
			expect( $rootScope.currentUserName ).toBe( 'username' );
		});
	});
	
	
	describe( 'saveSession()' , function(){
		it( 'should save an authSession object in local storage' , function(){
			//blackbox
			Auth.saveSession( 'username' , 'server' , true , 'apiKey' );
			var localAuthObject = Storage.get( Auth.authKey );
			expect( localAuthObject ).not.toBe( null );
			Storage.remove( Auth.authKey );
		});
		
		it( 'should save additional convenience info for future logins' , function(){
			//whitebox
			delete localStorage.browser_lastServer;
			delete localStorage.browser_lastUsername;
			delete localStorage.browser_showPassword;
			Auth.saveSession( 'username' , 'server' , true , 'apiKey' );
			var localAuthObject = Storage.get( Auth.authKey );
			expect( localStorage.browser_lastServer ).toBeDefined();
			expect( localStorage.browser_lastUsername ).toBeDefined();
			expect( localStorage.browser_showPassword ).toBeDefined();
			Storage.remove( Auth.authKey );
		});
	});
});