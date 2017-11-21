package fr.alterconsos.cell;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Comparator;
import java.util.GregorianCalendar;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;

import fr.alterconsos.AppConfig;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.HTServlet;

public class Calendrier extends Cell {
	public static final CellDescr cellDescr = new CellDescr(Calendrier.class);

	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	private int code = 0;

	public int code() {
		return code;
	}

	@Override public void setIds() {
		String s = column();
		code = Integer.parseInt(s.substring(0, s.length() - 1));
	}

	public static int aujourdhui() {
		return HTServlet.appCfg.aujourdhui();
	}

	public static int jPlusN(int aammjj, int n) {
		if (n == 0) return aammjj;
		GregorianCalendar c = new GregorianCalendar(AppConfig.timezone, Locale.FRANCE);
		c.set(Calendar.YEAR, (aammjj / 10000) + 2000);
		c.set(Calendar.MONTH, ((aammjj % 10000) / 100) - 1);
		c.set(Calendar.DAY_OF_MONTH, aammjj % 100);
		c.add(Calendar.DAY_OF_MONTH, n);
		int a = c.get(Calendar.YEAR) % 100;
		int m = c.get(Calendar.MONTH) + 1;
		int j = c.get(Calendar.DAY_OF_MONTH);
		return (a * 10000) + (m * 100) + j;
	}

	public static int[] premierDernierJours() {
		int aj = aujourdhui();
		int a = aj / 10000;
		int m = (aj / 100) % 100;
		int[] r = new int[2];
		if (m < 9) {
			r[0] = ((a - 2) * 10000) + 901;
			r[1] = ((a + 1) * 10000) + 831;
		} else {
			r[0] = ((a - 1) * 10000) + 901;
			r[1] = ((a + 2) * 10000) + 831;
		}
		return r;
	}
	
	public static Calendrier get(int dir) throws AppException {
		return (Calendrier) Cell.get("D", dir + ".", "Calendrier");
	}

	public static Livr staticLivr(int gap, int codeLivr, int gac) {
		try {
			int[] dirs = AppTransaction.tr().authChecker.getDirs();
			for(int dir : dirs){
				Calendrier cal = get(dir);
				Livr livr = cal.livr(gap, codeLivr, gac);
				if (livr != null)
					return livr;
			}
			return null;
		} catch (AppException e) {
			return null;
		}
	}

	public static class CodeLivrSet {
		HashSet<String> r = new HashSet<String>();
		public CodeLivrSet(ArrayList<Calendrier> cals){
			for(Calendrier cal : cals){
				for (CellNode cn : cal.nodesByKey("L.")) {
					Livr slivr = (Livr) cn;
					if (slivr.gac == 0) 
						r.add(slivr.gap + "." + slivr.codeLivr);
				}
			}
		}
		
		public boolean has(int gap, int codeLivr){
			return r.contains(gap + "." + codeLivr);
		}
	}

	public List<Integer> gacsOf(int gap, int codeLivr) {
		ArrayList<Integer> lst = new ArrayList<Integer>();
		for (CellNode cn : nodesByKey(livrKey(gap, codeLivr))) {
			Livr slivr = (Livr) cn;
			if (slivr.gac != 0) lst.add(slivr.gac);
		}
		return lst;
	}

	public Livr livr(int gap, int codeLivr, int gac) {
		return (Livr) nodeByKey("L." + gap + "." + codeLivr + "." + gac + ".");
	}

	public static String gapKey(int gap) {
		return "L." + gap + ".";
	}

	public String sousLivrKey(int gap, int codeLivr, int gac) {
		return "L." + gap + "." + codeLivr + "." + gac + ".";
	}

	public String livrKey(int gap, int codeLivr) {
		return "L." + gap + "." + codeLivr + ".";
	}

	public Livr newLivr(int gap, int codeLivr, int gac) throws AppException {
		Livr l = (Livr) newCellNode("Livr");
		l.gap = gap;
		l.codeLivr = codeLivr;
		l.gac = gac;
		l.insert();
		return l;
	}
	
	public static class GapCodeLivr { // Pour Excel
		int gap;
		int codeLivr;
		int jd;
		int dd;
		int fd;
		int jl;
		int dl;
		int jc;
		int fc;
		GapCodeLivr(int g, int cl) {
			gap = g;
			codeLivr = cl;
		}
	}

	public static Livr getGapGacLivr(int gap, int gac, int date){
		try {
			int[] dirs = AppTransaction.tr().authChecker.getDirs();
			for(int dir : dirs){
				Calendrier cal = get(dir);
				for (CellNode cn : cal.nodesByKey("L." + gap + ".")) {
					Livr l = (Livr) cn;
					if (l.gac != gac) continue;
					if (date == HTServlet.appCfg.getMondayOf(l.expedition(), 0))
						return l;
				}	
			}
			return null;
		} catch (AppException e) {
			return null;
		}
	}

	public static List<GapCodeLivr> getGacLivrs(int gac, int d){
		LinkedList<GapCodeLivr> res = new LinkedList<GapCodeLivr>();
		try {
			int[] dirs = AppTransaction.tr().authChecker.getDirs();
			for(int dir : dirs){
				Calendrier cal = get(dir);
//				int lu = HTServlet.appCfg.getMondayOf(d, 0);
				for (CellNode cn : cal.nodesByKey("L.")) {
					Livr l = (Livr) cn;
					if (l.gac == gac && l.suppr() == 0 && l.myLivr().suppr() == 0 && l.distrib() == d) {
						GapCodeLivr x = new GapCodeLivr(l.gap, l.codeLivr);
						x.jd = l.distrib();
						x.dd = l.hdistrib();
						if (x.dd <= 7) x.dd = 8;
						x.fd = l.fdistrib();
						if (x.fd <= x.dd) x.fd = x.dd + 1;
						x.jl = l.livr();
						x.dl = l.hlivr();
						if (x.dl <= 7) x.dl = 8;
						x.jc = l.limite();
						x.fc = l.hlimite();
						if (x.fc <= 0) x.fc = 24;
						res.add(x);
					}
				}
			}
			return res;
		} catch (AppException e) {
			return res;
		}
	}
	
	public int getGapLivr(int gap, int lu){
		for (CellNode cn : nodesByKey(gapKey(gap))) {
			Livr l = (Livr) cn;
			if (l.suppr() == 0 && HTServlet.appCfg.getMondayOf(l.expedition(), 0) == lu)
				return l.codeLivr;
		}
		return 0;
	}

	public static List<Cpt> getLivrsEnCours(int at, int grp, int usr, int dateDuJourI, int debut, int fin) throws AppException {
		int mode = at == 2 ? 1 : (usr >= 1 ? 3 : 2);
		int gap = at == 2 ? grp : 0;
		int gac = at == 1 ? grp : 0;
		int dateMin = HTServlet.appCfg.getMondayOf(dateDuJourI, debut);
		int dateMax = HTServlet.appCfg.getMondayOf(dateDuJourI, fin);
		int lundiSP = HTServlet.appCfg.getMondayOf(dateDuJourI, -1);

		LinkedList<Cpt> cpts = new LinkedList<Cpt>();
		
		LinkedList<Livr> res = new LinkedList<Livr>();
		if (gap != 0) {
			CalendrierGAP cal = CalendrierGAP.get(gap);
			for (CellNode cn : cal.nodesByKey(Calendrier.gapKey(gap))) {
				Livr l = (Livr) cn;
				if (l.suppr() != 0 || l.myLivr().suppr() != 0)
					continue;
				if (l.gac != 0) {
					int p = l.phaseActuelle(false, false);
					int d = l.date2(mode);
					if ((p > 0 && p < 6) && d < dateMax && d >= dateMin) res.add(l);
				}
			}
		} else {
			int[] dirs = AppTransaction.tr().authChecker.getDirs();
			for(int dir : dirs){
				Calendrier cal = get(dir);
				for (CellNode cn : cal.nodesByKey("L.")) {
					Livr l = (Livr) cn;
					if (l.suppr() != 0 || l.myLivr().suppr() != 0)
						continue;
					if (l.gac == gac) {
						int p = l.phaseActuelle(false, false);
						int d = l.date(mode);
						if ((p > 0 && p < 6) && d < dateMax && d >= dateMin) res.add(l);
					}
				}
			}
		}
		if (res.size() == 0)
			return null;
		Livr[] lv = res.toArray(new Livr[res.size()]);
		Arrays.sort(lv, new dateComparator(mode));
		ICpt livrPG = at == 2 ? LivrP.get(grp) :  LivrG.get(grp);
		for (Livr l : lv) {
			Cpt cpt = livrPG.getCpt(l, usr);
			int lu = HTServlet.appCfg.getMondayOf(l.date(mode), 0);
			if (cpt.notzero() || lu > lundiSP);
				cpts.add(livrPG.getCpt(l, usr));
		}
		return cpts;
	}

	public static class dateComparator implements Comparator<Livr> {
		int mode;
//		Directory[] dirs;
		int authType;
		int at;

		public dateComparator(int mode) {
			this.mode = mode;
//			try {
//				dirs = Directory.myDirs();
//			} catch (AppException e) {
//			}
			authType = mode == 1 ? 2 : 1;
			at = authType == 2 ? 1 : 2;
		}

		@Override public int compare(Livr a, Livr b) {
			if (a.date(mode) < b.date(mode)) return -1;
			if (a.date(mode) > b.date(mode)) return 1;
//			Directory.Entry ena = Directory.entryG(dirs, at, authType == 2 ? a.gac : a.gap);
//			Directory.Entry enb = Directory.entryG(dirs, at, authType == 2 ? b.gac : b.gap);
			Directory.Entry ena = Directory.entryG(at, authType == 2 ? a.gac : a.gap);
			Directory.Entry enb = Directory.entryG(at, authType == 2 ? b.gac : b.gap);
			String ea = ena == null ? "#" + (authType == 2 ? a.gac : a.gap) : ena.initiales();
			String eb = enb == null ? "#" + (authType == 2 ? b.gac : b.gap) : enb.initiales();
			return ea.compareTo(eb);
		}

	}

	public LivrToPurge getLivrToPurge(int gap){
		return new LivrToPurge(gap);
	}
	
	public class LivrToPurge {
		Hashtable<Integer, ArrayList<Integer>> livrs = new Hashtable<Integer, ArrayList<Integer>>();
		LinkedList<Integer> codeLivrs = new LinkedList<Integer>();
		Integer[] codeLivrsA;
		int gap;
				
		private LivrToPurge(int gap){
			this.gap = gap;
			int[] pd = Calendrier.premierDernierJours();
			// pd[0] = 150501; // pour tester
			for (CellNode cn : nodesByKey("L." + gap + ".")) {
				Livr l = (Livr) cn;
				if (l.expedition() < pd[0]) {
					ArrayList<Integer> gacs = livrs.get(l.codeLivr);
					if (gacs == null){
						codeLivrs.add(l.codeLivr);
						gacs = new ArrayList<Integer>();
					}
					if (l.gac != 0 && !gacs.contains(l.gac))
						gacs.add(l.gac);
					livrs.put(l.codeLivr, gacs);
				}
			}
			codeLivrsA = codeLivrs.toArray(new Integer[codeLivrs.size()]);
		}
		
		public LivrToPurge purge(){
			for(int cl : codeLivrsA) {
				nodeByKey(sousLivrKey(gap, cl, 0)).remove();
				for(int gac : gacsOf(cl))
					nodeByKey(sousLivrKey(gap, cl, gac)).remove();
			}
			return this;
		}
		
		public  Integer[] listCodeLivr(){
			return codeLivrsA;
		}
		
		public ArrayList<Integer> gacsOf(int codeLivr){
			return livrs.get(codeLivr);
		}
		
	}
		
	public void copyLivr(Livr src, Livr dest) {
		dest.creation = src.creation;
		dest.expedition = src.expedition;
		dest.fdistrib = src.fdistrib;
		dest.hdistrib = src.hdistrib;
		dest.hlimite = src.hlimite;
		dest.hlivr = src.hlivr;
		dest.suppr = src.suppr;
		dest.jouverture = src.jouverture;
		dest.jlimite = src.jlimite;
		dest.hlimac = src.hlimac;
		dest.jarchive = src.jarchive;
		dest.jdistrib = src.jdistrib;
		dest.jlivr = src.jlivr;
		dest.jsonData = src.jsonData;
		dest.adresseD = src.adresseD;
		dest.adresseL = src.adresseL;
		dest.reduc = src.reduc;
		dest.fraisgap0 = src.fraisgap0;
	}

	public void copyLivrP(Livr src, Livr dest) {
		dest.hlimac = src.hlimac;
		dest.fdistrib = src.fdistrib;
		dest.hdistrib = src.hdistrib;
		dest.hlivr = src.hlivr;
		dest.jdistrib = src.jdistrib;
		dest.jlivr = src.jlivr;
		dest.adresseD = src.adresseD;
		dest.adresseL = src.adresseL;
		dest.reduc = src.reduc;
		dest.fraisgap0 = src.fraisgap0;
	}

	@HTCN(id = 1) public class Livr extends CellNode {
		private Livr livr = null;

		public Livr myLivr() {
			if (gac == 0) return this;
			if (livr == null) livr = Calendrier.this.livr(gap(), codeLivr(), 0);
			return livr;
		}

		@Override public String[] keys() {
			String[] keys = { sousLivrKey(gap, codeLivr, gac) };
			return keys;
		}

		@HT(id = 1) private int gap;

		public int gap() {
			return gap;
		}

		@HT(id = 2) private int codeLivr;

		public int codeLivr() {
			return codeLivr;
		}

		@HT(id = 3) private int gac;

		public int gac() {
			return gac;
		}

		@HT(id = 4) private int suppr;

		public int suppr() {
			return suppr;
		}

		public void suppr(int value) {
			if (w(this.suppr, value)) this.suppr = value;
		}

		@HT(id = 6) private int creation;

		public int creation() {
			return myLivr().creation;
		}

		public void creation(int value) {
			if (w(this.creation, value)) this.creation = value;
		}

		@HT(id = 7) private int archivage;

		public int archivage() {
			return myLivr().archivage;
		}

		public void archivage(int value) {
			if (w(this.archivage, value)) this.archivage = value;
		}

		@HT(id = 20) private int jouverture;

		public int jouverture() {
			return myLivr().jouverture;
		}

		public void jouverture(int value) {
			if (w(this.jouverture, value)) this.jouverture = value;
		}

		public int ouverture() {
			return jPlusN(limite(), -jouverture());
		}

		@HT(id = 21) private int jlimite;

		public int jlimite() {
			return myLivr().jlimite;
		}

		public void jlimite(int value) {
			if (w(this.jlimite, value)) this.jlimite = value;
		}

		public int limite() {
			return jPlusN(expedition(), -jlimite());
		}

		public int date(int mode) {
			switch (mode) {
			case 1:
				return expedition();
			case 2:
				return livr();
			case 3:
				return distrib();
			}
			return 0;
		}

		public int date2(int mode) {
			switch (mode) {
			case 1:
				return expedition();
			case 2:
				return distrib();
			case 3:
				return distrib();
			}
			return 0;
		}

		@HT(id = 9) private int expedition;

		public int expeditionRaw() {
			return expedition;
		}

		public int expedition() {
			return myLivr().expedition;
		}

		public void expedition(int value) {
			if (w(this.expedition, value)) this.expedition = value;
		}

		public int livr() {
			int dex = expedition();
			if (jlivr >= 0)
				return jPlusN(dex, jlivr);
			int jex = HTServlet.appCfg.getDayOfWeek(dex);
			int jl = -jlivr;
			if (jl == jex)
				return dex;
			if (jl > jex) // même semaine, plus tard
				return jPlusN(dex, jl -jex);
			else // semaine suivante
				return jPlusN(dex, 7 + jl - jex);
		}

		@HT(id = 10) private int jlivr;

		public int jlivr() {
			return jlivr;
		}

		public void jlivr(int value) {
			if (w(this.jlivr, value)) this.jlivr = value;
		}

		public int distrib() {
			int dl = livr();
			if (jdistrib >= 0)
				return jPlusN(dl, jdistrib);
			int jl = HTServlet.appCfg.getDayOfWeek(dl);
			int jd = -jdistrib;
			if (jl == jd)
				return dl;
			if (jd > jl) // même semaine, plus tard
				return jPlusN(dl, jd -jl);
			else // semaine suivante
				return jPlusN(dl, 7 + jd - jl);			
		}

		@HT(id = 11) private int jdistrib;

		public int jdistrib() {
			return jdistrib;
		}

		public void jdistrib(int value) {
			if (w(this.jdistrib, value)) this.jdistrib = value;
		}

		@HT(id = 12) private int jarchive;

		public int jarchive() {
			return myLivr().jarchive;
		}

		public void jarchive(int value) {
			if (w(this.jarchive, value)) this.jarchive = value;
		}

		public int archive() {
			int exp = expedition();
			int jarch = jarchive();
			return jPlusN(exp, jarch != 0 ? jarch : 30);
		}

		@HT(id = 13) private int hlimite;

		public int hlimite() {
			return myLivr().hlimite;
		}

		public void hlimite(int value) {
			if (w(this.hlimite, value)) this.hlimite = value;
		}

		@HT(id = 14) private int hlivr;

		public int hlivr() {
			return hlivr;
		}

		public void hlivr(int value) {
			if (w(this.hlivr, value)) this.hlivr = value;
		}

		@HT(id = 15) private int hdistrib;

		public int hdistrib() {
			return hdistrib;
		}

		public void hdistrib(int value) {
			if (w(this.hdistrib, value)) this.hdistrib = value;
		}

		@HT(id = 16) private int fdistrib;

		public int fdistrib() {
			return fdistrib;
		}

		public void fdistrib(int value) {
			if (w(this.fdistrib, value)) this.fdistrib = value;
		}

		@HT(id = 17) private int hlimac;

		public int hlimac() {
			return hlimac;
		}

		public void hlimac(int value) {
			if (w(this.hlimac, value)) this.hlimac = value;
		}

		@HT(id = 30) private int reduc;

		public int reduc() {
			return reduc;
		}

		public void reduc(int value) {
			if (w(this.reduc, value)) this.reduc = value;
		}

		@HT(id = 31) private int fraisgap0;

		public int fraisgap0() {
			return fraisgap0;
		}

		public void fraisgap0(int value) {
			if (w(this.fraisgap0, value)) this.fraisgap0 = value;
		}

		@HT(id = 45) private String jsonData;

		public String jsonData() {
			return jsonData;
		}

		public void jsonData(String value) {
			if (w(this.jsonData, value)) this.jsonData = value;
		}

		@HT(id = 46) private String adresseL;

		public String adresseL() {
			return adresseL;
		}

		public void adresseL(String value) {
			if (w(this.adresseL, value)) this.adresseL = value;
		}

		@HT(id = 47) private String adresseD;

		public String adresseD() {
			return adresseD;
		}

		public void adresseD(String value) {
			if (w(this.adresseD, value)) this.adresseD = value;
		}

		/*
		 * 6 : archivé
		 * 5 : en distribution
		 * 4 : en livraison
		 * 3 : en expédition
		 * 2 : en chargement
		 * 1 : en commande (plus tard pour responsable de groupe que pour AC)
		 * 0 : pas ouvert
		 */
		
		public int phaseActuelle(boolean forAC, boolean jour) {
			int m = HTServlet.appCfg.maintenant();
			int arch = archive();
			if (arch * 100 <= m) return 6; // archivé
			if (gac != 0) {
				if ((distrib() * 100) + (jour ? 0 : hdistrib) <= m) return 5; // en distribution
				if ((livr() * 100) + (jour ? 0 : hlivr) <= m) return 4; // en livraison
			}
			if (expedition() * 100 < m) return 3; // en expedition
			
			int hx = hlimite() == 0 ? 24 : hlimite();
			if (gac != 0 && forAC && hlimac != 0) {
				hx = hx > hlimac ? hx - hlimac : 1;
			}
			if ((limite() * 100) + hx <= m) return 2; // en chargement
			if (ouverture() * 100 < m) return 1; // C : en commandes
			return 0; // P : pas ouvert aux commandes
		}
	}

}
