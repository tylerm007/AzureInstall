<%@ page language="java"
  isErrorPage="true"
  session="false"
  import="com.kahuna.server.error.ExceptionFormatter"
%><%
	response.setHeader("Access-Control-Allow-Origin", "*");
	HttpServletRequest req = (HttpServletRequest)pageContext.getRequest();
	String json = ExceptionFormatter.formatKahunaException(exception);
	System.err.println("Sending error back to client:" + json);
	out.print(json);
	out.flush();
%>