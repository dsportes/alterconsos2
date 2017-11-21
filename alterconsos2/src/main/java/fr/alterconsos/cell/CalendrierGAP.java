package fr.alterconsos.cell;

import java.util.ArrayList;
import java.util.List;

import org.json.simple.AcJSONObject;

import fr.alterconsos.MFA;
import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.HTCN;
import fr.hypertable.IAuthChecker;
import fr.hypertable.MF;
import fr.hypertable.Operation;
import fr.hypertable.AppTransaction.StatusPhase;

public class CalendrierGAP extends Calendrier {

	public static final CellDescr cellDescr = new CellDescr(CalendrierGAP.class);

	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	private int gap = 0;

	@Override public void setIds() {
		String s = line();
		gap = Integer.parseInt(s.substring(2, s.length() - 1));
	}

	public int gap() {
		return gap;
	}

	public static CalendrierGAP get(int gap) throws AppException {
		return (CalendrierGAP) Cell.get(GAP.lineOf(gap), "0.", "CalendrierGAP");
	}

	private void replicateLivr(int gap, int codeLivr) throws AppException {
		int[] dirs = AppTransaction.tr().authChecker.getDirs();
		String key = livrKey(gap, codeLivr);
		List<CellNode> src = nodesByKey(key);
		for (int i = 0; i < dirs.length; i++) {
			Calendrier cal = Calendrier.get(dirs[i]);
			for (CellNode cn : cal.nodesByKey(key))
				cn.remove();
			for (CellNode cn : src) {
				Livr l1 = (Livr) cn;
				Calendrier.Livr l2 = cal.newLivr(gap, codeLivr, l1.gac());
				cal.copyLivr(l1, l2);
			}
		}
	}

	@Override public void removeDir(int dir) throws AppException {
		Calendrier cal = Calendrier.get(dir);
		for (CellNode cn : cal.nodesByKey(Calendrier.gapKey(gap())))
			cn.remove();
	}

	@Override public void addDir(int dir) throws AppException {
		Calendrier cal = Calendrier.get(dir);
		String k = Calendrier.gapKey(gap());
		for (CellNode cn : cal.nodesByKey(k))
			cn.remove();
		for (CellNode cn : nodesByKey(k)) {
			Livr l1 = (Livr) cn;
			Calendrier.Livr l2 = cal.newLivr(l1.gap(), l1.codeLivr(), l1.gac());
			cal.copyLivr(l1, l2);
		}
	}

	@HTCN(id = 1) public class Livr extends Calendrier.Livr { }
	
	public void setArchivage(int codeLivr, int d){
		Livr l = livr(codeLivr);
		if (l != null)
			l.archivage(d);
	}

	private static String err1(String nomGap, String nomGac, int gap, int codeLivr, int gac) {
		String s = "Groupement: [" + nomGap + "], Livraison:[" + codeLivr + "]";
		return gac == 0 ? s : s + ", Groupe:[" + nomGac + "]";
	}

	private static void checkGac(String nomGap, int gac) throws AppException {
		if (gac != 0) throw new AppException(MFA.AUTHCAL, nomGap);
	}
	
	public Livr livr(int codeLivr){
		return (Livr) nodeByKey(sousLivrKey(gap(), codeLivr, 0));
	}

	public ArrayList<Calendrier.Livr> sousLivr(int gap, int codeLivr) {
		ArrayList<Calendrier.Livr> lst = new ArrayList<Calendrier.Livr>();
		for (CellNode cn : nodesByKey(livrKey(gap, codeLivr))) {
			Livr lx = (Livr) cn;
			if (lx.gac() != 0) lst.add(lx);
		}
		return lst;
	}

	public void setRepart(int gap, String nomGap, AcJSONObject arg) throws AppException {
		int codeLivr = arg.getI("codeLivr", -1);
		Calendrier.Livr livr = livr(gap, codeLivr, 0);
		if (livr == null)
			throw new AppException(MFA.CALREPART, err1(nomGap, null, gap, codeLivr, 0));

		String jsonData = arg.getS("jsonData");
		livr.jsonData(jsonData);
		replicateLivr(gap, codeLivr);
	}
	
	public void activer(boolean activer, int gap, String nomGap, AcJSONObject arg, int gac,
			String nomGac) throws AppException {

		int codeLivr = arg.getI("codeLivr", -1);
		Calendrier.Livr livr = livr(gap, codeLivr, 0);
		if (livr == null)
			throw new AppException(MFA.CALACTIV, err1(nomGap, nomGac, gap, (short) codeLivr, 0));

		if (gac != 0) {
			livr = livr(gap, codeLivr, gac);
			if (livr == null)
				throw new AppException(MFA.CALACTIV, err1(nomGap, nomGac, gap, (short) codeLivr,
						gac));
		}

		int aujourdhui = Calendrier.aujourdhui();
		int arc = livr.archive();
		if (arc <= aujourdhui) throw new AppException(MFA.CALARCH, nomGap, codeLivr);

		if (activer) {
			if (livr.suppr() != 0)
				livr.suppr(0);
			else return;
		} else {
			livr.suppr(aujourdhui);
		}
		replicateLivr(gap, codeLivr);
		LivrP livrP = LivrP.get(gap);
		if (livrP != null) livrP.recomputeSG(livr.codeLivr());
	}

	public void set(int gap, String nomGap, AcJSONObject arg, int gac, String nomGac)
			throws AppException {
		int codeLivr = arg.getI("codeLivr", -1);
		if (codeLivr < 0 || codeLivr > 999) throw new AppException(MFA.CALCLIVR, nomGap, codeLivr);
		int[] jours = premierDernierJours();
		int cl = codeLivr / 100;
		int a1 = (jours[0] / 10000) % 10;
		int a2 = (jours[1] / 10000) % 10;
		boolean ok = false;
		if (a1 < a2) {
			if (cl >= a1 && cl <= a2) ok = true;
		} else {
			if (cl >= a1 || cl <= a2) ok = true;
		}
		if (!ok) throw new AppException(MFA.CALCLIVR, nomGap, codeLivr);

		Calendrier.Livr livr = livr(gap, codeLivr, 0);

		if (livr == null) {
			livr = newLivr(gap, codeLivr, 0);
			livr.jlimite(1);
			livr.creation(aujourdhui());
		}

		int jarchive = arg.getI("jarchive", -1);
		if (jarchive != -1) {
			checkGac(nomGap, gac);
			if (jarchive < 0 || jarchive > 90)
				throw new AppException(MFA.CALJARCH,
						err1(nomGap, nomGac, gap, (short) codeLivr, 0), jarchive);
			livr.jarchive(jarchive);
		}

		int jouverture = arg.getI("jouverture", -1);
		if (jouverture != -1) {
			checkGac(nomGap, gac);
			if (jouverture < 0 || jouverture > 366)
					throw new AppException(MFA.CALOUV1, err1(nomGap, nomGac, gap, codeLivr, 0), jouverture);
			livr.jouverture(jouverture);
		}

		int jlimite = arg.getI("jlimite", -1);
		if (jlimite != -1) {
			checkGac(nomGap, gac);
			if (jlimite < 0 || jlimite > 100)
				throw new AppException(MFA.CALLIMI1, err1(nomGap, nomGac, gap, (short) codeLivr, 0), jlimite);
			livr.jlimite(jlimite);
		}

		int hlimite = arg.getI("hlimite", -1);
		if (hlimite != -1) {
			checkGac(nomGap, gac);
			if (hlimite < 0 || hlimite > 24)
				throw new AppException(MFA.CALHLIMI,
						err1(nomGap, nomGac, gap, (short) codeLivr, 0), hlimite);
			livr.hlimite(hlimite);
		}

		int expedition = arg.getI("expedition", -1);
		if (expedition != -1) {
			checkGac(nomGap, gac);
			if (expedition != 0 && (expedition < jours[0] || expedition > jours[1]))
				throw new AppException(MFA.CALEXPED,
						err1(nomGap, nomGac, gap, (short) codeLivr, 0), expedition, jours[0],
						jours[1]);
			checkExped(gap, codeLivr, expedition, nomGap);

			livr.expedition(expedition);
		}

		if (livr.expedition() == 0)
			throw new AppException(MFA.CALEXPED, err1(nomGap, nomGac, gap, (short) codeLivr, 0),
					expedition, jours[0], jours[1]);

		if (livr.limite() > livr.expedition())
			throw new AppException(MFA.CALLIMI, err1(nomGap, nomGac, gap, (short) codeLivr, 0),
					livr.limite(), livr.expedition(), 999);

		if (livr.ouverture() > livr.limite())
			throw new AppException(MFA.CALOUV, err1(nomGap, nomGac, gap, (short) codeLivr, 0),
					livr.ouverture(), livr.limite(), 999);

		if (gac != 0) {
			set(arg, gap, nomGap, codeLivr, gac, nomGac);
			Catalogue.get(gap).propagePrix(codeLivr, gac);
		}

		replicateLivr(gap, codeLivr);
	}

	public void set(AcJSONObject arg, int gap, String nomGap, int codeLivr, int gac, String nomGac)
			throws AppException {
		Calendrier.Livr livr = livr(gap, codeLivr, gac);
		if (livr == null) livr = newLivr(gap, codeLivr, gac);

		int jlivr = arg.getI("jlivr", -99);
		if (jlivr != -99) {
			if (jlivr > 7)
				throw new AppException(MFA.CALJLIVR, err1(nomGap, nomGac, gap, codeLivr, gac), jlivr);
			if (jlivr < -7)
				throw new AppException(MFA.CALJLIVR2, err1(nomGap, nomGac, gap, codeLivr, gac), jlivr);
			livr.jlivr(jlivr);
		}

		int hlimac = arg.getI("hlimac", -1);
		if (hlimac != -1) {
			if (hlimac < 0 || hlimac > 23)
				throw new AppException(MFA.CALHLIVRAC, err1(nomGap, nomGac, gap, codeLivr, gac),
						hlimac);
			livr.hlimac(hlimac);
		}

		int hlivr = arg.getI("hlivr", -1);
		if (hlivr != -1) {
			if (hlivr < 0 || hlivr > 24)
				throw new AppException(MFA.CALHLIVR, err1(nomGap, nomGac, gap, codeLivr, gac),
						hlivr);
			livr.hlivr(hlivr);
		}

		int jdistrib = arg.getI("jdistrib", -99);
		if (jdistrib != -99) {
			if (jdistrib > 7)
				throw new AppException(MFA.CALJDISTR, err1(nomGap, nomGac, gap, codeLivr, gac), jdistrib);
			if (jdistrib < -7)
				throw new AppException(MFA.CALJDISTR2, err1(nomGap, nomGac, gap, codeLivr, gac), jdistrib);
			livr.jdistrib(jdistrib);
		}

		int hdistrib = arg.getI("hdistrib", -1);
		if (hdistrib != -1) {
			if (hdistrib < 0 || hdistrib > 24)
				throw new AppException(MFA.CALHDISTR, err1(nomGap, nomGac, gap, codeLivr, gac),
						hdistrib);
			livr.hdistrib(hdistrib);
		}

		int fdistrib = arg.getI("fdistrib", -1);
		if (fdistrib != -1) {
			if (fdistrib < 0 || fdistrib > 24)
				throw new AppException(MFA.CALHDISTR, err1(nomGap, nomGac, gap, codeLivr, gac),
						fdistrib);
			livr.fdistrib(fdistrib);
		}

		int reduc = arg.getI("reduc", -1);
		if (reduc != -1) {
			if (reduc < 0 || reduc > 100)
				throw new AppException(MFA.CALREDUC, err1(nomGap, nomGac, gap, codeLivr, gac), reduc);
			livr.reduc(reduc);
		}

		int fraisgap0 = arg.getI("fraisgap0", -1);
		if (fraisgap0 != -1) {
			livr.fraisgap0(fraisgap0 == 0 ? 0 : 1);
		}
		
		String adresseL = arg.getS("adresseL", null);
		if (adresseL != null)
			livr.adresseL(adresseL.equals("") ? null : adresseL);
		String adresseD = arg.getS("adresseD", null);
		if (adresseD != null)
			livr.adresseD(adresseD.equals("") ? null : adresseD);
		
		if (reduc != -1) {
			LivrC lc = LivrC.get(gap, codeLivr, gac);
			lc.updateReduc(livr.reduc(), livr.fraisgap0());
		}

	}

	private void checkExped(int gap, int codeLivr, int exped, String nomGap) throws AppException{
		for (Object o : nodesByKey(gapKey(gap))) {
			Calendrier.Livr livr = (Livr) o;
			if (livr.gac() != 0 || livr.codeLivr() == codeLivr) continue;
			if (livr.expedition() == exped)
				throw new AppException(MFA.DUPEXPED, codeLivr, nomGap, exped, livr.codeLivr());				
		}
	}
	
	public void nouvLivr(int gap, int dateLivr, String nomGap, int srcCodeLivr, int srcCodeLivrCat) throws AppException {
		Calendrier.Livr livr;
		int a = (dateLivr / 10000) % 10;
		int num = (a * 100) + 1;
		int expPrec = 0;
		Calendrier.Livr livrPrec = null;
		for (Object o : nodesByKey(gapKey(gap))) {
			livr = (Livr) o;
			if (livr.gac() != 0) continue;
			if (livr.expedition() == dateLivr) return;
			if (livr.expedition() < dateLivr && livr.suppr() == 0 && livr.expedition() > expPrec) {
				livrPrec = livr;
				expPrec = livr.expedition();
			}
			int b = livr.codeLivr() / 100;
			if (a == b && livr.codeLivr() >= num) num = livr.codeLivr() + 1;
		}

		checkExped(gap, num, dateLivr, nomGap);
		livr = newLivr(gap, num, 0);
		livr.expedition(dateLivr);
		livr.creation(aujourdhui());

		Calendrier.Livr srcLivrPar = null;
		Calendrier.Livr srcLivrParCat = null;
		if (srcCodeLivr > 0)
			srcLivrPar = livr(gap, srcCodeLivr, 0);
		if (srcCodeLivrCat > 0)
			srcLivrParCat = livr(gap, srcCodeLivrCat, 0);
//		Calendrier.Livr srcLivr = srcLivrPar != null ? srcLivrPar : livrPrec;
		Calendrier.Livr srcLivr = srcLivrPar;
		
		if (srcLivr != null) {
			livr.jsonData(srcLivr.jsonData());
			livr.jarchive(srcLivr.jarchive());
			int nbjLim = memeDecalage(srcLivr.expedition(), srcLivr.limite(), livr.expedition());
			livr.jlimite(AS.nbj(livr.expedition()) - nbjLim);
			livr.hlimite(srcLivr.hlimite());
			int nbjOuv = memeDecalage(srcLivr.expedition(), srcLivr.ouverture(), livr.expedition());
			livr.jouverture(nbjLim - nbjOuv);
			for (CellNode cn : nodesByKey(livrKey(livr.gap(), srcLivr.codeLivr()))) {
				Calendrier.Livr livrS = (Livr) cn;
				if (livrS.gac() != 0 && livrS.suppr() == 0) {
					Directory.Entry e2 = GAC.gacEntry(livrS.gac());
					if (e2 == null || e2.suppr() != 0) 
						continue;
					Calendrier.Livr nlivr = newLivr(livrS.gap(), num, livrS.gac());
					nlivr.creation(aujourdhui());
					copyLivrP(livrS, nlivr);
				}
			}
		}
		replicateLivr(gap, num);
		
		int cl;
		if (srcCodeLivrCat == 0)
			cl = 0;
		else {
			if (srcLivrParCat != null)
				cl = srcLivrParCat.codeLivr();
			else 
				if (livrPrec != null)
					cl = livrPrec.codeLivr();
				else
					cl = 0;
		}
		Catalogue.get(gap).dupPrix(num, cl);
		for (CellNode cn : nodesByKey(livrKey(livr.gap(), livr.codeLivr()))) {
			Calendrier.Livr livrS = (Livr) cn;
			if (livrS.gac() != 0 && livrS.suppr() == 0) {
				LivrC lc = LivrC.get(livr.gap(), livr.codeLivr(), livrS.gac());
				lc.updateReduc(livrS.reduc(), livrS.fraisgap0());
			}
		}
	}
	
	private int memeDecalage(int d1, int d2, int d3){
		int s1 = AS.nbs(d1);
		int s2 = AS.nbs(d2);
		int n = s1 - s2;
		int j2 = AS.js(d2);
		int s3 = AS.nbs(d3);
		// d2 est une date N semaines avant d1 et un jour de semaine donné d2j
		// d4 est une date N semaines avant d3 et le même jour de semaine d2j
		int d = AS.aammjj(s3 - n, j2);
		return AS.nbj(d);
	}
	
	public void recopiePrix(int gap, int codeLivr, String nomGap, int srcCodeLivr) throws AppException{
		Calendrier.Livr livr = livr(gap, codeLivr, 0);
		if (livr == null)
			throw new AppException(MFA.COPYPRX, err1(nomGap, "", gap, codeLivr, 0));
		Calendrier.Livr srcLivr = null;
		if (srcCodeLivr != 0) {
			srcLivr = livr(gap, srcCodeLivr, 0);
			if (srcLivr == null)
				throw new AppException(MFA.COPYPRX, err1(nomGap, "", gap, srcCodeLivr, 0));
		}
		Catalogue.get(gap).dupPrix(codeLivr, srcCodeLivr);
	}

	public static class Op extends Operation {

		String line;
		String column;
		int gap;
		int gac;
		String c;
		String nomGap;
		String nomGac;

		@Override public String mainLine() {
			return line;
		}

		public StatusPhase phaseFaible() throws AppException {
			c = getOpName();

			gap = arg().getI("gap", 0);
			Directory.Entry e = GAP.gapEntry(gap);
			if (e == null || e.suppr() != 0)
				throw new AppException(MFA.CALANG, e != null ? e.label() : gap);
			nomGap = e.label();

			line = GAP.lineOf(gap);
			column = "0.";
			gac = arg().getI("gac", 0);
			if (gac != 0) {
				Directory.Entry e2 = GAC.gacEntry(gac);
				if (e2 == null || e2.suppr() != 0)
					throw new AppException(MFA.CALANG2, e2 != null ? e2.label() : gac);
				nomGac = e.label();
			}

			IAuthChecker ac = authChecker;
			if (ac.getAuthPower() >= 5) throw new AppException(MF.ANNUL);

			int lvl = ac.accessLevel(line, column, "Calendrier");
			if (lvl < 1) throw new AppException(MFA.AUTHCAL, nomGap);

			int g = ac.getAuthGrp();

			if (ac.getAuthType() == 2) {
				// if (gac != 0) throw new AppException(MFA.AUTHCAL3, nomGap);
				if (g == gap && ac.getAuthPower() < 3)
					return StatusPhase.transactionMultiLines;
				else throw new AppException(MFA.AUTHCAL, nomGap);
			}
			if (ac.getAuthType() == 1) {
				if (gac == 0) throw new AppException(MFA.AUTHCAL2, nomGap);
				if (g == gac && ac.getAuthPower() < 3)
					return StatusPhase.transactionMultiLines;
				else throw new AppException(MFA.AUTHCAL, nomGap);
			}
			throw new AppException(MFA.AUTHCAL, nomGap);
		}

		public void phaseForte() throws AppException {

			CalendrierGAP cal = CalendrierGAP.get(gap);

			if (c.equals("26")) {
				cal.set(gap, nomGap, arg(), gac, nomGac);
				return;
			}

			if (c.equals("27")) {
				cal.activer(false, gap, nomGap, arg(), gac, nomGac);
				return;
			}

			if (c.equals("28")) {
				cal.activer(true, gap, nomGap, arg(), gac, nomGac);
				return;
			}

			if (c.equals("60")) {
				cal.setRepart(gap, nomGap, arg());
				return;
			}

		}

	}

	public static class Op2 extends Operation {

		String line = "D";
		String column;
		int gap;
		String c;
		String nomGap;
		int dateLivr;
		int srcCodeLivr;
		int srcCodeLivrCat;
		int codeLivr;

		@Override public String mainLine() {
			return line;
		}

		public StatusPhase phaseFaible() throws AppException {
			c = getOpName();
			gap = arg().getI("gap", 0);
			Directory.Entry e = GAP.gapEntry(gap);
			if (e == null || e.suppr() != 0) 
				throw new AppException(MFA.CALANG, gap);
			nomGap = e.label();
			line = GAP.lineOf(gap);
			column = "0.";
			dateLivr = arg().getI("dateLivr", -1);
			srcCodeLivr = arg().getI("srcCodeLivr", -1);
			srcCodeLivrCat = arg().getI("srcCodeLivrCat", -1);
			codeLivr = arg().getI("codeLivr", -1);
			int[] pdj = Calendrier.premierDernierJours();
			if (c.equals("30") && (dateLivr < pdj[0] || dateLivr > pdj[1]))
				throw new AppException(MFA.CALNLIVR1, nomGap, dateLivr);
			if (c.equals("32") && codeLivr == srcCodeLivr)
				throw new AppException(MFA.CALCOPYL, nomGap, codeLivr);

			IAuthChecker ac = authChecker;
			if (ac.getAuthPower() >= 3) throw new AppException(MF.ANNUL);

			int lvl = ac.accessLevel(line, column, "Calendrier");
			if (lvl < 1) throw new AppException(MFA.AUTHCAL, nomGap);

			return StatusPhase.transactionMultiLines;
		}

		public void phaseForte() throws AppException {

			CalendrierGAP cal = CalendrierGAP.get(gap);

			if (c.equals("30")) {
				cal.nouvLivr(gap, dateLivr, nomGap, srcCodeLivr, srcCodeLivrCat);
				return;
			}
			
			if (c.equals("32")) {
				cal.recopiePrix(gap, codeLivr, nomGap, srcCodeLivr);
				return;
			}

		}

	}

}
