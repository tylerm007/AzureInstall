describe( 'Tables.' , function(){
	var $httpBackend, $rootScope, Tables;
	
	beforeEach(function(){
		module( 'espresso.browser' );
		inject(function($injector){
			$httpBackend = $injector.get( '$httpBackend' );
			Tables = $injector.get( 'Tables' );
			$rootScope = $injector.get( '$rootScope' );
			//the raw response from MDH's local sample schema as of 3/7/2014
			$httpBackend.when( 'GET' , espresso.projectUrl + '@tables/*' ).respond([{"@metadata":{href:"http://localhost:8080/KahunaService/rest/abl/demo/v1/@tables/customer"},name:"customer",primaryKey:{columns:[{name:"name",type:"VARCHAR",size:30,computed:false,is_editable:true}]},columns:[{name:"name",type:"VARCHAR",size:30,nullable:false,computed:false,is_editable:true},{name:"balance",type:"DECIMAL",size:19,nullable:true,computed:true,is_editable:false},{name:"credit_limit",type:"DECIMAL",size:19,nullable:false,computed:false,is_editable:true},{name:"time",type:"TIME",nullable:false,computed:false,is_editable:true},{name:"timestamp",type:"TIMESTAMP",size:19,nullable:false,computed:false,is_editable:true}],children:[{name:"purchaseorderList",child_table:"purchaseorder",child_columns:["customer_name"],parent_columns:["name"]}],keys:[{name:"PRIMARY",type:"primary",columns:"name"}]},{"@metadata":{href:"http://localhost:8080/KahunaService/rest/abl/demo/v1/@tables/employee"},name:"employee",primaryKey:{columns:[{name:"employee_id",type:"BIGINT",size:19,computed:false,is_editable:true}]},columns:[{name:"employee_id",type:"BIGINT",size:19,nullable:false,computed:false,is_editable:true},{name:"login",type:"VARCHAR",size:30,nullable:true,computed:false,is_editable:true}],children:[{name:"employee_pictureList",child_table:"employee_picture",child_columns:["employee_id"],parent_columns:["employee_id"]},{name:"purchaseorderList",child_table:"purchaseorder",child_columns:["salesrep_id"],parent_columns:["employee_id"]}],keys:[{name:"PRIMARY",type:"primary",columns:"employee_id"},{name:"login",type:"candidate",columns:"login"}]},{"@metadata":{href:"http://localhost:8080/KahunaService/rest/abl/demo/v1/@tables/employee_picture"},name:"employee_picture",primaryKey:{columns:[{name:"employee_id",type:"BIGINT",size:19,computed:false,is_editable:true}]},columns:[{name:"employee_id",type:"BIGINT",size:19,nullable:false,computed:false,is_editable:true},{name:"icon",type:"VARBINARY",size:2e3,nullable:true,computed:false,is_editable:true},{name:"picture",type:"BLOB",nullable:true,computed:false,is_editable:true},{name:"voice",type:"BLOB",size:16777215,nullable:true,computed:false,is_editable:true},{name:"resume",type:"VARCHAR",nullable:true,computed:false,is_editable:true}],parents:[{name:"employee_picture",parent_table:"employee",parent_columns:["employee_id"],child_columns:["employee_id"]}],keys:[{name:"PRIMARY",type:"primary",columns:"employee_id"}]},{"@metadata":{href:"http://localhost:8080/KahunaService/rest/abl/demo/v1/@tables/lineitem"},name:"lineitem",primaryKey:{columns:[{name:"lineitem_id",type:"BIGINT",size:19,computed:false,is_editable:true}]},columns:[{name:"lineitem_id",type:"BIGINT",size:19,nullable:false,computed:false,is_editable:true},{name:"product_number",type:"BIGINT",size:19,nullable:false,computed:false,is_editable:true},{name:"order_number",type:"BIGINT",size:19,nullable:false,computed:false,is_editable:true},{name:"qty_ordered",type:"INTEGER",size:10,nullable:false,computed:false,is_editable:true},{name:"product_price",type:"DECIMAL",size:19,nullable:true,computed:true,is_editable:true},{name:"amount",type:"DECIMAL",size:19,nullable:true,computed:true,is_editable:false}],parents:[{name:"product",parent_table:"product",parent_columns:["product_number"],child_columns:["product_number"]},{name:"lineitem_purchaseorder",parent_table:"purchaseorder",parent_columns:["order_number"],child_columns:["order_number"]}],keys:[{name:"PRIMARY",type:"primary",columns:"lineitem_id"}]},{"@metadata":{href:"http://localhost:8080/KahunaService/rest/abl/demo/v1/@tables/product"},name:"product",primaryKey:{columns:[{name:"product_number",type:"BIGINT",size:19,computed:false,is_editable:true}]},columns:[{name:"product_number",type:"BIGINT",size:19,nullable:false,computed:false,is_editable:true},{name:"name",type:"VARCHAR",size:50,nullable:true,computed:false,is_editable:true},{name:"price",type:"DECIMAL",size:19,nullable:false,computed:false,is_editable:true}],children:[{name:"lineitemList",child_table:"lineitem",child_columns:["product_number"],parent_columns:["product_number"]}],keys:[{name:"PRIMARY",type:"primary",columns:"product_number"}]},{"@metadata":{href:"http://localhost:8080/KahunaService/rest/abl/demo/v1/@tables/purchaseorder"},name:"purchaseorder",primaryKey:{columns:[{name:"order_number",type:"BIGINT",size:19,computed:false,is_editable:true}]},columns:[{name:"order_number",type:"BIGINT",size:19,nullable:false,computed:false,is_editable:true},{name:"amount_total",type:"DECIMAL",size:19,nullable:true,computed:true,is_editable:false},{name:"paid",type:"BOOLEAN",size:3,nullable:false,computed:false,is_editable:true},{name:"item_count",type:"INTEGER",size:10,nullable:true,computed:false,is_editable:true},{name:"notes",type:"VARCHAR",size:1e3,nullable:true,computed:false,is_editable:true},{name:"customer_name",type:"VARCHAR",size:30,nullable:false,computed:false,is_editable:true},{name:"salesrep_id",type:"BIGINT",size:19,nullable:true,computed:false,is_editable:true}],parents:[{name:"customer",parent_table:"customer",parent_columns:["name"],child_columns:["customer_name"]},{name:"salesrep",parent_table:"employee",parent_columns:["employee_id"],child_columns:["salesrep_id"]}],children:[{name:"purchaseorder_auditList",child_table:"purchaseorder_audit",child_columns:["order_number"],parent_columns:["order_number"]},{name:"lineitemList",child_table:"lineitem",child_columns:["order_number"],parent_columns:["order_number"]}],keys:[{name:"PRIMARY",type:"primary",columns:"order_number"}]},{"@metadata":{href:"http://localhost:8080/KahunaService/rest/abl/demo/v1/@tables/purchaseorder_audit"},name:"purchaseorder_audit",primaryKey:{columns:[{name:"audit_number",type:"BIGINT",size:19,computed:false,is_editable:true}]},columns:[{name:"audit_number",type:"BIGINT",size:19,nullable:false,computed:false,is_editable:true},{name:"order_number",type:"BIGINT",size:19,nullable:true,computed:false,is_editable:true},{name:"amount_total",type:"DECIMAL",size:19,nullable:true,computed:false,is_editable:true},{name:"paid",type:"BOOLEAN",size:3,nullable:true,computed:false,is_editable:true},{name:"item_count",type:"INTEGER",size:10,nullable:true,computed:false,is_editable:true},{name:"notes",type:"VARCHAR",size:1e3,nullable:true,computed:false,is_editable:true},{name:"customer_name",type:"VARCHAR",size:30,nullable:false,computed:false,is_editable:true}],parents:[{name:"purchaseorder_audit",parent_table:"purchaseorder",parent_columns:["order_number"],child_columns:["order_number"]}],keys:[{name:"PRIMARY",type:"primary",columns:"audit_number"}]}]);
		});
	});
	
	describe( 'getAllTables()' , function(){
		it( 'should return a promise to the @tables request' , function(){
			var schema;
			$httpBackend.expectGET( espresso.projectUrl + '@tables/*' );
			Tables.getAllTables().success(function(data){
				schema = data;
			});
			$httpBackend.flush();
			expect( schema ).toEqual( jasmine.any( Array ) );
		});
		
		it( 'should return a cached promise' , function(){
			var promise = Tables.getAllTables();
			Tables.schema.foo = 'bar';
			var cachedPromise = Tables.getAllTables();

			expect( cachedPromise === Tables.schema ).toBe( true );
			expect( cachedPromise.foo ).toBe( 'bar' );
			$httpBackend.flush();
		});
		
		it( 'should format the raw return of an @tables request' , function(){
			Tables.getAllTables().success(function(){
				expect( $rootScope.allTables.customer.columnsByName ).toBeDefined();
				expect( $rootScope.allTables.customer.parentsByName ).toBeDefined();
				expect( $rootScope.allTables.customer.childrenByName ).toBeDefined();
				expect( $rootScope.allTables.customer.originalColumns ).toBeDefined();
			});
			$httpBackend.flush();
		});
		
		it( 'should populate $rootScope.allTables' , function(){
			expect( $rootScope.allTables ).toBeUndefined();
			Tables.getAllTables().success(function(){
				expect( $rootScope.allTables ).toBeDefined();
			});
			$httpBackend.flush();
		});
	});
	
	describe( 'getPrimaryKey()' , function(){
		it( 'should return a primary key object' , function(){
			Tables.getAllTables();
			$httpBackend.flush();
			var primaryKey = Tables.getPrimaryKey( 'customer' );
			expect( primaryKey.columns ).toBe( 'name' );
		});
	});
	
	describe( 'getTableSettings()' , function(){
		it( 'should retrieve a specially formatted settings object ' , function(){
			Tables.getAllTables();
			$httpBackend.flush();
			var table = Tables.getTableSettings( 'customer' );
			expect( table.alias ).toBeDefined();
			expect( table.columnFormats ).toBeDefined();
			expect( table.gridColumns ).toBeDefined();
			expect( table.scalarColumns ).toBeDefined();
			expect( table.parentSettings ).toBeDefined();
			expect( table.childrenSettings ).toBeDefined();
		});
		
		it( 'should table settings object when none exists ' , function(){
			Tables.getAllTables();
			$httpBackend.flush();
			Tables.tableSettings = {};
			var table = Tables.getTableSettings( 'customer' );
			expect( table.alias ).toBeDefined();
			expect( table.columnFormats ).toBeDefined();
			expect( table.gridColumns ).toBeDefined();
			expect( table.scalarColumns ).toBeDefined();
			expect( table.parentSettings ).toBeDefined();
			expect( table.childrenSettings ).toBeDefined();
		});
	});
	
	describe( 'saveTableSettings()' , function(){
		it( 'should update a local storage value' , function(){
			Tables.getAllTables();
			$httpBackend.flush();
			var initial = _.clone( Tables.getTableSettings( 'customer' ) );
			var table = Tables.getTableSettings( 'customer' );
			table.alias = 'Customers';
			var updated = _.clone( table );
			
			//initial and updated are different
			expect( table ).not.toEqual( initial );
			//local variable and service settings are the same
			expect( table ).toEqual( Tables.getTableSettings( 'customer' ) );
			
			Tables.saveTableSettings( 'customer' );
			tableAfterSave = Tables.getTableSettings( 'customer' );
			
			expect( tableAfterSave ).not.toEqual( initial );
			expect( tableAfterSave ).toEqual( updated );
			
			//teardown
			table = Tables.getTableSettings( 'customer' );
			table.alias = 'customer';
			Tables.saveTableSettings( 'customer' );
		});
	});

	describe( 'createDefaultTableSettings()' , function(){
		it( 'should return at least 3 grid columns' , function(){
			Tables.getAllTables();
			$httpBackend.flush();
			//empty any local gridColumns settings (or any other table settings for that matter)
			Tables.tableSettings = {};
			
			var table = Tables.getTableSettings( 'customer' );
			expect( _.values( table.gridColumns ).length ).toBe( 3 );
		});
		
		it( 'should setup parent relationships' , function(){
			Tables.getAllTables();
			$httpBackend.flush();
			//empty any local parentSettings settings (or any other table settings for that matter)
			Tables.tableSettings = {};
			
			var table = Tables.getTableSettings( 'lineitem' );
			expect( _.values( table.parentSettings ).length ).toBe( 2 );
		});
		
		it( 'should setup child relationships' , function(){
			Tables.getAllTables();
			$httpBackend.flush();
			//empty any local childrenSettings settings (or any other table settings for that matter)
			Tables.tableSettings = {};
			
			var table = Tables.getTableSettings( 'employee' );
			expect( _.values( table.childrenSettings ).length ).toBe( 2 );
		});
	});

	describe( 'initializeColumnSettings()' , function(){
		it( 'should populate a table column object with default values' , function(){
			var col = { name : 'column_name' , type : 'DECIMAL' , is_editable : false };
			var initialized = Tables.initializeColumnSettings( col );
			expect( col ).not.toEqual( initialized );
			expect( initialized.alias ).toEqual( 'Column Name' );
		});
	});
	
	describe( 'isEditable()' , function(){
		it( 'should return a boolean' , function(){
			Tables.getAllTables();
			$httpBackend.flush();

			var editable = Tables.isEditable( 'customer' , 'name' );
			expect( editable ).toBe( true );
			
			var uneditable = Tables.isEditable( 'customer' , 'balance' );
			expect( uneditable ).toBe( false );
		});
	});
});