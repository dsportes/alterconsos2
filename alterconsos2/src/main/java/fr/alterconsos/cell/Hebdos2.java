package fr.alterconsos.cell;


import java.text.ParseException;
import java.util.Date;
import java.util.logging.Level;

import fr.alterconsos.AppConfig.MailServerException;
import fr.alterconsos.cell.Directory;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.ArrayInt;
import fr.hypertable.Cell.CellNode;
import fr.hypertable.AS;
import fr.hypertable.CellDescr;
import fr.hypertable.HTServlet;
import fr.hypertable.IAppConfig;
import fr.hypertable.Task;

public class Hebdos2 extends Task {
	public static final CellDescr cellDescr = new CellDescr(Hebdos2.class);
	public CellDescr cellDescr() { return cellDescr; }
	
	public Hebdos2(){}
		
	@Override public String getName() {
		return "Hebdos2";
	}

	@Override public byte[] getArgs() {
		return null;
	}
	
	int ad;
	String lot;
	int jour;
	boolean reprise;
	ArrayInt grps = new ArrayInt();
	ArrayInt grpsAnim = new ArrayInt();

	public void start(byte[] args, String[] uri)  throws AppException {
		// cron : args == null
		AppTransaction tr = AppTransaction.tr();
		IAppConfig cfg = HTServlet.appCfg;
		cfg.log().log(Level.WARNING, "cron Hebdos : ");
		ad = tr.authChecker.getAuthDir();
		
		String myUrl = HTServlet.appCfg.myUrl();
//		if (myUrl.endsWith(":8080"))
//			return;
		if (uri.length >= 3) {
			lot = uri[2];
			reprise = true;
			try {
				Date d = cfg.sdfjhs().parse(lot);
				jour = AS.js(Integer.valueOf(cfg.sdfj().format(d)));
			} catch (ParseException e) {
				jour = HTServlet.appCfg.getDayOfWeek();
			}
		} else {
			lot = cfg.sdfjhs().format(cfg.newDate());
			reprise = false;
			jour = HTServlet.appCfg.getDayOfWeek();
		}
		// jour = 3; // pour tester
		
		cfg.log().log(Level.WARNING, "cron Hebdos2 : " + lot + " [" + myUrl + "]");
		
		StatsMail sm = StatsMail.get(ad);
		Directory dir = tr.myDir();
		for(CellNode cn : dir.nodesByKey("C.")) {
			boolean jmoins1 = false;
			Directory.Entry e = (Directory.Entry)cn;
			if ((e.type() != 1 && e.type() != 2) || e.suppr() != 0 )
				continue;
			if (dir.code() != e.dirmail())
				continue;
			String mailer = e.mailer();
			if (mailer == null || "Z".equals(mailer))
				continue;
			int jm = e.jourmail();
			if (jm != jour ) {
				if ((jm == 1 && jour == 7) || jour == jm - 1)
					jmoins1 = true;
				else
					continue;
			}
			int at = e.type();
			int ag = e.code();
			StatsMail.Stat stat = sm.get(at,  ag);
			if (stat != null && lot.equals(stat.lot) && stat.status == 0)
				continue;
			grps.add(at == 1 ? ag : -ag);
			if (jmoins1)
				grpsAnim.add(at == 1 ? ag : -ag);
		}
		tr.endPhase(true);
		
		if (grps.size() == 0)
			return;
		
		try {
			cfg.log().log(Level.WARNING, "cron Hebdos2 ping : " + lot + " [" + HTServlet.appCfg.myUrl() + "]");
			cfg.pingMail("/cron/Hebdos2/" + ad + "/" + lot + (reprise ? "   -reprise" : ""));
			tr.startPhaseForte("D", false);
			TaskMail tm = new TaskMail();
			tm.todo(lot, null, null, grps, grpsAnim, 0);
			tm.endTodo();
			tr.endPhase(true);
		} catch (MailServerException ex){
		}
		
	}
	
}
