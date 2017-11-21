package fr.hypertable;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UnsupportedEncodingException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.TimeZone;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.fileupload.FileItemIterator;
import org.apache.commons.fileupload.FileItemStream;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.json.simple.AcJSON;
import org.json.simple.AcJSONObject;

public class HTServlet extends HttpServlet {
	public static final Logger log = Logger.getLogger("fr.hypertable");
	public static IAppConfig appCfg;
	static boolean onoff = false;
	private static final String msg1 = "<context-param>AppConfig absent or not instantiable";
	private static final long serialVersionUID = 1L;

	private static HashMap<String, String> mimes = new HashMap<String, String>();
	private static HashMap<String, String> extensions = new HashMap<String, String>();
	private static TimeZone gmt = TimeZone.getTimeZone("GMT");
	public static SimpleDateFormat sdfGMT = new SimpleDateFormat("EEE, d MMM yyyy HH:mm:ss z",
			Locale.US);

	private static final HashMap<String, String> importTitles = new HashMap<String, String>();
	
	static {
		mimes.put("xls", "application/vnd.ms-excel");
		extensions.put("application/vnd.ms-excel", "xls");
		mimes.put("jpg", "image/jpeg");
		extensions.put("image/jpeg", "jpg");
		mimes.put("gif", "image/gif");
		extensions.put("image/gif", "gif");
		mimes.put("png", "image/png");
		extensions.put("image/png", "png");
		mimes.put("html", "text/html");
		extensions.put("text/html", "html");

		importTitles.put("bdc", "Alterconsos - Fichier \"bon de commande\" .xls à importer :");
		
		sdfGMT.setTimeZone(gmt);
	}

	public static String extOfMime(String mime) {
		return extensions.get(mime);
	}

	public static String mimeOfExt(String ext) {
		return mimes.get(ext);
	}

	private static byte[] defaultImage;

	private static byte[] appHtml;

	public static byte[] defaultImage() {
		return defaultImage;
	}

	private static byte[] mailProperties;

	public static byte[] mailProperties() {
		return mailProperties;
	}

	public static byte[] defaultExcel;
	private static String templateSH = "";
	public static String templateSH() { return templateSH; }

	private static String contextPath = null;
	
	@Override public void init(ServletConfig config) throws ServletException {
		if (contextPath != null) return; // déjà initialisé
		ServletConfig servletConfig = config;
		ServletContext ctx = servletConfig.getServletContext();
		contextPath = ctx.getContextPath();
		AcJSONObject arg = null;

		try {
			templateSH = new String(getResource(ctx, "/WEB-INF/templateSH.html"), "UTF-8");
			mailProperties = getResource(ctx, "/WEB-INF/mail.properties");
			defaultImage = getResource(ctx, "/images/default-64x64.jpg");
			defaultExcel = getResource(ctx, "/WEB-INF/default.xls");
			appHtml = getResource(ctx, "/WEB-INF/app.html");
			arg = AcJSON.parseObjectEx(new String(getResource(ctx, "/WEB-INF/ac.json"), "ISO-8859-1"));
		} catch (Exception e) { 
			log.log(Level.SEVERE, e.getMessage());
			throw new ServletException(e);			
		}

		try {
			Class<?> c = Class.forName(arg.getS("configClass",""));
			appCfg = (IAppConfig) c.newInstance();
			appCfg.reloadConfig(arg);
		} catch (Exception e) {
			throw new ServletException(msg1);
		}
		IProvider provider = appCfg.newProvider();
		onoff = provider.getOnOff();
		provider.close();
	}

	@Override public void destroy() {
		IProvider provider = appCfg.newProvider();
		try {
			provider.tmOperation("tmstop", null, null, null);
		} catch (AppException e) {	}
		provider.close();
	}
	
	private byte[] getResource(ServletContext ctx, String name) {
		try {
			InputStream is = ctx.getResourceAsStream(name);
			if (is == null)
				return null;
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			byte[] buf = new byte[4096];
			int l = 0;
			while ((l = is.read(buf)) > 0)
				bos.write(buf, 0, l);
			return bos.toByteArray();
		} catch (IOException e) {
			return null;
		}
	}

	private static final int pfxl = "document/".length();

	private static final String html1 = "<!DOCTYPE html><html><head><title>Alterconsos</title>\n"
			+ "<meta http-equiv='cache-control' content='no-cache'>\n"
			+ "<meta http-equiv='pragma' content='no-cache'>\n"
			+ "<meta http-equiv='Expires' content='0'>\n"
			+ "<meta http-equiv='Content-Type' content='text/html; charset=utf-8'>\n"
			+ "<base href=\"";
	private static final String html1b = "/\">\n<script type='text/javascript'>ACSRV = {};\n"
			+ "ACSRV.localStartTime = new Date().getTime();\n";
	
	private String p(HttpServletRequest req, String[] args, String code){
		for(String s : args){
			if (s.startsWith(code))
				return s.substring(1);
		}
		return req.getParameter(code);
	}
	
	public String appScript(HttpServletRequest req, String qs){
		String[] args = qs != null ? qs.split("\\.") : new String[0];
		
		String s = p(req, args, "a");
		int a = 0;
		try { a = s != null ? Integer.parseInt(s) : 0 ;} catch (Exception e){};
		s = p(req, args, "r");
		int r = 0;
		try { r = s != null ? Integer.parseInt(s) : 0 ;} catch (Exception e){};
		s = p(req, args, "g");
		int g = 0;
		try { g = s != null ? Integer.parseInt(s) : 0 ;} catch (Exception e){};
		s = p(req, args, "d");
		int d = 0;
		try { d = s != null ? Integer.parseInt(s) : 0 ;} catch (Exception e){};
		String u = p(req, args, "u");
		String c = p(req, args, "c");
		StringBuffer sb = new StringBuffer();
		// sb.append("ACSRV.serverStartTime = " + new Date().getTime() + ";\n");
		sb.append("ACSRV.simul = "	+ appCfg.maintenantSimul() + ";\n");
		sb.append("ACSRV.url = \""	+ appCfg.myUrl() + "\";\n");
		sb.append("ACSRV.build=\"" + appCfg.build() + "\";\n");
		if (a != 0)
			sb.append("ACSRVa=" + a + ";\n");
		if (r != 0)
			sb.append("ACSRVr=" + r + ";\n");
		if (g != 0)
			sb.append("ACSRVg=" + g + ";\n");
		if (u != null)
			sb.append("ACSRVu=\"" + u + "\";\n");
		if (c != null)
			sb.append("ACSRVc=\"" + c + "\";\n");
		if (d != 0)
			sb.append("ACSRVd=" + d + ";\n");
		sb.append("</script>\n");
		return sb.toString();
	}
		
	private static final String htmlImport1 = "<!DOCTYPE html>\n<html>\n<head>\n<title>Import Alterconsos</title>\n"
			+ "<meta http-equiv='cache-control' content='no-cache'>\n"
			+ "<meta http-equiv='pragma' content='no-cache'>\n"
			+ "<meta http-equiv='Expires' content='0'>\n"
			+ "<meta http-equiv='Content-Type' content='text/html; charset=utf-8'>\n"
			+ "</head>\n<body>\n"
			+ "<h3>";
	
	private static final String htmlImport2 = "</h3>\n<form name='input' enctype='multipart/form-data' action='";
	
	private static final String htmlImport3 = "' method='post'>\n"
			+ "<input type='file' name='";
	
	private static final String htmlImport4 = "'></input>";

	private static final String htmlImport5 = "<br>Mot de passe : <input name='ap' type='text'></input>";

	private static final String htmlImport6 = "<br><br><input type='submit' value='Importer'>\n</form>\n</body>\n</html>";

	public void page(HttpServletRequest req, HttpServletResponse resp)
			throws IOException {
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		bos.write(html1.getBytes("UTF-8"));
		bos.write(contextPath.getBytes("UTF-8"));
		bos.write(html1b.getBytes("UTF-8"));
		String x = appScript(req, req.getQueryString());
		bos.write(x.getBytes("UTF-8"));
		bos.write(appHtml);
		resp.setContentType("text/html");
		OutputStream os2 = resp.getOutputStream();
		os2.write(bos.toByteArray());
		bos.close();
	}

	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		String x = req.getRequestURI();
		String uri = x.substring(contextPath.length());
		if (!uri.startsWith("/"))
			uri = "/" + uri;
		if ("/".equals(uri))
			uri = "/app";

		if (uri.startsWith("/alterconsos/ping")) {
			appCfg.log().log(Level.WARNING, "Ping : [" + appCfg.myUrl() + "]");
			ping(req.getQueryString(), resp);
			return;
		}

		if (!onoff && !uri.startsWith("/admin")) {
			resp.setContentType("text/plain");
			resp.setCharacterEncoding("UTF-8");
			String r = "$3-Serveur en maintenance";
			resp.getOutputStream().write(r.getBytes("UTF-8"));
			return;
		}

		/* Pour tester l'envoi de mails
		if (uri.startsWith("/alterconsos/testmail")) {
			String d = appCfg.sdfjhs().format(new Date());
			String msg = "Essai de mail : IGNORER " + d;
			AppConfig.mailToAdmin("Essai de mail : IGNORER " + d) ;
			try {
				appCfg.postMail("B", "/send", "daniel@sportes.fr", msg, "bla bla");
			} catch (MailServerException e) {
			}
			return;
		}
		*/

		if (uri.equals("/app") || uri.startsWith("/ac/app")) {
			page(req, resp);
			return;
		}

		if (uri.startsWith("/document/")) {
			loadDoc(uri, resp);
			return;
		}

		if (uri.startsWith("/alterconsos/mime/")) {
			AcJSONObject arg = new AcJSONObject();
			String[] args = uri.split("/");
			if (args.length > 3) arg.put("l", args[3]);
			if (args.length > 4) arg.put("c", args[4]);
			if (args.length > 5) arg.put("t", args[5]);
			if (args.length > 6) arg.put("opt", args[6]);
			String s = AcJSON.JSON2String(arg);
			doIt(uri, req, resp, s, null);
			return;
		}

		if (uri.startsWith("/cron/")) {
			doCron(uri, req, resp);
			return;
		}

		if (uri.startsWith("/import/")) {
			getImport(uri, resp);
			return;
		}

		// requis pour obtenir les désabonnement op=52 et 57 qui passent par un GET
		doIt(uri, req, resp, getArg2(req), null);

	}

	protected void getImport(String uri, HttpServletResponse resp) throws IOException {
		try {
			if (!uri.endsWith(".html")) throw new Exception("URL d'import non terminée par .html: " + uri);
			String url = uri.substring(0, uri.length() - 5);
			int i = url.lastIndexOf('/');
			if (i == -1) throw new Exception("URL d'import mal formée: " + uri);
			String xx = url.substring(0, i);
			boolean noPwd = xx.endsWith("/0");
			String name = url.substring(i + 1);
			String s = importTitles.get(name);
			if (s == null) throw new Exception("URL d'import mal formée, type d'import inconnu: " + uri);
			resp.setContentType("text/html");
			resp.setCharacterEncoding("UTF-8");
			StringBuffer sb = new StringBuffer();
			sb.append(htmlImport1);
			sb.append(s);
			sb.append(htmlImport2);
			sb.append(appCfg.myUrl() + url);
			sb.append(htmlImport3);
			sb.append(name);
			sb.append(htmlImport4);
			if (noPwd)
				sb.append(htmlImport5);
			sb.append(htmlImport6);
			resp.getOutputStream().write(sb.toString().getBytes("UTF-8"));
		} catch (Throwable t) {
			log.log(Level.SEVERE, "Erreur trappée par le servlet", t);
			resp.sendError(500);
		}
	}
	
	private class Couple {
		String args = "";
		byte[] file = null;
	}

	private void errDoc(HttpServletResponse resp, String m) throws UnsupportedEncodingException, IOException{
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("UTF-8");
		resp.getWriter().print(m);
	}
	
	private void loadDoc(String uri, HttpServletResponse resp) throws IOException {
		IProvider provider = null;
		try {
			int i = uri.indexOf("document/");
			if (i == pfxl) {
				errDoc(resp, "Nom de document mal formé : " + uri);
				return;
			}
			String key = uri.substring(i + pfxl);
			i = key.indexOf(".");
			if (i == -1 || i > key.length() + 2) {
				errDoc(resp, "Nom de document mal formé : " + uri);
				return;
			}
			String ext = key.substring(i + 1);
			String mime = mimes.get(ext);
			if (mime == null) {
				errDoc(resp, "Nom de document mal formé : " + uri);
				return;
			}
			provider = appCfg.newProvider();
			byte[] bytes = provider.getDocument(key);
			provider.close();
			if (bytes == null) {
				errDoc(resp, "Document n'ayant jamais été généré (ou l'ayant été il y a longtemps) : " + uri);
				return;
			}
			resp.setContentType(mime);
			OutputStream os2 = resp.getOutputStream();
			os2.write(bytes);
		} catch (Throwable t) {
			if (provider != null)
				provider.close();
			log.log(Level.SEVERE, "Erreur trappée par le servlet", t);
			resp.sendError(500);
		}
	}

	private void ping(String s, HttpServletResponse resp) throws IOException {
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("UTF-8");
		int m = appCfg.maintenantSimul();
		String r = "{\"time\":"  + new Date().getTime() + ", \"build\":" + appCfg.build() + 
				", \"simul\":" + m + ", \"echo\":\""+ (s != null ? s : "") + "\"}";
		resp.getOutputStream().write(r.getBytes("UTF-8"));
	}

	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		String x = req.getRequestURI(); // ac/app
		String uri = x.substring(contextPath.length());
		if (!uri.startsWith("/"))
			uri = "/" + uri;
		String args = null;

		if (uri.equals("/alterconsos/ping")) {
			byte[] body = getArg1(req);
			String s = new String(body, "UTF-8");
			ping(s, resp);
			return;
		}
		if (uri.equals("/app") || uri.startsWith("/ac/app")) {
			page(req, resp);
			return;
		}
//		if (!onoff && !uri.startsWith("/dumpload") && !uri.startsWith("/admin")) {
		if (!onoff && !uri.startsWith("/admin")) {
			resp.setContentType("text/plain");
			resp.setCharacterEncoding("UTF-8");
			String r = "$3-Serveur en maintenance";
			resp.getOutputStream().write(r.getBytes("UTF-8"));
			return;
		}
		if (uri.startsWith("/task/")) {
			doTask(uri, req, resp);
			return;
		}
		byte[] file = null;
		if (uri.startsWith("/document/")) {
			loadDoc(uri, resp);
			return;
		}
		
		if (uri.startsWith("/import/")) {
			Couple c = getImport(uri, req, resp);
			file = c.file;
			args = c.args;
		} else if (uri.startsWith("/admin")) {
			Couple c = getArg3(req);
			file = c.file;
			args = c.args;
		} else if (uri.startsWith("/alterconsos/export"))
			args = getArg2(req);
		else {
			args = new String(getArg1(req), "UTF-8");
		}
			
		doIt(uri, req, resp, args, file);
	}

	private static final long oneYear = 365L * 86400000L;

	protected void doIt(String uri, HttpServletRequest req, HttpServletResponse resp, String args, byte[] file)
			throws IOException {
		AppTransaction t = null;
		try {
//			if (uri.equals("/admin") || uri.equals("/dumpload")) {
			if (uri.equals("/admin")) {
				t = new AppTransactionAdmin(args, file);
			} else {
				t = new AppTransaction(args, file);
			}

			if (t.getStatus() == 0) {
				resp.setStatus(200);
				AppTransaction.Resultat resultat = t.getResultat();
				if (!resultat.brut) {
					resp.setContentType("application/json");
					resp.setCharacterEncoding("UTF-8");
					String r = resultat.toString();
					// log.log(Level.SEVERE, "POST servlet out : " + r);
					resp.getOutputStream().write(r.getBytes("UTF-8"));
				} else {
					if (uri.startsWith("/alterconsos/mime/")) {
						String v = sdfGMT.format(new Date(resultat.version));
						resp.addHeader("Last-Modified", v);
						Date dx = new Date(new Date().getTime() + oneYear);
						String n = sdfGMT.format(dx);
						resp.addHeader("Expires", n);
						resp.addHeader("Cache-Control", "public");
					}
					resp.setContentType(resultat.mime);
					if (resultat.content != null) {
						String r = resultat.content;
						resp.setCharacterEncoding(resultat.encoding);
						resp.getOutputStream().write(r.getBytes(resultat.encoding));
					} else {
						OutputStream os2 = resp.getOutputStream();
						os2.write(resultat.bytes);
					}
				}
			} else {
				resp.setStatus(202);
				resp.setContentType("text/plain");
				resp.setCharacterEncoding("UTF-8");
				String r = "$" + t.getStatus() + "-" + t.getThrowableInfo();
				resp.getOutputStream().write(r.getBytes("UTF-8"));
			}
			if (t != null) {
				t.release();
				if (t.provider() != null)
					t.provider().close();
			}
		} catch (Throwable tx) {
			if (t != null) {
				t.release();
				if (t.provider() != null)
					t.provider().close();
			}
			log.log(Level.SEVERE, "Erreur trappée par le servlet", tx);
			resp.sendError(500);
		}
	}
	
	public void doCron(String uri, HttpServletRequest req, HttpServletResponse resp) throws IOException {
		AppTransaction t = null;
		try {
			String[] x = uri.substring("/cron/".length()).split("/");
			t = new AppTransaction(x, null, null, true);
			if (t != null && t.provider() != null)
				t.provider().close();
			if (t.getStatus() != 0) 
				resp.sendError(500 + t.getStatus());
		} catch (Throwable tx) {
			if (t != null && t.provider() != null)
				t.provider().close();
			log.log(Level.SEVERE, "Erreur trappée par doCron", tx);
			resp.sendError(500);
		}
	}

	public void doTask(String uri, HttpServletRequest req, HttpServletResponse resp) throws IOException {
		AppTransaction t = null;
		try {
			byte[] args = getArg1(req);
			String[] x = uri.substring("/task/".length()).split("/");
			t = new AppTransaction(x, args, null, false);
			if (t != null && t.provider() != null)
				t.provider().close();
			if (t.getStatus() != 0) 
				resp.sendError(500 + t.getStatus());
		} catch (Throwable tx) {
			if (t != null && t.provider() != null)
				t.provider().close();
			log.log(Level.SEVERE, "Erreur trappée par doTask", tx);
			resp.sendError(500);
		}
	}

	protected byte[] getArg1(HttpServletRequest req) {
		try {
			InputStream is = req.getInputStream();
			byte[] buf = new byte[4096];
			ByteArrayOutputStream os = new ByteArrayOutputStream(16192);
			int l = 0;
			while ((l = is.read(buf)) > 0)
				os.write(buf, 0, l);
			os.close();
			is.close();
			return os.toByteArray();
		} catch (IOException e) {
			return new byte[0];
		}
	}

	protected String getArg2(HttpServletRequest req) throws IOException {
		String[] args = appCfg.requestArgs();
		AcJSONObject arg = new AcJSONObject();
		for (String s : args) {
			boolean isInt = false;
			if (s.startsWith("I")) {
				isInt = true;
				s = s.substring(1);
			}
			String v = req.getParameter(s);
			if (v != null) if (!isInt)
				arg.put(s, v);
			else {
				try {
					arg.put(s, Integer.parseInt(v));
				} catch (Exception e) {}
			}
		}
		String s = AcJSON.JSON2String(arg);
		return s;
	}

	protected String getArg4(String uri) throws IOException {
		AcJSONObject arg = new AcJSONObject();
		String[] args = uri.split("/");
		if (args.length > 3) arg.put("l", args[3]);
		if (args.length > 4) arg.put("c", args[4]);
		if (args.length > 5) arg.put("t", args[5]);
		if (args.length > 6) arg.put("opt", args[6]);
		String s = AcJSON.JSON2String(arg);
		return s;
	}

	protected AcJSONObject getArg5(String uri) throws IOException {
		AcJSONObject arg = new AcJSONObject();
		String[] args = uri.split("/");
		if (args.length > 2) arg.put("ad", Integer.parseInt(args[2]));
		if (args.length > 3) arg.put("at", Integer.parseInt(args[3]));
		if (args.length > 4) arg.put("ag", Integer.parseInt(args[4]));
		if (args.length > 5) arg.put("au", args[5]);
		if (args.length > 6) arg.put("ap", args[6]);
		if (args.length > 7) {
			String s = args[7];
			int i = s.indexOf('.');
			if (i != -1) s = s.substring(0, i);
			arg.put("op", s);
		}
		return arg;
	}

	protected Couple getArg3(HttpServletRequest req) {
		Couple c = new Couple();
		byte[] post = getArg1(req);
		StringBuffer sb = new StringBuffer();
		int start = 1;
		for (byte b : post) {
			if (b == '\n') break;
			start++;
			sb.append((char) b);
		}
		c.file = Arrays.copyOfRange(post, start, post.length);
		c.args = sb.toString();
		return c;
	}

	protected Couple getImport(String uri, HttpServletRequest req, HttpServletResponse res)
			throws IOException {
		Couple c = new Couple();
		AcJSONObject args = getArg5(uri);
		String op = args.getS("op", "");
		ServletFileUpload upload = new ServletFileUpload();
		FileItemIterator iterator;
		try {
			iterator = upload.getItemIterator(req);
			while (iterator.hasNext()) {
				FileItemStream item = iterator.next();
				InputStream stream = item.openStream();
				String fn = item.getFieldName();
				if (fn.equals(op)) {
					args.put("fileName", item.getName());
					int len;
					byte[] buffer = new byte[8192];
					ByteArrayOutputStream bos = new ByteArrayOutputStream();
					while ((len = stream.read(buffer, 0, buffer.length)) != -1)
						bos.write(buffer, 0, len);
					c.file = bos.toByteArray();
					bos.close();
				} else {
					int len;
					byte[] buffer = new byte[8192];
					ByteArrayOutputStream bos = new ByteArrayOutputStream();
					while ((len = stream.read(buffer, 0, buffer.length)) != -1)
						bos.write(buffer, 0, len);
					String s = new String(bos.toByteArray(), "UTF-8");
					bos.close();
					args.put(item.getFieldName(), s);
				}
			}
		} catch (FileUploadException e) {
			c.file = null;
		}
		c.args = AcJSON.JSON2String(args);
		return c;
	}
	
}
