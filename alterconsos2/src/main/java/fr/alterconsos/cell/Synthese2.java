package fr.alterconsos.cell;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import fr.alterconsos.AppConfig;
import fr.alterconsos.cell.Directory.Entry;
import fr.alterconsos.cell.GAPC.GContact;
import fr.alterconsos.cell.Tweets.Tweet;
import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.HTServlet;

public class Synthese2 {
	
	private static void escapeHTML(StringBuffer sb, String s){
		if (s == null || s.length() == 0)
			return;
		else
			sb.append(AS.escapeHTML(s));
	}

	private static String[] htmls = new String[0];
	private static final SimpleDateFormat sdfl = new SimpleDateFormat("EEEE d", Locale.FRANCE);
	private static final SimpleDateFormat sdflc = new SimpleDateFormat("EEEE d MMMM", Locale.FRANCE);
	private static final SimpleDateFormat sdfd2 = new SimpleDateFormat("EEEE d MMMM yyyy à HH:mm", Locale.FRANCE);

	static {
		sdfl.setTimeZone(AppConfig.timezone);
		sdflc.setTimeZone(AppConfig.timezone);
		sdfd2.setTimeZone(AppConfig.timezone);
	}

	private String acapp = "/app?";
	
	private int dir;
	// private Directory[] dirs;
	private int grp;
	private Directory.Entry egrp;
	private int usr;
	private boolean isGrp;
	private GAPC.GContact usrC;
	private GAPC.GContact usr1;
	private boolean unclicC;
	// private GAPC.GContact usr1;
	private String adresse = null;
	private String usrLogin;
	private String usrLoginMP;
	private String usrLoginURL;
	private String usrLabel;
	private String usrInit;
	private int authType;
	private int mode;
	private SimpleDateFormat sdf1;
	private String myUrl;
	private String myAuth;
	private GAPC gapc;
	private String excelName;
	private String subject;
	private String text;
	private boolean purHebdo = false;
	private boolean withTitle = false;
	private String dateDuJour;
	private int dateDuJourI;
	private int lundiSP; // semaine précédente
	private List<Cpt> cpts;
	private boolean forGac = false;
	private boolean noLivr = false;
	private Directory.Entry entry = null;
	
	private int j = 0;

	private static final String[] mois = {"", "janvier", "février", "mars", "avril", "mai", "juin",
		"juillet", "août", "septembre", "octobre", "novembre", "décembre"};
	
	public Synthese2(int authType, int grp, int usr, String lot) throws AppException{
		this.authType = authType;
		this.usr = usr;
		this.grp = grp;
		isGrp = usr <= 1;
		forGac = isGrp && authType == 1;
		mode = authType == 2 ? 1 : (isGrp ? 2 : 3);
		this.dateDuJour = lot.substring(0, 6);
		this.dateDuJourI = Integer.valueOf(this.dateDuJour);;
		cpts = Calendrier.getLivrsEnCours(authType, grp, usr, dateDuJourI, -1, 7);
		noLivr = cpts == null;
		if (noLivr)
			cpts = new ArrayList<Cpt>();
		lundiSP = HTServlet.appCfg.getMondayOf(dateDuJourI, -1);
		sdf1 = HTServlet.appCfg.sdf1();
		// dirs = Directory.myDirs();
		entry = Directory.entryG(this.authType, this.grp);
		//dir = tr.myDir();
		dir = entry != null ? entry.dirmail() : 0;
		myUrl = HTServlet.appCfg.myUrl();
		if (htmls.length == 0)
			htmls = HTServlet.templateSH().split("\\$\\$");
	}

	public boolean noLivr(){
		return noLivr;
	}

	public boolean isEmpty(){
		return cpts.size() == 0 || dir == 0;
	}
	
	private static final String[] jours = {"", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"};
	
	public String getSynthese(String subject, String text, boolean purHebdo, boolean withTitle) throws AppException {
		this.subject = subject;
		this.text = text;
		this.purHebdo = purHebdo;
		this.withTitle = withTitle;
		
		myAuth = "?at=" + authType + "&ad=" + authType + "&ag=" + grp + (!isGrp ? "&au=" + usr : "");
		// egrp = (Entry) dir.entry(authType, grp);
		egrp = Directory.entryG(authType, grp);
		gapc = authType == 2 ? GAP.get(grp) : GAC.get(grp);
		
		usr1 = gapc.contact(1);
		adresse = usr1.localisation();
		
		usrC = gapc.contact(isGrp ? 1 : usr);
		unclicC = usrC.unclic() == 1;
		// a1.r3.g2.u1.c0269567292
		if (!isGrp)
			usrLoginMP = "a" + dir + ".r" + (authType == 1 ? 3 : 5) + ".g" + grp + ".u" + usr;
		else
			usrLoginMP = "a" + dir + ".r" + (authType == 1 ? 4 : 6) + ".g" + grp ;			
		usrLoginURL = dir + "/" + authType + "/" + grp + "/" + usr + "/" + (unclicC ? usrC.ci1() : 0);
		usrLogin = usrLoginMP;
		if (unclicC && usrC.ci1() != 0) {
			usrLogin = usrLoginMP + ".c0" + usrC.ci1();
			myAuth += "&ap=" + usrC.ci1();
		}
		usrLabel = usr == 0 ? egrp.label() : usrC.nom();
		usrInit = usr == 0 ? egrp.initiales() : usrC.initiales();
		excelName = "_" + usrInit + ".xls";
		
		StringBuffer sb = new StringBuffer();
		
		entete(sb);
		
		boolean hasLignes = false;
		// int lastLu = 0;
		int lastd = 0;
		for (Cpt cpt : cpts) {
			Calendrier.Livr l = cpt.l;
			int d = l.date2(mode);
			int lu = HTServlet.appCfg.getMondayOf(d, 0);
			boolean sp = lu == lundiSP;
			int ph = l.phaseActuelle(false, false);
			boolean compta = (mode == 1 && ph >= 3) || (mode > 1 && ph >= 5);
			String c4 = editCpt(cpt, compta);
			
			if (d != lastd) {
			// if (lu != lastLu) {
				if (!hasLignes) {
					sb.append("<table style='font-size:12px;border-style:none;border-collapse:collapse;width:95%;padding:3px'>");
					hasLignes = true;
				}
				sb.append("\n<tr style='vertical-align:top'><td colspan='2' style='padding-top:16px;color:blue;" +
						"text-decoration:underline'><a target='_blank' href='").append(myUrl).append(acapp);
				sb.append(usrLogin).append(".d").append(d).append("'><b><i>");
				int js = HTServlet.appCfg.getDayOfWeek(d);
				int jj = d % 100;
				int mm = (d / 100) % 100;
				sb.append(jours[js] + " ");
				sb.append(jj == 1 ? "1er" : jj).append(" ").append(mois[mm]);
				sb.append(" [Entrée directe]</i></b></a>");
				
				if (mode >= 2) {
					sb.append("<a style='position:relative;padding:0 0 0 20px;margin-left:24px' target='_blank' href='")
					.append(myUrl);
					if (unclicC)
						sb.append("/alterconsos/export/AC_").append(lu).append(excelName).append(myAuth);
					else
						sb.append("/export.html").append(myAuth).append("&sn=").append(usrInit);
					sb.append("&d=").append(d).append("&op=54'");
					sb.append(" target='_blank'>Export total<img src='images/excel16.png' " +
							"style='cursor:pointer;position:relative;top:2px'></img></a>");
					if (isGrp) {
						sb.append("<a style='position:relative;padding:0 0 0 20px;margin-left:24px' target='_blank' href='")
						.append(myUrl);
						if (unclicC)
							sb.append("/alterconsos/export/AC_").append(lu).append(excelName).append(myAuth);
						else
							sb.append("/export.html").append(myAuth).append("&sn=").append(usrInit);
						sb.append("&d=").append(d).append("&op=58'");
						sb.append(" target='_blank'>Export détaillé par AC<img src='images/excel16.png' " +
								"style='cursor:pointer;position:relative;top:2px'></img></a>");
					}
				}

				sb.append("</td><td></td></tr>");
				
				if (authType == 2) {
					try {
						Tweet[] tws = Tweets.get(l.gap()).getTweets(l, 1, 0);
						if (tws.length > 0) {
							sb.append("<td></td><td>");
							editTweets(sb, tws);
							sb.append("</td><td></td>");
						}
					} catch (AppException e1) {
				}
				}
				lastd = d;
				// lastLu = lu;
			}
			
			sb.append(editGrp(l, c4 == null ? "<td></td>" : c4, sp));
		}
		if (hasLignes)
			sb.append("</table>");
		else
			sb.append("<div>Aucune commande non soldée la semaine " +
					"précédente et aucune commande ouverte sur les six prochaines semaines</div>");
		
		enqueue(sb);
		if (!hasLignes && authType == 2 && purHebdo) {
			return "";
		} else {
			String txt = sb.toString();
			txt = txt.replaceAll("src='images", "src='" + myUrl + "/images");
			return txt;
		}
	}
	
	private void next(StringBuffer sb){
		String s;
		while ((s = htmls[j++]) == null){}
		sb.append(s);
	}
	
	private static String[] libs = {"", "Groupement ", "Groupe ", ""};
	
	private void entete(StringBuffer sb) {
		next(sb);
		if (subject != null)
			escapeHTML(sb, subject);
		else
			sb.append("Alterconsos, synthèse hebdomadaire");
		
//		next(sb);
//		sb.append(myUrl);

		next(sb);
		if (withTitle){
			sb.append("<div style='font-size:13px;font-weight:bold'>Sujet : ");
			if (subject != null)
				escapeHTML(sb, subject);
			else
				sb.append("Alterconsos, synthèse hebdomadaire");
			sb.append("<br>&nbsp;</div>");
		}
		
		next(sb);
		String href1 = myUrl + (unclicC ? "/alterconsos/export" : "/synthese.html") + myAuth + "&op=50";
		sb.append(href1).append("'>").append(href1);
		next(sb);
		if (purHebdo)
			sb.append("<br>Synthèse hebdomadaire au ").append(dateDuJour);
		else
			sb.append("<br>Message envoyé sur demande de l'animateur");
		next(sb);
		if (text != null){
			if (text.startsWith("@"))
				sb.append(text.substring(1));
			else
				escapeHTML(sb, text);
		}
		next(sb);
		sb.append(usr == 0 ? libs[mode] : "").append(usrLabel).append(" [")
		.append(usrInit).append("]</span> : <a target='_blank' href='").append(myUrl)
		.append(acapp).append(usrLoginMP)
		.append("'>[Connexion, mot de passe requis]</a>");
		next(sb);
	}
	
	private static final String help1 = "https://sites.google.com/site/alterconsosapp/faq---foire-aux-questions/alterconso-comment-commander";

	private static final String help2 = "https://sites.google.com/site/alterconsosapp/faq---foire-aux-questions/comment-commander-excel";

	private void enqueue(StringBuffer sb) {
		next(sb);
		if (mode >= 2) {
			sb.append("<li>Passer une commande en utilisant l'application Web :	<a href='" + help1 +
					"' target='_blank'>" +
					"<img src='images/info16.png' style='cursor:" +
					"pointer;position:relative;top:4px'></img></a></li>" +
					"<li>Passer une commande en utilisant une feuille Excel : <a href='"
					+ help2 + "' target='_blank'><img src='images/info16.png' " +
					"style='cursor:pointer;position:relative;top:4px'>" +
					"</img></a>	- Lien pour <a target='_blank' href='");
			sb.append(myUrl).append("/import/").append(usrLoginURL)
			.append("/bdc.html'>enregistrer ma feuille remplie</a></li>");
		}
		next(sb);
		sb.append(" href='").append(myUrl).append("/alterconsos/export")
			.append(myAuth).append(unclicC ? "" : "&ap=" + usrC.ci1()).append("&op=52'");
		next(sb);
		if (!isGrp && unclicC) {
			sb.append(" - Lien pour <a target='_blank' href='").append(myUrl).append("/alterconsos/export").append(myAuth)
			.append("&op=57'>désactiver</a>");
		}
		next(sb);
		
		for(GContact c : gapc.aContacter()) {
			sb.append("<li>").append(c.nom()).append(" : ");
			String em = c.email1();
			if (em != null) {
				int ix = em.indexOf("\n");
				if (ix > 0)
					em = em.substring(0, ix);
				if (em.length() != 0) {
					sb.append("<a href='mailto:").append(em).append("'>").append(em).append("</a> - ");
				}
			}
			String tel = c.telephones();
			sb.append(tel == null ? "" : tel).append("</li>");
		}
		next(sb);
	}

	private String editGrp(Calendrier.Livr l, String c4, boolean sp) {
		StringBuffer sb = new StringBuffer();
		sb.append("\n<tr style='vertical-align:top'>");
		
		// Entry e = (Entry) dir.entry(authType == 1 ? 2 : 1, authType == 1 ? l.gap() : l.gac());
		Entry en = (Entry) Directory.entryG(authType == 1 ? 2 : 1, authType == 1 ? l.gap() : l.gac());
		String ex = "#" + (authType == 1 ? l.gap() : l.gac());
		sb.append("<td style='text-align:right;padding-right:16px;width:30%'><b>");
		if (authType == 2)
			sb.append("[").append(en != null ? en.initiales() : ex).append("] ");
		escapeHTML(sb, en != null ? en.label() : ex);
		sb.append("</b></td>");
		
		int limite = l.limite();
		int hlimac = l.hlimac();
		sb.append("<td>");
		if (!sp) {
			sb.append("<span style='color:red'>");
			sb.append(limite < dateDuJourI ? "Close depuis " : "Limite ");
			sb.append(sdflc.format(HTServlet.appCfg.aammjj2Date(limite)));
			int hl = l.hlimite() == 0 ? 24 : l.hlimite();
			int hlac = hl > hlimac ? hl - hlimac : 1;
			switch (mode) {
			case 1: {
				sb.append(" à ").append(hl).append("h");
				break;
			}
			case 2: {
				sb.append(" à ").append(hl).append("h");
				if (hlac != hl)
					sb.append(" (").append(hlac).append("h pour les AC)");
				break;
			}
			case 3: {
				sb.append(" à ").append(hlac).append("h");
				break;
			}
			}
			sb.append("; </span><br>");
		}
		switch (mode) {
		case 1: {
			sb.append("Expédition ").append(sdfl.format(HTServlet.appCfg.aammjj2Date(l.expedition())));
			break;
		}
		case 2: {
			sb.append("Livraison ").append(sdfl.format(HTServlet.appCfg.aammjj2Date(l.livr())));
			if (l.hlivr() != 0) 
				sb.append(" à ").append(l.hlivr()).append("h");
			sb.append("; ");
			String al = l.adresseL();
			if (al == null)
				al = adresse;
			if (al != null) {
				try {
					String s = URLEncoder.encode(al, "UTF-8");
					sb.append("<a href='http://maps.google.com/maps?q=" + s + "' target='_blank'>" + al + "</a>");
				} catch (UnsupportedEncodingException e) {	}
			}
			sb.append("<br>");
		}
		case 3: {
			int ld = l.distrib();
			Date ldd = HTServlet.appCfg.aammjj2Date(ld);
			sb.append("Distribution " + sdfl.format(ldd));
			if (l.hdistrib() != 0) {
				if (l.fdistrib() != 0)
					sb.append(" de ").append(l.hdistrib()).append("h à ").append(l.fdistrib() + "h");
				else 
					sb.append(" à ").append(l.hdistrib()).append("h");
			}
			String ad = l.adresseD();
			if (ad == null)
				ad = adresse;
			if (ad != null) {
				try {
					String s = URLEncoder.encode(ad, "UTF-8");
					sb.append("; <a href='http://maps.google.com/maps?q=" + s + "' target='_blank'>" + ad + "</a>");
				} catch (UnsupportedEncodingException e) {	}
			}
			break;
		}
		}
		try {
			Tweet[] tws;
			if (authType == 2)
				tws = Tweets.get(l.gap()).getTweets(l, 2, l.gac());
			else
				tws = Tweets.get(l.gap()).getTweets(l, 0, 0);
			editTweets(sb, tws);
		} catch (AppException e1) {
		}
		sb.append("</td>");
				
		sb.append(c4).append("</tr>");
		return sb.toString();
	}

	private String editCpt(Cpt cpt, boolean compta) {
		if (!cpt.notzero())
			return "";
		StringBuffer sb = new StringBuffer();
		sb.append("<td style='width:20%'>");
		editCx(sb, cpt.prix, cpt.poids, cpt.nblg, forGac ? cpt.nbac : 0);
		if (compta) {
			if (authType == 1 && !isGrp)
				editDbCr(sb, cpt.db, cpt.cr);
			else
				editDbEtCr(sb, cpt.db, cpt.cr);
		}
		sb.append("</td>");
		return sb.toString();
	}

	private void editDbCr(StringBuffer sb, int db, int cr){
		if (db == 0 && cr == 0) 
			return;
		int m = db + cr;
		String s = db > 0 ? "Débiteur de " : "Créditeur de ";
		int m2 = Math.round(m / 100);
		if (m2 == 0 && m != 0) m2 = 1;
		sb.append("<b> - ").append(s).append(m2).append("€</b>");
	}

	private void editDbEtCr(StringBuffer sb, int db, int cr){
		if (db == 0 && cr == 0)
			return;
		sb.append("<b> [");
		if (db > 0) {
			int m = db;
			int m2 = Math.round(m / 100);
			if (m2 == 0 && m != 0) m2 = 1;
			sb.append("DB : ").append(m2).append("€");
		}
		if (db > 0 && cr > 0)
			sb.append(" / ");
		if (cr > 0) {
			int m = cr;
			int m2 = Math.round(m / 100);
			if (m2 == 0 && m != 0) m2 = 1;
			sb.append("CR : ").append(m2).append("€");
		}
		sb.append("]</b>");
	}

	private void editCx(StringBuffer sb, int m, int p, int n, int nbac) {
		int m2 = Math.round(m / 100);
		if (m2 == 0 && m != 0) m2 = m > 0 ? 1 : -1;
		int p2 = Math.round(p / 1000);
		if (p2 == 0 && p != 0) p2 = 1;
		String n2 = n > 1 ? n + " lignes" : n + " ligne";
		if (nbac != 0)
			n2 += " (" + nbac + " AC)";
		sb.append("<b>").append(m2).append("€</b> &nbsp;").append(n2).append(" ").append(p2).append("Kg&nbsp; ");
	}

	private void editTweets(StringBuffer sb, Tweet[] tw) {
		if (tw != null && tw.length != 0) {
			sb.append("<div style='margin:4px 0;border:1px solid rgb(200,200,200);'>");
			int autres = 0;
			boolean aUrg = false;
			for (Tweet t : tw) {
				if (t.urgence()) {
					editTweet(sb, t);
					aUrg = true;
				} else
					autres++;
			}
			if (autres != 0){
				String s = autres > 1 ? "s" : "";
				if (aUrg)
					sb.append("<div><i>... et ").append(autres).append(" autre" + s + " non important" + s);
				else 
					sb.append("<div><i>").append(autres).append(" message" + s + " non important" + s);
			}
			sb.append("</div>");
		}
	}

	private void editTweet(StringBuffer sb, Tweet t) {
		String d = sdf1.format(t.version()).substring(0, 16);
		// Entry e = (Entry) dir.entry(t.origineGac() ? 1 : 2, t.origineGac() ? t.gac() : t.gap);
		Entry en = Directory.entryG(t.origineGac() ? 1 : 2, t.origineGac() ? t.gac() : t.gap);
		String ex = "#" + (t.origineGac() ? t.gac() : t.gap);
		sb.append("<div style='margin:2px;font-size:10px;'>" + d + " (");
		escapeHTML(sb, en != null ? en.initiales() : ex);
		sb.append(")<span style='color:red'>");
		escapeHTML(sb, t.texte());
		sb.append("</span></div>");
	}

}
