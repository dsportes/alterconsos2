package fr.alterconsos.cell;

import fr.alterconsos.AppConfig.MailServerException;
import fr.alterconsos.cell.GAPC.GContact;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.ArrayInt;
import fr.hypertable.HTServlet;
import fr.hypertable.IAppConfig;
import fr.hypertable.IAuthChecker;
import fr.hypertable.Operation;
import fr.hypertable.AppTransaction.StatusPhase;

public class Mail2 extends Operation {

	@Override public String mainLine() {
		return line;
	}
	
	//int ad;
	int at;
	int ag;
	int usr;
	String lot;
	String resp;
	String emails;
	int taille;
	String initiales;
	String text;
	String subject;
	String line;
	String initg;
	String sub;
	String defSub;
	
	private StatusPhase complete(String msg){
		resultat.content = msg;
		resultat.mime = "text/plain";
		resultat.encoding = "UTF-8";
		resultat.brut = true;
		return StatusPhase.brut;						
	}
	
	@Override public StatusPhase phaseFaible() throws AppException {
		IAppConfig cfg = HTServlet.appCfg;
		AppTransaction tr = AppTransaction.tr();
		IAuthChecker ac = tr.authChecker;
		// ad = ac.getAuthDir();
		at = ac.getAuthType();
		ag = ac.getAuthGrp();
		line = (at == 1 ? "C." : "P.") + ag + ".";
		Directory.Entry e = Directory.entryG(at, ag);
		// DirectoryG.Entry e = tr.myDir().entry(at, ag);
		if (e == null)
			return complete("KO : La configuration du mailing n'autorise pas l'envoi de mail (e?)");			
		if (e.dirmail() == 0)
			return complete("KO : La configuration du mailing n'autorise pas l'envoi de mail (dirmail = 0)");
		String mailer = e.mailer();
		if (mailer == null || mailer.equals("Z"))
			return complete("KO : La configuration du mailing n'autorise pas l'envoi de mail (mailer Z)");
		initg = e.initiales();
		defSub = "Envoi exceptionnel du " + (at == 1 ? "groupe" : "groupement");
		try {
			cfg.pingMail(defSub + " lot:" + lot);
		} catch (MailServerException ex) {
			return complete(ex.getMessage());
		}

		usr = arg().getI("usr", 0);
		text = arg().getS("text", null);
		subject = arg().getS("subject", null);
		lot = cfg.sdfjhs().format(cfg.newDate());
		
		GAPC gapc = at == 1 ? GAC.get(ag) : GAP.get(ag);
		if (gapc.isEmpty())
			return complete((at == 2 ? "Groupement " : "Groupe ") + ag + " inconnu");
		if (usr != 0) {
			GContact c = gapc.contact(usr);
			if (c == null)
				return complete((at == 2 ? "Producteur " : "Alterconso ") + usr + " inconnu");
			initiales = c.initiales();
			emails = cfg.getEMails(c.email1());
			if (emails.length() == 0)
				return complete((at == 2 ? "Producteur" : "Alterconso") + " sans adresse e-mail valide");
			Synthese2 synth = new Synthese2(at, ag, usr, lot);
			sub = (subject != null ? subject : defSub)
				+ " - [" + lot + " " + initg + (c.code != 0 ? ("/" + c.initiales() + "]") :  "]");
			String t = synth.getSynthese(sub, text, false, false);
			taille = t.length();
			try {
				resp = cfg.postMail(mailer, "/send", emails, sub, t,
						"Envoi exceptionnel. " + (at == 1 ? "Groupe:" : "Groupement:") + ag
						+ " lot:" + lot + " contact:" + c.initiales());
			} catch (MailServerException ex) {
				return complete(ex.getMessage());
			}
			if (resp.startsWith("OK"))
				return StatusPhase.transactionSimple;
			return complete("KO : Erreur retournée par le serveur de mail : " + resp);
		} else {
			return StatusPhase.transactionSimple;
		}
	}
	
	@Override public void phaseForte() throws AppException {
		if (usr != 0) {
			TraceMail tm = TraceMail.get(at, ag);
			tm.setTrace(usr, initiales, lot, 0, resp, emails, taille);
			resultat.content = "Message posté à " + emails + ". " + taille + " caractères. Lot : " + lot +
					". Avis du serveur d'envoi : " + resp;
			resultat.mime = "text/plain";
			resultat.encoding = "UTF-8";
			resultat.brut = true;
		} else {
			TaskMail tm = new TaskMail();
			ArrayInt grps = new ArrayInt();
			grps.add(at == 1 ? ag : -ag);
			sub = (subject != null ? subject : defSub);
			tm.todo(lot, sub, text, grps, null, 0);
			tm.endTodo();
		}
	}

}
