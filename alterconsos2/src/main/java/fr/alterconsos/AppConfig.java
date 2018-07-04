package fr.alterconsos;

import java.util.Properties;

import javax.mail.Message;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Hashtable;
import java.util.Locale;
import java.util.TimeZone;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.json.simple.AcJSONObject;

import fr.alterconsos.cell.CalendrierGAP;
import fr.alterconsos.cell.Catalogue;
import fr.alterconsos.cell.Calendrier;
import fr.alterconsos.cell.GAC;
import fr.alterconsos.cell.GAP;
import fr.alterconsos.cell.GAPC;
import fr.alterconsos.cell.Hebdos2;
import fr.alterconsos.cell.ImportCmd;
import fr.alterconsos.cell.LivrG;
import fr.alterconsos.cell.Mail2;
import fr.alterconsos.cell.Stats;
import fr.alterconsos.cell.StatsMail;
import fr.alterconsos.cell.Synthese;
import fr.alterconsos.cell.TaskArchive;
import fr.alterconsos.cell.TaskMail;
import fr.alterconsos.cell.TaskPurge;
import fr.alterconsos.cell.TraceMail;
import fr.alterconsos.cell.LivrC;
import fr.alterconsos.cell.LivrP;
import fr.alterconsos.cell.Tweets;
import fr.hypertable.AppException;
import fr.hypertable.CellDescr;
import fr.alterconsos.cell.Directory;
import fr.alterconsos.cell.ExportCheques;
import fr.hypertable.AS;
import fr.hypertable.B64ToUrl;
import fr.hypertable.HTServlet;
import fr.hypertable.IAppConfig;
import fr.hypertable.IAuthChecker;
import fr.hypertable.IProvider;
import fr.hypertable.MF;
import fr.hypertable.Operation;
import fr.hypertable.Task;
import fr.hypertable.Versions;

public class AppConfig implements IAppConfig {
	public static final Logger log = Logger.getLogger("alterconsos");

	public static final int[] gacV2 = {2, 10};

	private static int maintenant = 0;
	
	private static String url;
	
	private static int shift = 0;

	private static long maintenantL = 0;

	private static String mailserver;
	
	private static String pwdmailer;
	
	public static final boolean VERBOSE = true;

	public static final TimeZone timezone = TimeZone.getTimeZone("Europe/Paris");

	private static String build = "0";

	public static final CellDescr[] cellTypes = { Versions.cellDescr, Directory.cellDescr,
			Calendrier.cellDescr, CalendrierGAP.cellDescr, GAP.cellDescr, GAC.cellDescr,
			Tweets.cellDescr, Catalogue.cellDescr, LivrC.cellDescr, LivrP.cellDescr, LivrG.cellDescr,
			TraceMail.cellDescr, StatsMail.cellDescr, TaskMail.cellDescr, Hebdos2.cellDescr, Stats.cellDescr};

	private static final String[] args = { "Iad", "Iat", "Iag", "au", "ap", "op", "Id", "cle", "Igr", "Inj", "param" };

	private static final int maxRetries = 2;

	private static final Hashtable<String, Class<?>> operations = new Hashtable<String, Class<?>>();

	private static final Hashtable<String, Class<?>> tasks = new Hashtable<String, Class<?>>();
	
	private static final SimpleDateFormat sdf1 = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS",
			Locale.FRANCE);
	private static final SimpleDateFormat sdfj = new SimpleDateFormat("yyMMdd", Locale.FRANCE);
	private static final SimpleDateFormat sdfjh = new SimpleDateFormat("yyMMddHH", Locale.FRANCE);
	private static final SimpleDateFormat sdfjhs = new SimpleDateFormat("yyMMdd-HHmmss", Locale.FRANCE);

	public static final SimpleDateFormat sdfjhsm = new SimpleDateFormat("yyMMdd-HHmmss-SSS", Locale.FRANCE);

	private static final SimpleDateFormat sdfd = new SimpleDateFormat("EEEE d MMMM yyyy", Locale.FRANCE);

	private static String[] emailfilter;
	
	private static String[] adminMails;
	
	private static String adminSender;
	
	private static String adminKey;
	
	private static int maxConnections;
	
	private static String dbURL;

	private static String username;

	private static String password;

	private static Date d2000;
	
	static {
		sdf1.setTimeZone(timezone);
		sdfj.setTimeZone(timezone);
		sdfjh.setTimeZone(timezone);
		sdfjhs.setTimeZone(timezone);
		sdfjhsm.setTimeZone(timezone);
		sdfd.setTimeZone(timezone);
		
		try {
			d2000 = sdfj.parse("000101");
		} catch (ParseException e) {}
		operations.put("70", Directory.Op.class); // createDir
		operations.put("71", Directory.Op.class); // activateDir
		operations.put("72", Directory.Op.class); // desactivateDir
		operations.put("73", Directory.Op.class); // resetDirPwd
		operations.put("75", Directory.Op.class); // setDirPwd 
		operations.put("76", Directory.Op.class); // updateDir
		operations.put("77", Directory.Op.class); // createGrp
		operations.put("78", Directory.Op.class); // removeGrp 
		operations.put("79", Directory.Op.class); // reactivateGrp
		operations.put("80", Directory.Op.class); // importGrp
		operations.put("81", Directory.Op.class); // updateMail
		operations.put("82", Directory.Op.class); // resetGrpPwd
		operations.put("85", Directory.Op.class); // updatePwds 
		operations.put("86", Directory.Op.class); // search e-mails;

		operations.put("90", B64ToUrl.class);

		operations.put("10", GAPC.StorePhoto.class); // création / remplacement d'une photo

		operations.put("11", Catalogue.Op.class); // set d'une entrée de catalogue
		operations.put("13", Catalogue.Op.class); // annulation entréee catalogue
		operations.put("14", Catalogue.Op.class); // réactivation entréee catalogue

		operations.put("20", GAC.Op.class); // presence
		operations.put("21", GAPC.Op.class); // nouveau contact
		operations.put("22", GAPC.Op.class); // mise à jour d'un contact
		operations.put("23", GAPC.Op.class); // desactivation d'un contact
		operations.put("24", GAPC.Op.class); // activation d'un contact
		operations.put("25", GAPC.Op.class); // nouvelle clé d'un contact

		operations.put("26", CalendrierGAP.Op.class); // modification du calendrier
		operations.put("27", CalendrierGAP.Op.class); // inactivation d'une livraison
		operations.put("28", CalendrierGAP.Op.class); // activation d'une livraison
		operations.put("30", CalendrierGAP.Op2.class); // nouvelle livraison

		operations.put("31", Tweets.Op.class); // création / suppression d'un tweet
		operations.put("32", CalendrierGAP.Op2.class); // recopie prix dans une livraison

		operations.put("40", LivrC.Op.class); // total remise cheques par producteur
		operations.put("41", LivrC.Op.class); // commande / distribution
		operations.put("42", LivrC.Op.class); // expedition / reception
		operations.put("43", LivrC.Op.class); // paiement au producteur
		operations.put("44", LivrC.Op.class); // regul Ap
		operations.put("45", LivrC.Op.class); // lprix
		operations.put("46", LivrC.Op.class); // lprix manquants !!! never USED !!!
		operations.put("47", LivrC.Op.class); // raz distr / dechargt
		operations.put("48", LivrC.Op.class); // paiement au producteur : cheque / suppl
		operations.put("49", LivrC.Op.class); // paiement pour / par

		operations.put("50", Synthese.class); // synthese mail
		operations.put("52", GAPC.OpNoMail.class); // désabonnement envoi mails
		operations.put("53", Catalogue.OpGapExport.class); // export catalogue GAP excel
		operations.put("54", Catalogue.OpGacExport.class); // export commande GAC / AC excel
		operations.put("58", Catalogue.OpGacDistrib.class); // export commande GAC / all ACs excel
		operations.put("55", Mail2.class); // demande envoi de mail au serveur mailer
		operations.put("56", ImportCmd.class); // import XLS (base 64)
		operations.put("bdc", ImportCmd.class); // import XLS (binaire)
		operations.put("57", GAPC.OpNoUnClic.class); // désabonnement un clic
		operations.put("59", GAPC.OpGapcExport.class); // export contacts excel

		operations.put("60", CalendrierGAP.Op.class); // set repartition camion

		operations.put("61", Stats.OpStatsExport.class); // export stats excel
		operations.put("62", ExportCheques.class); // export liste cheques

		// tasks.put("Toto", Toto.class);
		tasks.put("ResyncLivrG", LivrG.ResyncLivrG.class);
		tasks.put("Hebdos2", Hebdos2.class);
		tasks.put("TaskMail", TaskMail.class);
		tasks.put("TaskArchive", TaskArchive.class);
		tasks.put("TaskPurge", TaskPurge.class);
	}
	
	public static String dhString(Date d){
		if (d == null)
			d = new Date();
		return sdf1.format(d);
	}
	
	public boolean isAdmin(String key){
		if (key == null || key.length() == 0) return false;
		return AS.toSHA1(key).equals(adminKey);
	}

	public String myUrl() {
		return url;
	}

	public String getEMails(String lst){
		if (lst == null || lst.length() == 0)
			return "";
		StringBuffer sb = new StringBuffer();
		String[] mails = lst.split("\\s|,|;");
		boolean first = true;;
		for(String s : mails){
			String s1 = s.trim();
			if (s1 != null && s1.length() != 0 && s1.indexOf('@') != -1) {
				boolean discard = false;
				if (emailfilter.length != 0) {
					discard = true;
					for(String f : emailfilter)
						if (s1.endsWith(f))
							discard = false;
					}
				if (discard)
					continue;
				if (!first)
					sb.append(",");
				else
					first = false;
				sb.append(s1);
			}
		}
		return sb.toString();
	}
	
	private Class<?> providerClass = null;
	private boolean providerHasCache = false;
	
	private int providerWorkers = 0;
	@Override public int providerWorkers() { return providerWorkers; }
		
	@Override public IProvider newProvider() {
		try {
			IProvider p = (IProvider) providerClass.newInstance();
			p.init(providerHasCache);
			return p;
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			return null;
		}
	}

	@Override public int getMondayOf(int aammjj, int nbWeeks){
		int nbs = AS.nbs(aammjj);
		return AS.aammjj(nbs + nbWeeks, 1);
	}

	@Override public int getDayOfWeek(){
		return getDayOfWeek(aujourdhui());
	}

	@Override public int getDayOfWeek(int d){
		return AS.js(d);
	}

	@Override public int aujourdhui() {
		if (maintenant != 0) return maintenant / 100;
		return Integer.valueOf(sdfj().format(new Date()));
	}
	
	@Override public Date newDate(){
		if (maintenant != 0) {
			shift++;
			return new Date(maintenantL + (shift * 1000));
		}
		return new Date();
	}
	
	@Override public int maintenant() {
		if (maintenant != 0) return maintenant;
		return Integer.valueOf(sdfjh.format(new Date()));
	}

	@Override public int maintenantSimul() {
		return maintenant;
	}

	@Override public String mailserver() {
		return mailserver;
	}

	@Override public int maxConnections() {
		return maxConnections;
	}
	
	@Override public String dbURL() {
		return dbURL;
	}

	@Override public String username() {
		return username;
	}

	@Override public String password() {
		return password;
	}

	private static Session session = null;
	private static String mailUsername;
	private static String mailPassword;
	private static String mailFrom;
	
	private void loadMailProps(){
		byte[] b = HTServlet.mailProperties();
		if (b == null) return;
		Properties props = new Properties();
		try {
			props.load(new ByteArrayInputStream(b));
			mailUsername = props.getProperty("username");
			mailPassword = props.getProperty("password");
			mailFrom = props.getProperty("from");
			session = Session.getDefaultInstance(props, new javax.mail.Authenticator() {
				protected PasswordAuthentication getPasswordAuthentication() {
					return new PasswordAuthentication(mailUsername, mailPassword);
				}
			  });
		} catch (IOException e) {
			log.log(Level.SEVERE, "Load mail.properties en échec", e);
		}
	}
	
	@Override public void reloadConfig(AcJSONObject arg){
		try {
			maintenant = arg.getI("maintenant", 0);
			if (maintenant != 0) try {
				maintenantL = sdfjh.parse("" + maintenant).getTime();
			} catch (ParseException e) { }
			build = arg.getS("build", "0");
			url = arg.getS("url", "");
			mailserver = arg.getS("mailserver", "0");
			if (mailserver.startsWith("javamail"))
				loadMailProps();
			adminSender = arg.getS("adminSender", "");
			pwdmailer = arg.getS("pwdmailer", "");
			adminKey = arg.getS("adminKey", "");
			String x = arg.getS("emailfilter", null);
			emailfilter = x == null ? new String[0] : x.split(" ");
			adminMails = arg.getS("adminMails", "").split(" ");
			maxConnections = arg.getI("maxConnections", 100);
			dbURL = arg.getS("dbURL", "");			
			username = arg.getS("username", "");			
			password = arg.getS("password", "");			
			x = arg.getS("providerClass", "");
			providerClass = Class.forName(x);
			providerHasCache = arg.getB("providerHasCache");
			providerWorkers = arg.getI("providerWorkers", 1);
			Class<?>[] args = {IAppConfig.class};
			Object[] args2 = {this};
			providerClass.getDeclaredMethod("startup", args).invoke(null, args2);
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	@Override public Date aammjj2Date(int aammjj) {
		try {
			if (aammjj < 120101 || aammjj > 991231) return d2000;
			return sdfj.parse("" + aammjj);
		} catch (ParseException e) {
			return d2000;
		}
	}

	@Override public Logger log() {
		return log;
	}

	@Override public String build() {
		return build;
	}

	@Override public int maxRetries() {
		return maxRetries;
	}

	@Override public SimpleDateFormat sdf1() {
		return sdf1;
	}

	@Override public SimpleDateFormat sdfj() {
		return sdfj;
	}

	@Override public SimpleDateFormat sdfjhs() {
		return sdfjhs;
	}

	@Override public SimpleDateFormat sdfjhsm() {
		return sdfjhsm;
	}

	@Override public SimpleDateFormat sdfd() {
		return sdfd;
	}

	@Override public String[] requestArgs() {
		return args;
	}

	@Override public TimeZone timezone() {
		return timezone;
	}

	@Override public Operation operation(String name) throws AppException {
		Class<?> c = operations.get(name);
		if (c == null) throw new AppException(MF.OP, name);
		try {
			return (Operation) c.newInstance();
		} catch (InstantiationException e) {
			throw new AppException(e, MF.OPX, name);
		} catch (IllegalAccessException e) {
			throw new AppException(e, MF.OPX, name);
		}
	}

	@Override public Task task(String name) throws AppException {
		Class<?> c = tasks.get(name);
		if (c == null) throw new AppException(MF.OP, name);
		try {
			return (Task) c.newInstance();
		} catch (InstantiationException e) {
			throw new AppException(e, MF.OPX, name);
		} catch (IllegalAccessException e) {
			throw new AppException(e, MF.OPX, name);
		}
	}

	@Override public IAuthChecker authChecker() {
		return new AuthVerif();
	}

	@Override public String pingMail(String errMsg) throws MailServerException {
		return postMail(null, null, null, null, null, errMsg);
	}

	@Override public String parseEmails(String m){
		if (m == null || m.length() == 0)
			return null;
		
		String[] x = m.split("\\s|,|;");
		StringBuffer sb = new StringBuffer();
		boolean pf = true;
		for(String s : x){
			s.trim();
			if (s.indexOf(" ") != -1 || s.length() == 0)
				continue;
			if (!pf)
				sb.append(',');
			pf = false;
			sb.append(s);
		}
		return pf ? null : sb.toString();
	}
	
	@Override public String postMail(String mailer, String url, String to, 
			String subject, String text, String errMsg) 
			throws MailServerException {
		boolean ping = url == null;
		String base = mailserver();
		if (base.startsWith("simu")) {
			try { Thread.sleep(1000);} catch (InterruptedException e) {}
			if (ping)
				log.info("Send mail : [PING]");
			else {
				String txt = text != null ? text.substring(0,1500) : "";
				String mx = "Send mail : [" + (mailer != null ? mailer : "?") 
					+ "] to:[" + (to != null ? to : "?")
					+ "] subject:[" + (subject != null ? subject : "?") 
					+ "] text:" + (text != null ? text.length() : "0") + "c"
					+ "\n" + txt;
				log.warning(mx);
			}
			return "OK: envoi simulé";
			// return "Simulation d'erreur " + new Date().toGMTString();
		}
		if (base.startsWith("http")) {
			try {
				byte[] body = null;
				if (!ping) {
					String tox = parseEmails(to);
					if (tox == null){
						return "KO : adresse(s) e-mail mal formattée(s) [" + to + "]";
					}
					StringBuffer sb = new StringBuffer();
					sb.append("mailer=");
					sb.append(URLEncoder.encode(mailer, "UTF-8"));
					sb.append("&to=");
					sb.append(URLEncoder.encode(tox, "UTF-8"));
					sb.append("&subject=");
					sb.append(URLEncoder.encode((emailfilter.length != 0 ? "[TEST ENVOI MAILS] - " : "")
							+ subject, "UTF-8"));
					sb.append("&text=");
					sb.append(URLEncoder.encode(text, "UTF-8"));
					sb.append("&cle=");
					sb.append(URLEncoder.encode(pwdmailer, "UTF-8"));
					body = sb.toString().getBytes("UTF-8");
				}
				// String u = base + (ping ? "/ping" : url);
				String u = base; // + "/server.php";
				int retry = 0;
				while (true) {
					HttpURLConnection connection = (HttpURLConnection) new URL(u).openConnection();
					connection.setReadTimeout(120*1000);
					if (ping)
						connection.setRequestMethod("GET");
					else {
						connection.setDoOutput(true);
						connection.setRequestMethod("POST");
						connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded"); 
						connection.setRequestProperty("charset", "utf-8");
						connection.setRequestProperty("Content-Length", "" + Integer.toString(body.length));
						connection.setUseCaches (false);
						OutputStream os = connection.getOutputStream();
						os.write(body);
						os.close();
					}
					
				    int status = connection.getResponseCode();
				    if (status == 200) {
						byte[] res = bytesFromStream(connection.getInputStream());
						String ret = new String(res, "UTF-8");
						if (ret.startsWith("KO : Could not instantiate mail function")){
							retry++;
							if (retry < 6) {
								try { Thread.sleep(10000);} catch (InterruptedException e) {}
							} else 
								return ret;
						} else {
							return ret;
						}
				    } else {
				    	String ret = "HTTP status [" + status + "] - Réponse du site de Mail : ";
					    try {
					    	InputStream response;
						    response = connection.getErrorStream();
						    if (response == null)
						    	response = connection.getInputStream();
						    if (response != null) {
								byte[] res = bytesFromStream(response);
								ret += new String(res, "UTF-8");
						    } else
						    	ret += "illisible";
					    } catch(Exception e) {
					    	ret += "illisible : " + e.getMessage();
					    }
						retry++;
						if (retry < 6) {
							try { Thread.sleep(10000);} catch (InterruptedException e) {}
						} else 
							return ret;					    
				    }
				}
			} catch (Exception e){
				String msg = (errMsg != null ? errMsg + "\n" : "") + e.toString();
				mailToAdmin(msg);
				throw new MailServerException(msg);
			}
		} else if (base.startsWith("javamail")){
			mailTo(mailer, to, subject, text);
		} else {
			String msg = "URL d'accès temporairement volontairement NON configurée";
			mailToAdmin(msg);
			throw new MailServerException(msg);
		}
		return "";
	}	

	private byte[] bytesFromStream(InputStream is) throws IOException{
		byte[] buf = new byte[4096];
		ByteArrayOutputStream os2 = new ByteArrayOutputStream(16192);
		int l = 0;
		while ((l = is.read(buf)) > 0)
			os2.write(buf, 0, l);
		is.close();
		byte[] res = os2.toByteArray();
		os2.close();
		return res;
	}
	
	public class MailServerException extends Exception {
		private static final long serialVersionUID = 1L;
		public MailServerException(String msg){
			super("Erreur d'accès au serveur d'envoi de mail. Contacter l'administration de l'application.\n" + msg);
		}
	}
	
	private static void mailTo(String mailer, String to, String subject, String text) {
		if (to == null || to.length() == 0 || subject == null || subject.length() == 0)
			return;
		try {
		    Message msg = new MimeMessage(session);
		    msg.setFrom(new InternetAddress(mailFrom, "[Alterconsos " + mailer + "]"));
		    String[] x = to.split(",");
		    if (x.length == 0)
		    	return;
		    for (String s : x) {
		    	String s2 = s.trim();
		    	if (s2.length() != 0)
		    		msg.addRecipient(Message.RecipientType.TO, new InternetAddress(s2));
		    }
		    msg.setSubject(subject);
		    if (text == null) text = "";
		    if (text.startsWith("<!DOCTYPE html>"))
		    	msg.setContent(text, "text/html; charset=utf-8");
		    else
		    	msg.setText(text == null ? "" : text);
		    Transport.send(msg);
		} catch (Exception e) {
		    log.log(Level.SEVERE, "Echec d'envoi de mail- to:[" + to 
		    	+ "] subject:[" + subject + "]", e);
		} 
	}

	public static void mailToAdmin(String msgBody) {
		log.log(Level.SEVERE, "Envoi de mail a l'administateur : " + msgBody);
		if ("".equals(adminSender))
			return;
		boolean jm = HTServlet.appCfg.mailserver().startsWith("javamail");
		Properties props = new Properties();
		Session session = jm ? AppConfig.session : Session.getDefaultInstance(props, null);
		try {
		    Message msg = new MimeMessage(session);
		    String from = jm ? AppConfig.mailFrom : adminSender;
		    msg.setFrom(new InternetAddress(from, "Administrateur App Alterconsos"));
		    for (String s : adminMails) {
		    	String s2 = s.trim();
		    	if (s2.length() != 0)
		    		msg.addRecipient(Message.RecipientType.TO, new InternetAddress(s2));
		    }
		    msg.setSubject("Alerte d'administration de l'application Alterconsos");
		    msg.setText(msgBody);
		    Transport.send(msg);
		} catch (Exception e) {
		    log.log(Level.SEVERE, "Echec d'envoi de mail a l'administateur : ", e);
		} 
	}
		
	public static void main(String[] args) {
		try {
		} catch (Throwable t) {
			t.printStackTrace();
		}
	}

}
