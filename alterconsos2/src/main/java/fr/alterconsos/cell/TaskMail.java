package fr.alterconsos.cell;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.logging.Level;

import fr.alterconsos.AppConfig;
import fr.alterconsos.AppConfig.MailServerException;
import fr.alterconsos.cell.GAPC.GContact;
import fr.alterconsos.cell.TraceMail.Trace;
import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.ArrayInt;
import fr.hypertable.CellDescr;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.HTServlet;
import fr.hypertable.IAppConfig;
import fr.hypertable.IAuthChecker;
import fr.hypertable.IW;
import fr.hypertable.Task;

public class TaskMail extends Task {
	public static final CellDescr cellDescr = new CellDescr(TaskMail.class);

	public CellDescr cellDescr() {
		return cellDescr;
	}

	public TaskMail() {}

	public String getName() {
		return "TaskMail";
	}

	private ArrayList<IW> outArgs = new ArrayList<IW>();

	public byte[] getArgs() {
		try {
			return cellDescr.serialize(outArgs);
		} catch (AppException e) {
			return new byte[0];
		}
	}
	
	public void todo(String lot, String subject, String text, 
			Collection<Integer> grps, Collection<Integer> grpsAnim, int retry) {
		TodoList l = new TodoList();
		l.lot = lot;
		l.subject = subject;
		l.text = text;
		l.grps.addAll(grps);
		l.retry = retry;
		if (grpsAnim != null)
			l.grpsAnim.addAll(grpsAnim);
		outArgs.add(l);
	}
	
	public void endTodo(){
		int dir = AppTransaction.tr().authChecker.getAuthDir();
		enQueue(dir);
	}

	public void finLot(AppTransaction tr, String exMsg) throws AppException {
		tr.startPhaseForte("D", false);
		StatsMail sm = StatsMail.get(ad);
		if (exMsg == null)
			sm.ok(at,  ag, lot, cpts);
		else
			sm.ko(at,  ag, lot, exMsg);
		if (cpts != null) {
			int x = cpts.get(4);
			if (x != 0) {
				AppConfig.mailToAdmin((at == 1 ? "Groupe " : "Groupement ") + ag 
						+ "  lot:" + lot + "  rejet(s) du mailer:" + x);
			}
		}
		tr.endPhase(true);
	}

	String line;
	String subject;
	String text;
	String lot;
	int at;
	int ag;
	int ad;
	ArrayInt cpts;
	boolean forAnim;
	Ctc[] contacts;
	
	public void start(byte[] args, String[] uri) throws AppException {
		AppTransaction tr = AppTransaction.tr();
		IAuthChecker ac = tr.authChecker;
		ad = ac.getAuthDir();
		List<IW> inArgs = cellDescr.read(this, args);
		
		TodoList l = (TodoList) inArgs.get(0);
		int grp = l.grps.getZ(0);
		forAnim = false;
		for(int g : l.grpsAnim)
			if (g == grp)
				forAnim = true;
		at = grp < 0 ? 2 : 1;
		ag = grp < 0 ? -grp : grp;
		line = (at == 1 ? "C." : "P.") + ag + ".";
		subject = l.subject;
		text = l.text;
		lot = l.lot;
		
		HTServlet.appCfg.log().log(Level.WARNING, "task Mail start - Lot: " + lot + " [" + HTServlet.appCfg.myUrl() + "] Grp :" + grp);

		try {
			String msg = doSend(tr);
			finLot(tr, msg);
			l.grps.remove(0);
			if (l.grps.size() == 0)
				return;
			else
				startTask(tr, l, 0);
		} catch (Throwable t){
			processEx(tr, l, t, grp);
			if (l.retry < 3)
				startTask(tr, l, l.retry + 1);
			else
				return;
		}
	}

	private void startTask(AppTransaction tr, TodoList l, int retry){
		try {
			tr.startPhaseForte("D", false);
			TaskMail tm = new TaskMail();
			if (retry != 0){
				int n = retry > 3 ? 3 : retry;
				try { Thread.sleep(n * 60000);} catch (InterruptedException e) {}
			}
			tm.todo(l.lot, l.subject, l.text, l.grps, l.grpsAnim, retry);
			tm.endTodo();
			tr.endPhase(true);
		} catch (AppException e) {
		}
	}
	
	private void processEx(AppTransaction tr, TodoList l, Throwable t, int grp){
		String stack = AS.stackTrace(t);
		String msg = "Task Mail exception - Lot: " + lot + " [" + HTServlet.appCfg.myUrl() + "] Grp:" 
				+ grp + "; Retry:" + l.retry + "; " + AppConfig.dhString(null);
		try {
			tr.endPhase(true);
			String s = t.getClass().getName();
			finLot(tr, "Retry #" + l.retry + " - Exception : " + s);
		} catch (AppException e) {
		}
		StringBuffer sb = new StringBuffer();
		sb.append(msg);
		sb.append("---------------------------\n");
		sb.append(stack);
		sb.append("---------------------------\n");
		AppConfig.mailToAdmin(sb.toString());
	}
	
	private class Ctc {
		Ctc() {}
		int code;
		String initiales;
		String emails;
		boolean nomail;
		boolean resilie;
	}
	
	private String doSend(AppTransaction tr) throws MailServerException, AppException {
		String mailer = null;
		tr.startPhaseFaible();
		IAppConfig cfg = HTServlet.appCfg;
		String gx = (at == 1 ? "Groupe " : "Groupement ") + ag;
		// DirectoryG.Entry e = tr.myDir().entry(at, ag);
		Directory.Entry e = Directory.entryG(at, ag);
		if (e == null) {
			tr.endPhase(true);
			return "Annuaire inconnu pour [" + gx + "]";
		}
		String initg = e.initiales();
		mailer = e.mailer();
		if (e.dirmail() != ad) {
			tr.endPhase(true);
			return "Annuaire non gestionnaire du mailing pour [" + gx + "]";
		}
		if (mailer == null || mailer.equals("Z")) {
			tr.endPhase(true);
			return "Mailing non configuré pour [" + gx + "]";
		}
		GAPC gapc = at == 1 ? GAC.get(ag) : GAP.get(ag);
		GContact[] lst;
		if (forAnim){
			lst = new GContact[1];
			lst[0] = gapc.contact(1);
		} else
			lst = gapc.allContactsSauf1();
		
		contacts = new Ctc[lst.length];
		for(int i = 0; i < lst.length; i++){
			GContact g = lst[i];
			Ctc c = new Ctc();
			c.code = g.code;
			c.initiales = g.initiales();
			c.emails = cfg.getEMails(g.email1());
			c.nomail = g.nomail() == 1;
			c.resilie = g.suppr() != 0;
			contacts[i] = c;
		}
		tr.endPhase(true);
		
		tr.startPhaseForte("D", false);
		StatsMail sm = StatsMail.get(ad);
		sm.start(at,  ag, lot);
		tr.endPhase(true);
		
		boolean purHebdo = subject == null && text == null;
		GContact c1 = gapc.contact(1);
		int dateLot = 999999;
		try { dateLot = Integer.parseInt(lot.substring(0,6)); } catch (Exception ex){}
		boolean obs = c1 != null && dateLot > c1.bienvenueJ();
		if (subject == null)
			subject = !obs && c1.bienvenueS() != null ? c1.bienvenueS() : "Synthèse hebdomadaire alterconsos";
		if (text == null)
			text = !obs && c1.bienvenueT() != null ? c1.bienvenueT() : null;
		int maildelai = HTServlet.appCfg.maildelai();
			
		for(Ctc c : contacts) {
			String sub = subject + " - [" + lot + " " + initg + (c.code != 0 ? ("/" + c.initiales + "]") :  "]");
			int usr = c.code;
			String initiales = c.initiales;
			String emails = c.emails;
			if (c.resilie || (c.nomail && purHebdo)) {
				tr.startPhaseForte(line, false);
				TraceMail tm = TraceMail.get(at, ag);
				tm.setTrace(usr, initiales, lot, 1, "résilié ou ne reçoit pas de synthèse hebdo", emails, 0);
				cpts = tm.getCpts(lot);
				tr.endPhase(true);
				continue;
			}
			if (emails.length() == 0) {
				tr.endPhase(true);
				tr.startPhaseForte(line, false);
				TraceMail tm = TraceMail.get(at, ag);
				tm.setTrace(usr, initiales, lot, 2, "adresse(s) e-mail non valide ou absente", emails, 0);
				cpts = tm.getCpts(lot);
				tr.endPhase(true);
				continue;
			}
			
			Synthese2 synth = new Synthese2(at, ag, usr, lot);
			String t = synth.noLivr() ? "" : synth.getSynthese(sub, text, purHebdo, false);
			int taille = t.length();
			
			if (taille == 0) {
				tr.endPhase(true);
				tr.startPhaseForte(line, false);
				TraceMail tm = TraceMail.get(at, ag);
				tm.setTrace(usr, initiales, lot, 3, "ni commandes récentes / en cours, ni information à diffuser", emails, 0);
				cpts = tm.getCpts(lot);
				tr.endPhase(true);
				continue;				
			}
			
			tr.endPhase(true);
			tr.startPhaseForte(line, false);
			TraceMail tm = TraceMail.get(at, ag);
			Trace tra = tm.getTrace(c.code);
			if (tra != null && tra.lot().equals(lot) && tra.status == 0) {
				cpts = tm.getCpts(lot);
				tr.endPhase(true);
				continue;				
			}

			if (maildelai != 0)
				try { Thread.sleep(maildelai * 1000);} catch (InterruptedException ex) {}
			String resp = cfg.postMail(mailer, "/send", emails, sub, t, null);
			if (resp.startsWith("OK"))
				tm.setTrace(usr, initiales, lot, 0, resp, emails, taille);
			else {
				if (resp.length() > 1024)
					resp = resp.substring(0, 1024);
				String dh = HTServlet.appCfg.dhReelle();
				tm.setTrace(usr, initiales, lot, 4, dh + " - " + AS.escapeHTML(resp), emails, taille);
				HTServlet.appCfg.log().log(Level.WARNING, "task Mail ERROR SEND - Lot: " + lot + " [" +
						HTServlet.appCfg.myUrl() + "] Grp:" + gx + " usr:" + c.code + " RESP:" + dh + " - " + resp);
			}
			cpts = tm.getCpts(lot);
			tr.endPhase(true);
			continue;
		}
		return null;
	}

//	private String putError(String line, int usr, String msg) throws AppException{
//		byte[] html = null;
//		try {
//			html = msg.getBytes("UTF-8");
//		} catch (UnsupportedEncodingException e) {}
//		Archive archive = new Archive(line, "" + usr + ".", "HTML", "text/html", html, 0);
//		archive.putArchiveInStorage();
//		return "/alterconsos/mime/" + line + "/" + usr + "./HTML/" + lot;
//	}
	
	@HTCN(id = 1) public class TodoList implements IW {
		public long version = 0;
		public void w() {}
		@HT(id = 1) public String lot;
		@HT(id = 2) public String subject;
		@HT(id = 3) public String text;
		@HT(id = 4) public ArrayInt grps = new ArrayInt();
		@HT(id = 5) public ArrayInt grpsAnim = new ArrayInt();
		@HT(id = 6) public int retry;
	}

}
