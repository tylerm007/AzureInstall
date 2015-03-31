# AzureInstall
Windows Azure Installation WAR

To use this WAR on your Azure - you can simply fork it to your own Git repository and link it to a Web app - it will automatically synchronize and deploy the WAR to D:\home\site\wwwrppt\webapps.

You must setup a blank database (MySQL or SQL Server) and create a connection string named AdminDB.


##MySQL Database
set environment variable: MYSQLCONNSTR_AdminDB
```
Database=local_admin;Data Source=localhost;User Id=local_admin;Password=password
```
##SQL Server on Azure
set environment variable: SQLCONNSTR_AdminDB
```
Database=local_admin;Data Source=azure.database.windows.net;User Id=userName;Password=passowrd
```

##ORACLECONNSTR_AdminDB
not availalable at this time

##JNDI 
-MYSQL add to: 
(%CATALINA_HOME%/conf/server.xml)
```
 <Context docBase="\EspressoService" path="/EspressoService" reloadable="true">
            <Resource accessToUnderlyingConnectionAllowed="true" 
		      auth="Container" 
		      defaultAutoCommit="false" 
		      driverClassName="com.mysql.jdbc.Driver" 
		      initialSize="5" 
		      logAbandoned="true" 
		      maxActive="20" 
		      maxIdle="10" 
		      maxWait="30000" 
		      minIdle="5" 
		      name="jdbc/AdminDB" 
		      password="password" 
		      removeAbandoned="true" 
		      removeAbandonedTimeout="30" 
		      type="javax.sql.DataSource" 
		      url="jdbc:mysql://localhost:3306/local_admin" 
		      username="local_admin" 
		      validationQuery="select 1"/>
            </Context>
```
##SQL Server (same as <resource above> ) except:
		driverClassName="com.microsoft.sqlserver.jdbc.Driver" 
		url="jdbc:sqlserver://localhost:1433/local_admin" 
		
doc: https://sites.google.com/a/espressologic.com/site/docs/appliance/azureinstallation
