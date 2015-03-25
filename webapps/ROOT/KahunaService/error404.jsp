<%@ page
 language="java"
 contentType="application/json; charset=ISO-8859-1"
 pageEncoding="ISO-8859-1"
 isErrorPage="true"
 session="false"
 import="com.kahuna.server.util.JsonUtil, com.kahuna.server.text.LogicMessageFormatter"
%><%
	response.setHeader("Access-Control-Allow-Origin", "*");
	HttpServletRequest req = (HttpServletRequest)pageContext.getRequest();
	String uri = pageContext.getErrorData().getRequestURI();
	if (uri != null) {
		uri = JsonUtil.encodeString(uri);
		uri = req.getScheme() + "://" + req.getServerName() + ":" + req.getServerPort() + uri;
	}
	String msg = LogicMessageFormatter.getMessage(4040, uri);
%>{
	"statusCode": 404,
	"errorCode": 4040,
	"errorMessage": "<%= msg %>",
	"helpUrl": "@BASE_HELP_URL@/errors/error4040"
}
