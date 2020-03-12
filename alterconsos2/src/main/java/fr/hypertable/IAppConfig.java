package fr.hypertable;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.TimeZone;
import java.util.logging.Logger;

import org.json.simple.AcJSONObject;

import fr.alterconsos.AppConfig.MailServerException;

public interface IAppConfig {
	public Logger log();

	public IProvider newProvider();

	public String build();

	public String myUrl();
	
	public boolean isAdmin(String key);
	
	public String dhReelle();
	
	public SimpleDateFormat sdf1();

	public SimpleDateFormat sdfj();

	public SimpleDateFormat sdfjhs();

	public SimpleDateFormat sdfd();

	public SimpleDateFormat sdfjhsm();
		
	public String[] requestArgs();

	public TimeZone timezone();

	public int maxRetries();

	public int maildelai();

	public Operation operation(String name) throws AppException;

	public Task task(String name) throws AppException;

	public IAuthChecker authChecker();

	public Date aammjj2Date(int aammjj);

	public int getMondayOf(int aammjj, int nbWeeks);
	
	public Date newDate();
	
	public int aujourdhui();

	public int getDayOfWeek();
	
	public int getDayOfWeek(int d);

	public int maintenant();

	public int maintenantSimul();
	
	public String mailserver();

	public String url4mail();

	public String[] contacts();

	public void reloadConfig(AcJSONObject arg);
		
	public String getEMails(String lst);
	
	public String parseEmails(String email);
	
	public String pingMail(String errMsg) throws MailServerException;
	
	public String postMail(String mailer, String url, String to, String subject, 
			String text, String errMsg) throws MailServerException;
	
	public int maxConnections();
	
	public String dbURL();
	
	public String username();
	
	public String password();

	public int providerWorkers();
	
}
