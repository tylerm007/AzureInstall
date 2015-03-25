<%@ page language="java"
    contentType="text/html; charset=ISO-8859-1"
    pageEncoding="ISO-8859-1"
    session="false"
  %>
<%
  String host = request.getServerName();
  String port = "" + request.getLocalPort();
  String scheme = request.getScheme();
  String clientProto = request.getHeader("X-Forwarded-Proto");
  if (clientProto != null) {
    scheme = clientProto;
  }
  String clientPort = request.getHeader("X-Forwarded-Port");
  if (null != clientPort) {
    port = clientPort;  
  }
  if ("https".equals(scheme) && "443".equals(port)) {
    port = "";
  }
  else if ("http".equals(scheme) && "80".equals(port)) {
    port = "";
  }
  else {
    port = ":" + port;
  }
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1">
<title>Espresso Logic Server</title>
<style>
body {
  font: 11pt "Helvetica Light",Helvetica,Arial,sans-serif;
  font-weight: lighter;
  background-color: #FFFFFF;
  padding: 10px;
  }

li {
  margin: 5px;
}
</style>
</head>
<body>
<br />
<img style="margin-bottom: 20px;" src="logo_1.png">
<br />
This is an Espresso Logic Server.
<br />
It is not normally accessed in this manner. You may have intended to reach it:
<br />
<ul>
  <li>via the Logic Designer<br>The URL would end in
    /LogicDesigner. This is the tool that developers and administrators
    use to manage and edit the rules.<br>This link MAY be enabled:
    <a href="<%= scheme %>://<%= host %><%= port %>/LogicDesigner">/LogicDesigner</a>
  </li>
  <li>via the Live Browser Designer<br>This is the tool used to navigate, search and edit data.<br>
    This link MAY be enabled:
    <a href="<%= scheme %>://<%= host %><%= port %>/LiveBrowser">/LiveBrowser</a>
  </li>
  <li>as a REST/JSON server for one of your applications. The URL
    is then typically along the lines of<br> <code>
    .../rest/&lt;account&gt;/&lt;project&gt;/&lt;apiversion&gt;/&lt;resource&gt;/...</code><br> The
    documentation can be found <a
    href="http://docs.espressologic.com/docs/rest-apis/urls">here.</a>
    </li>
</ul>
<br />
If you have any questions or would like more information about
Espresso Logic, please see the <a href="http://www.espressologic.com">Espresso Logic website</a>
</body>
</html>
