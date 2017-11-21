package fr.alterconsos.cell;

import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.LinkedList;
import java.util.List;

import org.json.simple.AcJSONArray;
import org.json.simple.AcJSONObject;

import fr.alterconsos.MFA;
import fr.alterconsos.cell.Catalogue.Produit;
import fr.alterconsos.cell.ImportCmd.GPQ;
import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.ArrayInt;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.DirectoryG;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.HTServlet;
import fr.hypertable.MF;
import fr.hypertable.Operation;
import fr.hypertable.AppTransaction.StatusPhase;

public class LivrC extends Livr {
	public static final CellDescr cellDescr = new CellDescr(LivrC.class);

	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	public static String keyOfExclC() {
		return "X";
	}

	public static String keyOfPrix(int prod) {
		return "M." + Catalogue.prod(prod) + ".";
	}

	public static String keyOfAcApPr1(int ac, int ap, int pr) {
		return "A." + ac + "." + ap + "." + pr + ".";
	}

	public static String keyOfAcApPr1p(int ac, int ap) {
		return "A." + ac + "." + ap + ".";
	}

	public static String keyOfAcApPr1ac(int ac) {
		return "A." + ac + ".";
	}

	public static String keyOfAcApPr2(int ac, int ap, int pr) {
		return "B." + ap + "." + pr + "." + ac + ".";
	}

	public static String keyOfAcApPr2p(int ap, int pr) {
		return "B." + ap + "." + pr + ".";
	}

	public static String keyOfApPr1(int ap, int pr) {
		return pr != 0 ? "C." + ap + "." + pr + "." : null;
	}

	public static String keyOfApPr1p(int ap) {
		return "C." + ap + ".";
	}

	public static String keyOfApPr2p() {
		return "C.";
	}

	public static String keyOfAcAp1(int ac, int ap) {
		return "D." + ac + "." + ap + ".";
	}

	public static String keyOfAcAp1p(int ac) {
		return "D." + ac + ".";
	}

	public static String keyOfAcAp2(int ac, int ap) {
		return "E." + ap + "." + ac + ".";
	}

	public static String keyOfAcAp2p(int ap) {
		return "E." + ap + ".";
	}

	public static String keyOfAc1(int ac) {
		return "G." + ac + ".";
	}

	public static String keyOfAc1p() {
		return "G.";
	}

	public static String keyOfAp1(int ap) {
		return "H." + ap + ".";
	}

	public static String keyOfAp1p() {
		return "H.";
	}

	public static String keyOfGac() {
		return "I";
	}

	public static String keyOfReduc() {
		return "T";
	}

	private int codeLivrx = 0;
	
	private boolean nouvelle = false;
	
	private int reduc = 0;

	public int codeLivr() {
		return codeLivrx;
	}

	@Override public void setIds() throws AppException {
		try {
			String[] s = line().split("\\.");
			if (line().startsWith("P"))
				gapx = Integer.parseInt(s[1]);
			else gacx = Integer.parseInt(s[1]);
			s = column().split("\\.");
			codeLivrx = Integer.parseInt(s[0]);
			if (s.length >= 2) gacx = Integer.parseInt(s[1]);
		} catch (Exception e) {
			throw new AppException(MF.COLUMN, column());
		}
	}

	@Override public void compile() throws AppException {
		Reduc red = (Reduc) nodeByKey(keyOfReduc());
		reduc = red == null ? 0 : red.reduc;
		nouvelle = version() == -1;
		for (CellNode cn : nodesByKey("D.")) {
			AcAp x = (AcAp) cn;
			if (x.ami != 0) {
				x.amisPar.clear();
				x.amisPar.add(x.payePar * 1000 + x.ami);
				x.ami = 0;
			}
		}
		manageRecomp();
	}

	private Recomp rec;
	
	private void manageRecomp() {
		if (nouvelle) {
			try {
				rec = (Recomp) cellDescr.newCellNode(this, "Recomp");
			} catch (AppException e) {
				return;
			}
			rec.recomp(12);
			rec.insert();
		} else {
			rec = (Recomp) nodeByKey("R");
			if (rec == null) { 
				try {
					rec = (Recomp) cellDescr.newCellNode(this, "Recomp");
				} catch (AppException e) {
					return;
				}
				// recomp == 0
				rec.insert();
			}
		}
		if (rec.recomp < 12){
			for (CellNode cn : nodesByKey(keyOfApPr2p())) {
				ApPr x = (ApPr) cn;
				// historique : qteC/D à -1 signifie (de)charge à 0
				if (x.qteC == -1) {
					x.qteC(0);
					x.charge(1);
				}
				if (x.lprixC.size() != 0)
					x.charge(1);
				if (x.lprix.size() != 0)
					x.decharge(1);
				if (x.qteD == -1) {
					x.qteD(0);
					x.decharge(1);
				}
				// historique : les poids < 0 étaient estimés
				if (x.poidsC < 0)
					x.poidsC(-x.poidsC);
				if (x.poidsD < 0)
					x.poidsD(-x.poidsD);
				
			}
			rec.recomp(12);
		}
	}
	
	private Calendrier.Livr clivr = null;

	public Calendrier.Livr calLivr() throws AppException {
		if (clivr == null) 
			clivr = CalendrierGAP.get(gap()).livr(gap(), codeLivr(), gac());
		if (clivr == null) {
			HTServlet.log.severe("CLIVR NULL gap:" + gap() + " codeLivr:" + codeLivr() + " gac:" + gac());
		}
		return clivr;
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

	public int phaseActuelle(boolean forAC, boolean jour) throws AppException {
		Calendrier.Livr clivr = calLivr();
		return clivr == null ? 0 : clivr.phaseActuelle(forAC, jour);
	}

	public static LivrC get(int gap, int livr, int gac) throws AppException {
		return (LivrC) Cell.get(GAP.lineOf(gap), GAP.colOfLivr(livr, gac), "LivrC");
	}

	public boolean updateReduc(int reduc, int fraisgap0) throws AppException {
		// prix PEUT être null !!!
		int ph = phaseActuelle(false, false);
		if (ph > 5)
			return false; // on ne duplique plus après archivage
		
		Reduc red = (Reduc) nodeByKey(keyOfReduc());
		if (red == null) {
			red = (Reduc) newCellNode("Reduc");
			red.insert();
		}
		int oldReduc = red.reduc;
		red.reduc(reduc);
		this.reduc = reduc;
		red.fraisgap0(fraisgap0);
		
		if (oldReduc == reduc)
			return false;
		
		List<CellNode> lst = nodesByKey(keyOfApPr2p());
		if (lst.size() == 0)
			return false;
		
		ToUpdate upd = new ToUpdate();		
		for (CellNode cnx : lst) {
			ApPr apPr = (ApPr)cnx;
			// recalcul des prix dans ApPr
			Prix y = getPrix(apPr.ap, apPr.pr);
			apPr.recalculPoidsPrix(upd, y);
			// recalcul des prix dans AcApPr
			for (CellNode cn : nodesByKey(keyOfAcApPr2p(apPr.ap, apPr.pr)))
				((AcApPr) cn).recalculPoidsPrix(upd, y);
		}
		return upd.finalUpdate(false);
	}

	public boolean updatePrixExcl(int prod, Catalogue.Prix prix, boolean isExcl) throws AppException {
		// prix PEUT être null !!!
		int ph = phaseActuelle(false, false);
		if (ph > 5)
			return false; // on ne duplique plus après archivage
		ExclC ex = (ExclC) nodeByKey(keyOfExclC());
		if (ex == null) {
			ex = (ExclC) nodeByKey(keyOfExclC());
			if (ex == null) {
				ex = (ExclC) newCellNode("ExclC");
				ex.insert();
			}
		}

		if (!nouvelle && !ex.isLocal() && ph < 1)
			/*  
			 * on évite de dupliquer les livrC nouvelles (vierges),
			 * qui n'ont jamais été dupliquées
			 * et qui sont avant ouverture des commandes 
			*/
			return false;
		
		/* 
		 * on duplique quand ça a déjà été dupliqué au moins une fois 
		 * même avant ouverture (l'ouverture a pu être reculée après des premières duplications)
		*/
		
		int ap = prod / 10000;
		int pr = prod % 10000;
		
		Prix prx = (Prix) nodeByKey(keyOfPrix(prod));
		boolean b1 = prx == null || !prx.samePrix(prix); // prix dispo poids qmax changé 
		boolean b2 = ex == null || (isExcl && !ex.prods.contains(prod)) || (!isExcl && ex.prods.contains(prod));

		if (b1 || b2) {
			// au moins un changement de prix ou d'exclusion a eu lieu
			Prix y = getPrix(ap, pr);
			if (b1)
				y.dupPrix(prix);
			ToUpdate upd = new ToUpdate();
			// recalcul des prix dans ApPr
			ApPr apPr = (ApPr) nodeByKey(keyOfApPr1(ap, pr));
			if (apPr != null) 
				apPr.recalculPoidsPrix(upd, y);
			// recalcul des prix dans AcApPr
			for (CellNode cn : nodesByKey(keyOfAcApPr2p(ap, pr)))
				((AcApPr) cn).recalculPoidsPrix(upd, y);
			return upd.finalUpdate(false);
		}
		return false;
	}

	ExclC ex = null;
	private void setupPrix() throws AppException{
		ex.setLocal();
		Catalogue cat = Catalogue.get(this.gap());
		ex.prods.clear();
		ex.prods.addAll(cat.getAllExclProd(this.codeLivr(), this.gac()));
		List<IPrix> lp = cat.getAllPrix(this.codeLivr());
		for(IPrix p : lp){
			Prix prix = (Prix) nodeByKey(keyOfPrix(p.prod()));
			if (prix == null) {
				try {
					prix = (Prix) newCellNode("Prix");
				} catch (AppException e) {}
				prix.prod = p.prod();
				prix.insert();
			}
			prix.dupPrix(p);
		}
	}
	
	private Prix getPrix(int ap, int pr) throws AppException {
		if (ex == null) {
			ex = (ExclC) nodeByKey(keyOfExclC());
			if (ex == null) {
				ex = (ExclC) newCellNode("ExclC");
				ex.insert();
			}
		}
		int prod = (ap * 10000) + pr;
		Prix prix = (Prix) nodeByKey(keyOfPrix(prod));
		if (!ex.isLocal() || prix == null || prix.isFake()) {
			setupPrix();
			prix = (Prix) nodeByKey(keyOfPrix(prod));
		}
		if (prix == null) {
			try {
				prix = (Prix) newCellNode("Prix");
			} catch (AppException e) {}
			prix.prod = prod;
			prix.insert();
		}
		return prix;
	}

	@HTCN(id = 9, single = 'R') public class Recomp extends CellNode {
		@HT(id = 2) private int recomp;

		public void recomp(int value) {
			if (w(this.recomp, value)) this.recomp = value;
		}

	}

	@HTCN(id = 20, single = 'T') public class Reduc extends CellNode {
		@HT(id = 2) private int reduc;

		public void reduc(int value) {
			if (w(this.reduc, value)) this.reduc = value;
		}

		@HT(id = 3) private int fraisgap0;

		public void fraisgap0(int value) {
			if (w(this.fraisgap0, value)) this.fraisgap0 = value;
		}

	}

	@HTCN(id = 1) public class Prix extends CellNode implements IPrix {
		
		public int poidsDePrix(int prix) {
			if (pu == 0)
				return 0;
			// prix * 1000 / pu
			double temp = ((double) prix * 1000.0 / (double) puR()) + 0.5;
			return (int) temp;
		}

		public int prixDePoids(int poids) {
			if (poids == 0)
				return 0;
			// poids * pu / 1000
			double temp = ((double) poids * (double) puR() / 1000.0) + 0.5;
			return (int) temp;
		}

		public int poidsDeQte(int qte){
			return dispo == 0 ? 0 : qte * poids;
		}

		public int prixDeQte(int qte){
			return dispo == 0 ? 0 : qte * puR();
		}

		public int qteDePoids(int p){
			if (poids == 0)
				return 1;
			if (p == 0)
				return 0;
			int q = (int) Math.round(((double) p) / ((double) poids));
			return q == 0 ? 1 : q;
		}

		private boolean samePrix(IPrix src) throws AppException {
			return dispo == src.dispo() && pu == src.pu() && poids == src.poids() && qmax == src.qmax() && parite == src.parite();
		}

		private void dupPrix(IPrix src) throws AppException {
			dispo(src.dispo());
			pu(src.pu());
			poids(src.poids());
			qmax(src.qmax());
			parite(src.parite());
			dhChange(src.version());
		}

		@Override public String[] keys() {
			return AS.as(keyOfPrix(prod));
		}

		@HT(id = 2) public int prod;

		public int prod() {
			return prod;
		}

		public int ap() {
			return prod / 10000;
		}

		public int pr() {
			return prod % 10000;
		}

		public int typePrix() {
			return prod % 10;
		}

		@HT(id = 3) private int dispo;

		public int dispo() {
			return dispo;
		}

		public boolean dispo(int value) {
			if (w(this.dispo, value)) {
				this.dispo = value;
				return true;
			}
			return false;
		}

		boolean isFake() {
			return pu == 0 || poids == 0;
		}
		
		@HT(id = 4) private int pu;

		public int puR() {
			return reduc == 0 ? pu : (pu * (100 - reduc)) / 100;
		}
		
		public int pu() {
			return pu;
		}

		public boolean pu(int value) {
			if (w(this.pu, value)) {
				this.pu = value;
				return true;
			}
			return false;
		}

		@HT(id = 5) private int poids;

		public int poids() {
			return poids;
		}

		public boolean poids(int value) {
			if (w(this.poids, value)) {
				this.poids = value;
				return true;
			}
			return false;
		}

		@HT(id = 8) private int qmax;

		public int qmax() {
			return qmax;
		}

		public boolean qmax(int value) {
			if (w(this.qmax, value)) {
				this.qmax = value;
				return true;
			}
			return false;
		}

		@HT(id = 10) private int parite;

		public int parite() {
			return parite;
		}

		public boolean parite(int value) {
			if (w(this.parite, value)) {
				this.parite = value;
				return true;
			}
			return false;
		}

		@HT(id = 11) private long dhChange;

		public long dhChange() {
			return dhChange;
		}

		public boolean dhChange(long value) {
			if (w(this.dhChange, value)) {
				this.dhChange = value;
				return true;
			}
			return false;
		}

	}

	@HTCN(id = 2, single = 'X') public class ExclC extends CellNode {
		@HT(id = 2) private ArrayInt prods;
		
		public ArrayInt ArrayInt() {
			return prods;
		}

		@HT(id = 3) private int local;

		public boolean isLocal(){
			return this.local == 1;
		}
		
		public void setLocal() {
			if (w(this.local, 1)) this.local = 1;
		}

	}

	private class ToUpdate {
		LinkedList<ApPr> lstApPr;
		LinkedList<AcAp> lstAcAp;
		LinkedList<Ap> lstAp1; // agrégat de ApPr
		LinkedList<Ap> lstAp2; // agrégat de AcAp
		LinkedList<Ap> lstAp3; // recopie de Ap dans LivrP
		LinkedList<Ac> lstAc;
		Gac gacAp = null;
		LivrP livrP = null;
		LivrG livrG = null;

		void setApPr(int ap, int pr) throws AppException {
			if (lstApPr == null) lstApPr = new LinkedList<ApPr>();
			ApPr apPr = (ApPr) getApPr(ap, pr);
			if (!lstApPr.contains(apPr)) lstApPr.add(apPr);
		}

		void setAcAp(int ac, int ap) throws AppException {
			if (lstAcAp == null) lstAcAp = new LinkedList<AcAp>();
			AcAp acAp = getAcAp(ac, ap);
			if (!lstAcAp.contains(acAp)) lstAcAp.add(acAp);
		}

		void setAp1(int ap) throws AppException {
			if (lstAp1 == null) lstAp1 = new LinkedList<Ap>();
			Ap x = (Ap) getAp(ap);
			if (!lstAp1.contains(x)) lstAp1.add(x);
		}

		void setAp2(int ap) throws AppException {
			if (lstAp2 == null) lstAp2 = new LinkedList<Ap>();
			Ap x = (Ap) getAp(ap);
			if (!lstAp2.contains(x)) lstAp2.add(x);
		}

		void setAp3(int ap) throws AppException {
			if (lstAp3 == null) lstAp3 = new LinkedList<Ap>();
			Ap x = (Ap) getAp(ap);
			if (!lstAp3.contains(x)) lstAp3.add(x);
		}

		void setAc(int ac) throws AppException {
			if (lstAc == null) lstAc = new LinkedList<Ac>();
			Ac x = (Ac) getAc(ac);
			if (!lstAc.contains(x)) lstAc.add(x);
		}

		void setGacAp() throws AppException {
			if (gacAp == null) gacAp = getGac();
		}

		boolean finalUpdate(boolean updG) throws AppException {
//			// Recomp rec;
//			if (nouvelle) {
//				rec = (Recomp) cellDescr.newCellNode(livrC, "Recomp");
//				rec.recomp(10);
//				rec.insert();
//			} else {
//				rec = (Recomp) livrC.nodeByKey("R");
//				if (rec == null) { 
//					rec = (Recomp) cellDescr.newCellNode(livrC, "Recomp");
//					// recomp == 0
//					rec.insert();
//				}
//			}
			if (rec.recomp < 5){
				rec.recomp(5);
				for (CellNode cn : nodesByKey("D."))
					((AcAp) cn).recomp(this);
				for (CellNode cn : nodesByKey("G.")) {
					Ac x = (Ac) cn;
					x.sumAcAp(this);
					if (updG) {
						if (livrG == null) livrG = LivrG.get(gac());
						livrG.copyAc(gap(), codeLivr(), x);
					}
				}
				for (CellNode cn : nodesByKey("H.")){
					Ap x = (Ap) cn;
					x.sumAcAp(this);
					x.sumApPr(this);
					if (livrP == null) livrP = LivrP.get(gap());
					livrP.copyAp(LivrC.this.gac(), codeLivr(), x);
				}
				Gac x = getGac();
				x.sumAp(this);
				if (livrP == null) livrP = LivrP.get(gap());
				livrP.copyGac(LivrC.this.gac(), codeLivr(), x);
				if (updG) {
					if (livrG == null) livrG = LivrG.get(gac());
					livrG.copyGac(gap(), codeLivr(), x);
				}
				livrP.rebuildSG(codeLivr());
			}
			if (rec.recomp < 9){
				rec.recomp(9);
				for (CellNode cn : nodesByKey("A.")){
					AcApPr x = (AcApPr) cn;
					if (x.qte != 0) {
						ApPr y = (ApPr) nodeByKey(keyOfApPr1(x.ap, x.pr));
						x.setFlags(Flag.NONCHARGE, y.nonCharge());
					} else
						x.setFlags(Flag.NONCHARGE, false);
					if (x.hasChanged())
						this.setAcAp(x.ac, x.ap);
				}
				for (CellNode cn : nodesByKey("C.")){
					ApPr x = (ApPr) cn;
					x.setAll(null);
					if (hasChanged())
						this.setAp1(x.ap);
				}
			}
			if (rec.recomp < 10){
				rec.recomp(10);
				for (CellNode cn : nodesByKey("C.")){
					ApPr y = (ApPr) cn;
					y.setFlags(Flag.NONCHARGE, y.nonCharge());
					if (y.hasChanged())
						this.setAp1(y.ap);
				}
			}
			if (rec.recomp < 13){
				rec.recomp(13);
				for (CellNode cn : nodesByKey("C.")){
					ApPr x = (ApPr) cn;
					x.setAll(null);
					if (hasChanged())
						this.setAp1(x.ap);
				}
			}
			
			boolean updGTodo = false;

			if (lstApPr != null) for (ApPr x : lstApPr)
				x.sumAcApPr(this);

			if (lstAcAp != null) for (AcAp x : lstAcAp)
				x.sumAcApPr(this);

			if (lstAp1 != null) for (Ap x : lstAp1)
				x.sumApPr(this);

			if (lstAp2 != null) for (Ap x : lstAp2)
				x.sumAcAp(this);
			
			if (lstAc != null) 
				for (Ac x : lstAc) {
					x.sumAcAp(this);
					updGTodo = true;
					if (updG) {
						if (livrG == null) livrG = LivrG.get(gac());
						livrG.copyAc(gap(), codeLivr(), x);
					}
				}
			
			if (gacAp != null) {
				gacAp.sumAp(this);
				if (gacAp.hasChanged()) {
					// recopie dans LivrP
					if (livrP == null) livrP = LivrP.get(gap());
					livrP.copyGac(LivrC.this.gac(), codeLivr(), gacAp);
					updGTodo = true;
					if (updG) {
						if (livrG == null) livrG = LivrG.get(gac());
						livrG.copyGac(gap(), codeLivr(), gacAp);
					}
				}
			}

			if (lstAp2 != null) for (Ap x : lstAp2)
				if (x.hasChanged()) {
					if (lstAp1 == null) lstAp1 = new LinkedList<Ap>();
					if (!lstAp1.contains(x)) lstAp1.add(x);
				}
			if (lstAp3 != null) for (Ap x : lstAp3)
				if (x.hasChanged()) {
					if (lstAp1 == null) lstAp1 = new LinkedList<Ap>();
					if (!lstAp1.contains(x)) lstAp1.add(x);
				}
			if (lstAp1 != null) {
				boolean todo = false;
				for (Ap x : lstAp1)
					if (x.hasChanged()) {
						if (livrP == null) livrP = LivrP.get(gap());
						livrP.copyAp(LivrC.this.gac(), codeLivr(), x);
						todo = true;
					}
				if (todo) livrP.rebuildSG(codeLivr());
			}
			
			return updGTodo;
		}
	}

	AcApPr getAcApPrX(int ac, int ap, int pr) throws AppException {
		return (AcApPr) nodeByKey(keyOfAcApPr1(ac, ap, pr));
	}

	private AcApPr getAcApPr(int ac, int ap, int pr) throws AppException {
		AcApPr acApPr = (AcApPr) nodeByKey(keyOfAcApPr1(ac, ap, pr));
		if (acApPr == null) {
			acApPr = (AcApPr) newCellNode("AcApPr");
			acApPr.ac = ac;
			acApPr.ap = ap;
			acApPr.pr = pr;
			acApPr.insert();
		}
		return acApPr;
	}

	ApPr getApPrX(int ap, int pr) throws AppException {
		return (ApPr) nodeByKey(keyOfApPr1(ap, pr));
	};

	private ApPr getApPr(int ap, int pr) throws AppException {
		ApPr apPr = (ApPr) nodeByKey(keyOfApPr1(ap, pr));
		if (apPr == null) {
			apPr = (ApPr) newCellNode("ApPr");
			apPr.ap = ap;
			apPr.pr = pr;
			apPr.insert();
		}
		return apPr;
	}

	private AcAp getAcAp(int ac, int ap) throws AppException {
		AcAp acAp = (AcAp) nodeByKey(keyOfAcAp1(ac, ap));
		if (acAp == null) {
			acAp = (AcAp) newCellNode("AcAp");
			acAp.ac = ac;
			acAp.ap = ap;
			acAp.insert();
		}
		return acAp;
	}

	private Ap getAp(int ap) throws AppException {
		Ap x = (Ap) nodeByKey(keyOfAp1(ap));
		if (x == null) {
			x = (Ap) newCellNode("Ap");
			x.ap = ap;
			x.insert();
		}
		return x;
	}

	private Ac getAc(int ac) throws AppException {
		Ac x = (Ac) nodeByKey(keyOfAc1(ac));
		if (x == null) {
			x = (Ac) newCellNode("Ac");
			x.ac = ac;
			x.insert();
		}
		return x;
	}

	private Gac getGac() throws AppException {
		Gac x = (Gac) nodeByKey(keyOfGac());
		if (x == null) {
			x = (Gac) newCellNode("Gac");
			x.insert();
		}
		return x;
	}

	@HTCN(id = 10) public class AcApPr extends CellNode {

		private void razQte2(ToUpdate upd) throws AppException {
			qte(0);
			qbl(true);
			poids(0);
			prix(0);
			setAll();
			lprix.clear();
			if (hasChanged()) {
				upd.setApPr(ap, pr);
				upd.setAcAp(ac, ap);
			}
		}

		private MFA commandeDistribution(ToUpdate _toUpd, int _phase, int _qte, int _poids,
				boolean fromAC, boolean ac1) throws AppException {
			Prix y = locPrix();
			if (y.isFake())
				return MFA.CDEX8;
			
			switch (typePrix()) {
			case 1: {
				if (_qte < 0) return MFA.CDEX7b;
				if (_poids != -1) return MFA.CDEX9;
				// if (_qte != 0 && indispo) return MFA.CDEX7d;
				if (fromAC) {
					qteS(_qte);
					if (!qbl()) qte(_qte);
				} else {
					if (ac1) qteS(_qte);
					qte(_qte);
					qbl(true);
				}
				poids(y.poidsDeQte(qte));
				prix(y.prixDeQte(qte));
				break;
			}
			case 2: {
				if (_poids != -1) return MFA.CDEX9;
				if (_qte < 0) return MFA.CDEX7b;
				if (_phase == 1) {
					// if (_qte != 0 && indispo) return MFA.CDEX7d;
					if (fromAC) {
						qteS(_qte);
						if (!qbl()) qte(_qte);
					} else {
						if (ac1) qteS(_qte);
						qte(_qte);
						qbl(true);
					}
					poids(y.poidsDeQte(qte));
					prix(y.prixDePoids(poids));
					// prix(-poids * pu / 1000);
				} else {
					if (!fromAC) {
						if (ac1) qteS(_qte);
						qte(_qte);
						qbl(true);
						if (lprix.size() == 0) {
							poids(y.poidsDeQte(qte));
							prix(y.prixDePoids(poids));
						}
					}
				}
				break;
			}
			case 3: {
				if (_phase == 1) {
					if (_poids != -1) return MFA.CDEX9b;
					if (_qte == -1) return MFA.CDEX7b;
					if (fromAC) {
						qteS(_qte);
						if (!qbl()) qte(_qte);
					} else {
						if (ac1) qteS(_qte);
						qte(_qte);
						qbl(true);
					}
					poids(y.poidsDeQte(qte));
					prix(y.prixDePoids(poids));
					// prix(-poids * pu / 1000);
				} else {
					if (_poids == -1 && _qte == -1) return MFA.CDEX9d;
					qbl(true);
					if (_qte != -1) {
						qte(_qte);
						if (_poids != -1) {
							poids(_poids);
							prix(y.prixDePoids(poids));
						} else {
							poids(y.poidsDeQte(qte));
							prix(y.prixDePoids(poids));
						}
					} else {
						poids(_poids);
						prix(y.prixDePoids(poids));
						qte(y.qteDePoids(poids));
					}
				}
				break;
			}
			}
			setAll();
			if (hasChanged()) {
				_toUpd.setApPr(ap, pr);
				_toUpd.setAcAp(ac, ap);
			}
			return null;
		}
		
		public void setNonCharge(){
			if (qte != 0) {
				ApPr y = (ApPr) nodeByKey(keyOfApPr1(ap, pr));
				if (y != null && y.nonCharge()) {
					setFlags(Flag.NONCHARGE, true);
					return;
				}
			}
			setFlags(Flag.NONCHARGE, false);
		}

		private void setAll() throws AppException {
			int qmax = locPrix().qmax();
			setNonCharge();
			setFlags(Flag.FRUSTRATION, (qteS != 0 && qte < qteS));
			setFlags(Flag.QMAX, (qmax != 0 && qte > qmax));
			setNblg();
			if (typePrix() == 2) setFlags(Flag.PAQUETSAC, (lprix.size() != qte));
		}

		private void recalculPoidsPrix(ToUpdate upd, Prix y) throws AppException {
			if (y.dispo() == 0){
				poids(0);
				prix(0);
			} else {
				switch (typePrix()) {
				case 1: {
					poids(y.poidsDeQte(qte));
					prix(y.prixDeQte(qte));
					break;
				}
				case 2: {
					if (lprix.size() != 0)
						poids(y.poidsDePrix(prix));
					else { // estimé
						poids(y.poidsDeQte(qte));
						prix(y.prixDePoids(poids));
					}
					break;
				}
				case 3: {
					prix(y.prixDePoids(poids));
					break;
				}
				}
			}
			this.setAll();
			if (hasChanged()) {
				upd.setApPr(ap, pr);
				upd.setAcAp(ac, ap);
			}
		}

		@Override public String[] keys() {
			return AS.as(keyOfAcApPr1(ac, ap, pr), keyOfAcApPr2(ac, ap, pr));
		};

		@HT(id = 2) public int ac;

		@HT(id = 3) public int ap;

		public boolean is1() {
			return ap == 1;
		}

		public boolean isPaiementDirect() {
			return ap == 1 || ap >= 100;
		}

		public boolean isPaiementGAP() {
			return ap > 1 && ap < 100;
		}

		@HT(id = 4) public int pr;

		public int pr() {
			return pr;
		}

		public int prod(){
			return ap * 10000 + pr;
		}
		
		public int typePrix() {
			return pr % 10;
		}

		@HT(id = 9) public int qbl;

		public boolean qbl() {
			return qbl == 2;
		}

		public void qbl(boolean value) {
			if (w(this.qbl, value ? 2 : 0)) this.qbl = value ? 2 : 0;
		}

		@HT(id = 10) public int qte;

		public int qte() {
			return qte;
		}

		public void qte(int value) {
			if (w(this.qte, value)) this.qte = value;
			if (typePrix() == 2 && value == 0 && !lprix.isEmpty()) lprix.clear();
		}

		@HT(id = 11) public int qteS;

		public int qteS() {
			return qteS;
		}

		public void qteS(int value) {
			if (w(this.qteS, value)) this.qteS = value;
			setNblg();
		}

		@HT(id = 14) public int poids;

		public int poids() {
			return poids;
		}

		public void poids(int value) {
			if (w(this.poids, value)) this.poids = value;
		}

		@HT(id = 18) public int prix;

		public int prix() {
			return prix;
		}

		public void prix(int value) {
			if (w(this.prix, value)) this.prix = value;
		}

		@HT(id = 19) private ArrayInt lprix;

		public ArrayInt lprix() {
			return lprix;
		}

		private Prix locPrix = null;

		private Prix locPrix() throws AppException {
			if (locPrix == null) locPrix = getPrix(ap, pr);
			return locPrix;
		}

		public void lprix(ToUpdate _upd, Collection<Integer> _lprix) throws AppException {
			Prix y = locPrix();
			if (y.isFake())
				throw new AppException(MFA.CDEX8);

			ArrayList<Integer> lst = null;
			int prt = 0;
			if (_lprix != null) {
				lst = new ArrayList<Integer>(_lprix.size());
				for (int v : _lprix)
					if (v % 1000 == ac) {
						int p = v / 1000;
						prt = prt + p;
						lst.add(p);
					}
			}
			if (lst != null && lst.size() != 0) {
				AS.sort(lst);
				if (!lst.equals(lprix)) {
					lprix.clear();
					lprix.addAll(lst);
					prix(prt);
					poids(y.poidsDePrix(prt));
				}
			} else {
				lprix.clear();
				poids(y.poidsDeQte(-qte));
				prix(y.prixDePoids(-poids));
			}
			setAll();
			if (hasChanged()) {
				_upd.setApPr(ap, pr);
				_upd.setAcAp(ac, ap);
			}
		}

		@HT(id = 30) public int nblg;

		public int nblg() {
			return nblg;
		}

		public void setNblg() {
			int value = qteS == 0 && qte == 0 ? 0 : 1;
			if (w(this.nblg, value)) this.nblg = value;
		}

		@HT(id = 31) public int flags;

		public int flags() {
			return flags;
		}

		public void setFlags(Flag f, boolean value) {
			int nv = setFlag(flags, f, value);
			if (w(this.flags, nv)) this.flags = nv;
		}

	}

	@HTCN(id = 11) public class ApPr extends Noyau1 {
		private void razDistr(ToUpdate _upd) throws AppException{
			qteD(0);
			poidsD(0);
			prixD(0);
			decharge(1);
			lprix.clear();
			setAll(_upd);
			if (hasChanged()) _upd.setAp1(ap);
		}
		
		private MFA majLprix2(ToUpdate _upd, int _phase, List<Integer> _lprix, 
				List<Integer> _lqte, boolean fromAP, boolean ac1) throws AppException {
			if (!fromAP && _phase < 2)
				return MFA.CDEX7h;
			
			if (_lprix != null) {
				ArrayInt lp = fromAP ? lprixC : lprix;
				if (fromAP) {
					if (lprix.size() != 0 && lprixC.size() == 0)
						lprixByGac(1);
					lp.clear();
					for (int i = 0; i < _lprix.size(); i++) {
						int x = _lprix.get(i);
						int prix = x / 1000;
						lp.add(prix * 1000);
					}
					qteC(lprixC.size());
					prixC(prixCExact());
					poidsC(poidsCExact());
					charge(1);
				} else {
					lp.clear();
					LinkedList<Integer> lac = new LinkedList<Integer>();
					for (int i = 0; i < _lprix.size(); i++) {
						int x = _lprix.get(i);
						int ac = x % 1000;
						if (ac != 0 && !lac.contains(ac)) lac.add(ac);
						lp.add(x);
					}
					qteD(lprix.size());
					prixD(prixDExact());
					poidsD(poidsDExact());
					decharge(1);
					for (CellNode cn : nodesByKey(keyOfAcApPr2p(ap, pr))) {
						AcApPr x = (AcApPr) cn;
						x.lprix(_upd, lprix);
						int j = lac.indexOf(x.ac);
						if (j != -1) lac.remove(j);
					}
					for (int ac : lac)
						getAcApPr(ac, ap, pr).lprix(_upd, lprix);
					lprixByGac(1);
				}
			}
			if (_lqte != null && !fromAP) {
				for (int i = 0; i < _lqte.size(); i++) {
					int x = _lqte.get(i);
					int ac = x % 1000;
					int qte = x / 1000;
					MFA res = getAcApPr(ac, ap, pr).commandeDistribution(_upd, _phase, qte, -1, false, ac1);
					if (res != null)
						return res;
				}
			}
			setAll(_upd);
			if (hasChanged()) _upd.setAp1(ap);
			return null;
		}
		
		private MFA expeditionReception(ToUpdate _upd, int _phase, int _qte, int _poids, boolean fromAP) throws AppException {
			Prix y = locPrix();
			if (!fromAP && _phase < 2)
				return MFA.CDEX7h;
			if (typePrix() == 2 && fromAP && lprixC.size() != 0)
				return MFA.CDEX7a2;
			if (typePrix() == 1 && _qte == -1) 
				return MFA.CDEX7b;
			if (typePrix() == 1 && _poids != -1) 
				return MFA.CDEX9;
		
			if (typePrix() == 1) {
				if (_qte == 999) {
					if (fromAP) {
						qteC(0);
						poidsC(0);
						prixC(0);
						charge(0);
					} else {
						qteD(0);
						poidsD(0);
						prixD(0);
						decharge(0);
					}
				} else {
					if (fromAP) {
						qteC(_qte);
						poidsC(y.poidsDeQte(_qte));
						prixC(y.prixDeQte(_qte));
						charge(1);
					} else {
						qteD(_qte);
						poidsD(y.poidsDeQte(_qte));
						prixD(y.prixDeQte(_qte));
						decharge(1);
					}
				}
			} else {
				if (_poids == 99999 || _qte == 999){
					if (fromAP) {
						qteC(0);
						poidsC(0);
						prixC(0);
						charge(0);
					} else {
						qteD(0);
						poidsD(0);
						prixD(0);
						decharge(0);
					}												
				} else if (_poids != -1 || _qte != -1) {
					if (_qte == -1){
						// qte non donnee, seul le poids reel est donne
						if (fromAP) {
							// if (charge == 0)
							qteC(y.qteDePoids(_poids));
							poidsC(_poids);
							prixC(y.prixDePoids(_poids));
							charge(1);
						} else {
							// if (decharge == 0)
							qteD(y.qteDePoids(_poids));
							poidsD(_poids);
							prixD(y.prixDePoids(_poids));
							decharge(1);
						}
					} else {
						// qte réelle donnée (poids donné ou non)
						if (fromAP) {
							charge(1);
							qteC(_qte);
						} else {
							decharge(1);
							qteD(_qte);
						}
						if (_poids == -1) {
							// poids non donné
							if (fromAP) {
								// if ( charge == 0) {
									poidsC(y.poidsDeQte(_qte));
									prixC(y.prixDePoids(poidsC));
								// }
							} else {
								// if (decharge == 0) {
									poidsD(y.poidsDeQte(_qte));
									prixD(y.prixDePoids(poidsD));
								// }
							}								
						} else {
							// poids reel donne
							if (fromAP) {
								poidsC(_poids);
								prixC(y.prixDePoids(_poids));
							} else {
								poidsD(_poids);
								prixD(y.prixDePoids(_poids));
							}
						}
					}
				}
			}
			setAll(_upd);
			return null;
		}

		private void recalculPoidsPrix(ToUpdate upd, Prix y) throws AppException {
			if (y.dispo() == 0){
				poidsC(0);
				poidsD(0);
				prixC(0);
				prixD(0);
			} else {
				switch (typePrix()) {
				case 1: {
					poidsC(y.poidsDeQte(qteC));
					poidsD(y.poidsDeQte(qteD));
					prixC(y.prixDeQte(qteC));
					prixD(y.prixDeQte(qteD));
					break;
				}
				case 2: {
					if (prixC != prixCExact())
						prixC(y.prixDePoids(poidsC));
					if (prixD != prixExact())
						prixD(y.prixDePoids(poidsD));
					break;
				}
				case 3: {
					prixC(y.prixDePoids(poidsC));
					prixD(y.prixDePoids(poidsD));
					break;
				}
				}
			}
			if (hasChanged()) upd.setAp1(ap);
		}

		private void sumAcApPr(ToUpdate upd) throws AppException {
			int qte = 0;
			int qteS = 0;
			int poids = 0;
			int prix = 0;
			int nblg = 0;
			int f = 0;
			for (CellNode cn : nodesByKey(keyOfAcApPr2p(ap, pr))) {
				AcApPr x = (AcApPr) cn;
				qte += x.qte;
				qteS += x.qteS;
				poids += Math.abs(x.poids);
				prix += x.prix;
				nblg += x.nblg;
				f = f | x.flags;
			}
			qte(qte);
			qteS(qteS);
			poids(poids);
			prix(prix);
			nblg(nblg);
			unionAcApPrFlags(f);
			setAll(null);
			if (hasChanged()) upd.setAp1(ap);
		}

		private Prix locPrix = null;

		private Prix locPrix() throws AppException {
			if (locPrix == null) ;
			locPrix = getPrix(ap, pr);
			return locPrix;
		}

		@Override public String[] keys() {
			return AS.as(keyOfApPr1(ap, pr));
		};

		@HT(id = 3) public int ap;

		public boolean is1() {
			return ap == 1;
		}

		public boolean isPaiementDirect() {
			return ap == 1 || ap >= 100;
		}

		public boolean isPaiementGAP() {
			return ap > 1 && ap < 100;
		}

		@HT(id = 4) public int pr;

		public int pr() {
			return pr;
		}

		public int typePrix() {
			return pr % 10;
		}

		public int prod(){
			return (ap * 10000) + pr;
		}
		
		@HT(id = 10) public int qte;

		public int qte() {
			return qte;
		}

		public void qte(int value) {
			if (w(this.qte, value)) this.qte = value;
		}

		@HT(id = 11) public int qteS;

		public int qteS() {
			return qteS;
		}

		public void qteS(int value) {
			if (w(this.qteS, value)) this.qteS = value;
		}

		@HT(id = 12) public int qteC;

		public int qteC() {
			return qteC == -1 ? 0 : qteC;
		}
		
		public void qteC(int value) {
			if (w(this.qteC, value)) this.qteC = value;
		}

		@HT(id = 13) public int qteD;

		public int qteD() {
			return qteD == -1 ? 0 : qteD;
		}

		public boolean nonCharge(){
			return qte != 0 && qteC == 0 && qteD == 0 && lprixC.size() == 0 && lprix.size() == 0;
		}
		
		public int qteT() {
			if (qteD != 0) return qteD == -1 ? 0 : qteD;
			if (qteC != 0) return qteC == -1 ? 0 : qteC;
			return qte;
		}

		public void qteD(int value) {
			if (w(this.qteD, value)) this.qteD = value;
		}

//		@HT(id = 15) public int pdef;
//
//		public int pdef() {
//			return pdef;
//		}
//
//		public void pdef(int value) {
//			if (w(this.pdef, value)) this.pdef = value;
//		}

		public int poidsT(){
			if (poidsD != 0)
				return poidsD > 0 ? poidsD : -poidsD;
			if (poidsC != 0)
				return poidsC > 0 ? poidsC : -poidsC;
			return poids > 0 ? poids : -poids;
		}
		
		@HT(id = 24) public int lprixByGac;

		public int lprixByGac() {
			return lprixByGac;
		}

		public void lprixByGac(int value) {
			if (w(this.lprixByGac, value)) this.lprixByGac = value;
		}

		@HT(id = 25) public int charge;

		public int charge() {
			return charge;
		}

		public void charge(int value) {
			if (w(this.charge, value)) this.charge = value;
		}

		@HT(id = 26) public int decharge;

		public int decharge() {
			return decharge;
		}

		public void decharge(int value) {
			if (w(this.decharge, value)) this.decharge = value;
		}

		@HT(id = 22) private ArrayInt lprix;

		public ArrayInt lprix() {
			return lprix;
		}

		public void lprix(Collection<Integer> value) {
			AS.sort(value, lprix);
		}

		public int prixExact() {
			int pr = 0;
			for (int p : lprix)
				pr = pr + (p / 1000);
			return pr;
		}

		public int poidsExact() throws AppException{
			Prix y = locPrix();
			int po = 0;
			for (int p : lprix)
				po += y.poidsDePrix(p / 1000);
			return po;
		}
		
		public void copyLprixCLprix(){
			lprix.clear();
			for (int i : lprixC)
				lprix.add(i);
		}
		
		@HT(id = 23) private ArrayInt lprixC;

		public void setLprixC() {
			if (AS.copyIf(lprixC, lprix)) w();
		}

		public int prixCExact() {
			int pr = 0;
			for (int p : lprixC)
				pr = pr + (p / 1000);
			return pr;
		}

		public int poidsCExact() throws AppException{
			Prix y = locPrix();
			int po = 0;
			for (int p : lprixC)
				po += y.poidsDePrix(p / 1000);
			return po;
		}

		public int prixDExact() {
			int pr = 0;
			for (int p : lprix)
				pr = pr + (p / 1000);
			return pr;
		}

		public int poidsDExact() throws AppException{
			Prix y = locPrix();
			int po = 0;
			for (int p : lprix)
				po += y.poidsDePrix(p / 1000);
			return po;
		}
		

//		private int[] qpmC() throws AppException{
//			Prix y = locPrix();
//			int[] qpm = new int[3];
//			
//			if (charge == 0) {
//				qpm[0] = 0;
//				qpm[1] = 0;
//				qpm[2] = 0;
//			} else if (qteC != 0) {
//				qpm[0] = qteC;
//				switch (typePrix()) {
//				case 1 : {
//					qpm[1] = y.poidsDeQte(qpm[0]);
//					qpm[2] = y.prixDeQte(qpm[0]);
//					break;
//				}
//				case 2 : {
//					if (poidsC == 0) {
//						if (lprixC.size() != 0){
//							qpm[1] = poidsCExact();
//							qpm[2] = prixCExact();
//						} else {
//							qpm[1] = y.poidsDeQte(qpm[0]);
//							qpm[2] = y.prixDePoids(qpm[1]);
//						}
//					} else {
//						qpm[1] = poidsC;
//						qpm[2] = y.prixDePoids(qpm[1]);						
//					}
//					break;
//				}
//				case 3 : {
//					if (poidsC == 0) {
//						qpm[1] = y.poidsDeQte(qpm[0]);
//						qpm[2] = y.prixDePoids(qpm[1]);
//					} else {
//						qpm[1] = poidsC;
//						qpm[2] = y.prixDePoids(qpm[1]);						
//					}
//					break;
//				}
//				}
//			} else {
//				// qteC inconnue
//				qpm[0] = qte;
//				qpm[1] = y.poidsDeQte(qpm[0]);
//				if (typePrix() == 1)
//					qpm[2] = y.prixDeQte(qpm[0]);
//				else
//					qpm[2] = y.prixDePoids(qpm[1]);
//			}
//			return qpm;
//		}
//
//		private int[] qpmD() throws AppException{
//			Prix y = locPrix();
//			int[] qpm = new int[3];
//			if (decharge == 0) {
//				qpm[0] = 0;
//				qpm[1] = 0;
//				qpm[2] = 0;
//			} else if (qteD != 0) {
//				qpm[0] = qteD;
//				switch (typePrix()) {
//				case 1 : {
//					qpm[1] = y.poidsDeQte(qpm[0]);
//					qpm[2] = y.prixDeQte(qpm[0]);
//					break;
//				}
//				case 2 : {
//					if (poidsD == 0) {
//						if (lprix.size() != 0){
//							qpm[1] = poidsExact();
//							qpm[2] = prixExact();
//						} else {
//							qpm[1] = y.poidsDeQte(qpm[0]);
//							qpm[2] = y.prixDePoids(qpm[1]);
//						}
//					} else {
//						qpm[1] = poidsD;
//						qpm[2] = y.prixDePoids(qpm[1]);						
//					}
//					break;
//				}
//				case 3 : {
//					if (poidsD == 0) {
//						qpm[1] = y.poidsDeQte(qpm[0]);
//						qpm[2] = y.prixDePoids(qpm[1]);
//					} else {
//						qpm[1] = poidsD;
//						qpm[2] = y.prixDePoids(qpm[1]);						
//					}
//					break;
//				}
//				}
//			} else {
//				// qteD inconnue
//				qpm[0] = qte;
//				qpm[1] = y.poidsDeQte(qpm[0]);
//				if (typePrix() == 1)
//					qpm[2] = y.prixDeQte(qpm[0]);
//				else
//					qpm[2] = y.prixDePoids(qpm[1]);
//			}
//			return qpm;
//		}

		private int epTransport() throws AppException{
			switch (typePrix()){
			case 1 : {
				if (qteC == 0 || qteD == 0)
					return 0;
				int qc = qteC == - 1 ? 0 : qteC;
				int qd = qteD == - 1 ? 0 : qteD;
				return qc > qd ? 1 : (qc < qd ? -1 : 0);
			}
			case 2 : {
				if (qteC == 0 && lprixC.size() == 0)
					return 0;
				if (qteD == 0 && lprix.size() == 0)
					return 0;
				int qc = qteC == - 1 ? 0 : (qteC != 0 ? qteC : lprixC.size());
				int qd = qteD == - 1 ? 0 : (qteD != 0 ? qteD : lprix.size());
				if (qc > qd)
					return 1;
				if (qc < qd)
					return -1;
				int pc = poidsC < 0 ? -poidsC : poidsC;
				if (pc == 0)
					pc = poidsCExact();
				int pd = poidsD < 0 ? -poidsD : poidsD;
				if (pd == 0)
					pd = poidsExact();
				if (pc > pd * 1.05)
					return 1;
				if (pc < pd * 0.95)
					return -1;
				return 0;
			}
			case 3 : {
				if (qteC == 0 || qteD == 0)
					return 0;
				int qc = qteC == - 1 ? 0 : qteC;
				int qd = qteD == - 1 ? 0 : qteD;
				if (qc > qd)
					return 1;
				if (qc < qd)
					return -1;
				int pc = poidsC < 0 ? -poidsC : poidsC;
				int pd = poidsD < 0 ? -poidsD : poidsD;
				if (pc > pd * 1.05)
					return 1;
				if (pc < pd * 0.95)
					return -1;
				return 0;
			}
			}
			return 0;
		}
		
		private boolean divPoidsLPC() throws AppException{
			if (qteC == 0)
				return false;
			int lps = lprixC.size();
			int qc = qteC();
			if (lps == 0)
				return qc != 0;
			if (qc != lps)
				return true;
			int pc = poidsC < 0 ? -poidsC : poidsC;
			int pe = poidsCExact();
			return pc < pe * 0.95 || pc > pe * 1.05; 
		}

		private boolean divPoidsLPD() throws AppException{
			if (qteD == 0)
				return false;
			int lps = lprix.size();
			int qc = qteD();
			if (lps == 0)
				return qc != 0;
			if (qc != lps)
				return true;
			int pc = poidsD < 0 ? -poidsD : poidsD;
			int pe = poidsExact();
			return pc < pe * 0.95 || pc > pe * 1.05; 
		}

		public void setAll(ToUpdate _upd) throws AppException {
			boolean nc = nonCharge();
			setFlags(Flag.NONCHARGE, nc);
			
			int parite = locPrix().parite;
			setFlags(Flag.PARITE, parite != 0 && qte % 2 != 0);
			
			int qx = qteT();
			// setFlags(Flag.DISTRIB, !nc && qx != qte());
			if (nc || qx == qte)
				setFlags(Flag.DISTRIB, false);
			else {
				if (typePrix() != 3)
					setFlags(Flag.DISTRIB, true);
				else {
					double pT = poidsT();
					double p = poids > 0 ? poids : -poids;
					setFlags(Flag.DISTRIB, (p < pT * 0.95 || p > pT * 1.05));
				}
			}
			
			int ep = epTransport();
			setFlags(Flag.EXCESTR, ep > 0);
			setFlags(Flag.PERTETR, ep < 0);
			
			if (typePrix() == 2) {
				boolean b1 = divPoidsLPC();
				boolean b2 = divPoidsLPD();
				setFlags(Flag.PAQUETSC, b1);
				setFlags(Flag.PAQUETSD, b2);
			}
			
			// normalisation qte poids prix C et D
			if (charge == 0){
				qteC(qte);
				prixC(prix);
				poidsC(poids);
			}
			if (decharge == 0){
				if (charge == 0){
					qteD(qte);
					prixD(prix);
					poidsD(poids);
				} else {
					qteD(qteC);
					prixD(prixC);
					poidsD(poidsC);
				}
			}
			
			if (_upd != null){
				if (hasChanged()) {
					for (CellNode cn : nodesByKey(keyOfAcApPr2p(ap, pr))) {
						AcApPr x = (AcApPr) cn;
						if (x.qte != 0)
							x.setFlags(Flag.NONCHARGE, nc);
						else
							x.setFlags(Flag.NONCHARGE, false);
						if (x.hasChanged())
							_upd.setAcAp(x.ac, x.ap);
					}
					_upd.setAp1(ap);
				}
			}
		}
	}
	
	@HTCN(id = 12) public class AcAp extends Livr.Ac {
		private MFA paiementChequeSuppl(ToUpdate _toUpd, int _cheque, 
				int _suppl, String _descr, String _intitule, Op op) throws AppException {
			if (_intitule != null) 
				intitule(_intitule);
			if (_cheque != -1) 
				cheque(_cheque);
			if (_suppl != Integer.MIN_VALUE) {
				suppl(_suppl);
				if (_suppl != 0) {
					if (_descr != null) 
						descr(_descr);
				} else descr(null);
			} else {
				if (suppl == 0)
					descr(null);
				else if (_descr != null) 
					descr(_descr);
			}

			if (suppl != 0 && descr == null) 
				throw new AppException(MFA.CDEX13x, op.err1());
				
			setBalance();
			if (hasChanged()) {
				_toUpd.setAc(ac);
				_toUpd.setAp2(ap);
			}
			return null;
		}

		private int getPayePour(int ami) {
			for (int x : amisPour)
				if (x % 1000 == ami)
					return x / 1000;
			return 0;
		}

		private int getPayePar(int ami) {
			for (int x : amisPar)
				if (x % 1000 == ami)
					return x / 1000;
			return 0;
		}

		private void setPayePar(int ami, int m){
			ArrayList<Integer> lst = new ArrayList<Integer>();
			int tot = 0;
			boolean b = false;
			for (int x : amisPar)
				if (x % 1000 == ami) {
					b = true;
					if (m != 0) {
						lst.add(m * 1000 + ami);
						tot += m;
					}
				} else {
					tot += x / 1000;
					lst.add(x);
				}
			if (!b && m != 0) {
				lst.add(m * 1000 + ami);
				tot += m;
			}
			AS.sort(lst, amisPar);
			payePar(tot);
		}

		private void setPayePour(int ami, int m){
			ArrayList<Integer> lst = new ArrayList<Integer>();
			int tot = 0;
			boolean b = false;
			for (int x : amisPour)
				if (x % 1000 == ami) {
					b = true;
					if (m != 0) {
						lst.add(m * 1000 + ami);
						tot += m;
					}
				} else {
					tot += x / 1000;
					lst.add(x);
				}
			if (!b && m != 0) {
				lst.add(m * 1000 + ami);
				tot += m;
			}
			AS.sort(lst, amisPour);
			payePour(tot);
		}

		private MFA paiementParPour(ToUpdate _toUpd, int _ami, int _montant, boolean pour, Op op) 
				throws AppException {
			if (pour && getPayePour(_ami) == _montant && getPayePar(_ami) == 0)
				return null;
			if (!pour && getPayePar(_ami) == _montant && getPayePour(_ami) == 0)
				return null;
			
			AcAp ami = getAcAp(_ami, ap);
			
			if (_montant == 0){
				setPayePar(_ami, 0);
				setPayePour(_ami, 0);
				ami.setPayePar(ac,  0);
				ami.setPayePour(ac, 0);
			} else {			
				if (pour){
					setPayePar(_ami, 0);
					setPayePour(_ami, _montant);
					ami.setPayePar(ac,  _montant);
					ami.setPayePour(ac, 0);
				} else {
					setPayePar(_ami, _montant);
					setPayePour(_ami, 0);
					ami.setPayePar(ac,  0);
					ami.setPayePour(ac, _montant);				
				}
			}
			setBalance();
			if (hasChanged()) {
				_toUpd.setAc(ac);
				_toUpd.setAp2(ap);
			}
			ami.setBalance();
			if (ami.hasChanged()) {
				_toUpd.setAc(_ami);
				_toUpd.setAp2(ap);
			}
			return null;			
		}
		
		private void recomp(ToUpdate _toUpd) throws AppException {
			setBalance();
			if (hasChanged()) {
				_toUpd.setAc(ac);
				_toUpd.setAp2(ap);
			}
		}
		
		private void setPG(ToUpdate _toUpd) throws AppException {
			int pg = 0;
			for (CellNode cn : nodesByKey(keyOfAcApPr1ac(ac))) {
				AcApPr x = (AcApPr) cn;
				if (x.ap > 1 && x.ap < 100) pg += x.prix;
			}
			prixPG(pg);
			setBalance();
			if (hasChanged()) {
				_toUpd.setAc(ac);
				_toUpd.setAp2(ap);
			}
		}

		private void sumAcApPr(ToUpdate upd) throws AppException {
			int poids = 0;
			int prix = 0;
			int nblg = 0;
			int flags = 0;
			for (CellNode cn : nodesByKey(keyOfAcApPr1p(ac, ap))) {
				AcApPr x = (AcApPr) cn;
				poids += Math.abs(x.poids);
				prix += x.prix;
				nblg += x.nblg;
				flags = flags | x.flags;
			}
			poids(poids);
			prix(prix);
			nblg(nblg);
			flags(flags);
			setBalance();
			if (hasChanged()) {
				upd.setAp1(ap);
				upd.setAp2(ap);
				upd.setAc(ac);
			}
			if (isPaiementGAP()) {
				AcAp acAp = getAcAp(ac, 1);
				acAp.setPG(upd);
			}
		}

		private void setBalance() {
			if (!isPaiementDirect()) {
				regltFait(0);
				panierAtt(0);
				db(0);
				cr(0);
			} else {
				if (cheque != 0 || payePar != 0 || payePour != 0 || suppl != 0) {
					regltFait(1);
					int bal = prix + prixPG + suppl + payePour - (cheque + payePar);
					if (bal == 0) {
						db(0);
						cr(0);
					} else if (bal > 0) {
						db(bal);
						cr(0);
					} else {
						db(0);
						cr(-bal);
					}
				} else {
					regltFait(0);
					db(0);
					cr(0);
				}
				if (prix + prixPG != 0 && regltFait == 0)
					panierAtt(1);
				else
					panierAtt(0);
			}
		}

		@Override public String[] keys() {
//			return AS.as(keyOfAcAp1(ac, ap), keyOfAcAp2(ac, ap), keyOfAcAp3(ac, ap, ami));
			return AS.as(keyOfAcAp1(ac, ap), keyOfAcAp2(ac, ap));
		};

		@HT(id = 3) public int ap;

		public boolean is1() {
			return ap == 1;
		}

		public boolean isPaiementDirect() {
			return ap == 1 || ap >= 100;
		}

		public boolean isPaiementGAP() {
			return ap > 1 && ap < 100;
		}

		@HT(id = 5) public int ami;

		@HT(id = 45) private ArrayInt amisPour;

		public ArrayInt amisPour() {
			return amisPour;
		}

		@HT(id = 46) private ArrayInt amisPar;

		@HT(id = 47) public int prixPG;

		public int prixPG() {
			return prixPG;
		}

		public void prixPG(int value) {
			if (w(this.prixPG, value)) this.prixPG = value;
		}

		@HT(id = 61) public String descr;

		public String descr() {
			return descr;
		}

		public void descr(String value) {
			if (w(this.descr, value)) this.descr = value;
		}

		@HT(id = 62) public String intitule;

		public String intitule() {
			return intitule;
		}

		public void intitule(String value) {
			if (w(this.intitule, value)) this.intitule = value;
		}

	}

	@HTCN(id = 13) public class Ac extends Livr.Ac {
		@Override public String[] keys() {
			return AS.as(keyOfAc1(ac));
		};

		private void sumAcAp(ToUpdate _upd) throws AppException {
			int db = 0;
			int cr = 0;
			int regltFait = 0;
			int panierAtt = 0;
			int cheque = 0;
			int suppl = 0;
			int poids = 0;
			int prix = 0;
			int nblg = 0;
			int payePar = 0;
			int payePour = 0;
			int flags = 0;
			for (CellNode cn : nodesByKey(keyOfAcAp1p(ac))) {
				AcAp x = (AcAp) cn;
				regltFait += x.regltFait;
				payePar += x.payePar;
				payePour += x.payePour;
				cheque += x.cheque;
				db += x.db;
				cr += x.cr;
				panierAtt += x.panierAtt;
				suppl += x.suppl;
				poids += Math.abs(x.poids);
				prix += x.prix;
				nblg += x.nblg;
				flags = flags | x.flags;
			}
			flags(flags);
			db(db);
			cr(cr);
			regltFait(regltFait);
			panierAtt(panierAtt);
			cheque(cheque);
			suppl(suppl);
			poids(poids);
			prix(prix);
			payePar(payePar);
			payePour(payePour);
			nblg(nblg);
		}

	}

	@HTCN(id = 14) public class Ap extends Livr.Ap {
		@Override public String[] keys() {
			return AS.as(keyOfAp1(ap));
		};

		private MFA setRemiseCheque(ToUpdate _upd, int _cheque) throws AppException {
			remiseCheque(_cheque);
			if (hasChanged()) {
				_upd.setAp3(ap);
				_upd.setGacAp();
			}
			return null;
		}

		private MFA setRegul(ToUpdate _upd, String _descr) throws AppException {
			descr(_descr);
			if (hasChanged()) {
				_upd.setAp3(ap);
				_upd.setGacAp();
			}
			return null;
		}

		private void sumApPr(ToUpdate upd) throws AppException {
			int poids = 0;
			int poidsC = 0;
			int poidsD = 0;
			int prix = 0;
			int prixC = 0;
			int prixD = 0;
			int nblg = 0;
			int flags = 0;
			for (CellNode cn : nodesByKey(keyOfApPr1p(ap))) {
				ApPr x = (ApPr) cn;
				poids += x.poids;
				prix += x.prix;
//				int qpmC[] = x.qpmC();
//				int qpmD[] = x.qpmD();
//				poidsC += qpmC[1];
//				prixC += qpmC[2];
//				poidsD += qpmD[1];
//				prixD += qpmD[2];
				poidsC += x.poidsC;
				prixC += x.prixC;
				poidsD += x.poidsD;
				prixD += x.prixD;				
				nblg += x.nblg;
				flags = flags | x.flags;
			}
			poids(poids);
			poidsC(poidsC);
			poidsD(poidsD);
			prix(prix);
			prixC(prixC);
			prixD(prixD);
			nblg(nblg);
			flags(flags);
			if (hasChanged()) upd.setGacAp();
		}

		private void sumAcAp(ToUpdate _upd) throws AppException {
			int balance = 0;
			int cheque = 0;
			int suppl = 0;
			int prixPG = 0;
			int panierAtt = 0;
			int regltFait = 0;
			for (CellNode cn : nodesByKey(keyOfAcAp2p(ap))) {
				AcAp x = (AcAp) cn;
				regltFait += x.regltFait;
				balance = balance + x.db;
				balance = balance - x.cr;
				panierAtt += x.panierAtt;
				cheque += x.cheque;
				suppl += x.suppl;
				prixPG += x.prixPG;
			}
			if (balance == 0) {
				db(0);
				cr(0);
			} else if (balance > 0) {
				cr(balance);
				db(0);
			} else {
				cr(0);
				db(-balance);
			}
			panierAtt(panierAtt);
			regltFait(regltFait);
			cheque(cheque);
			suppl(suppl);
			prixPG(prixPG);
			if (hasChanged()) _upd.setGacAp();
		}
	}

	@HTCN(id = 15, single = 'I') public class Gac extends Livr.Gac {

		private void sumAp(ToUpdate upd) throws AppException {
			int db = 0;
			int dbj = 0;
			int cr = 0;
			int crj = 0;
			int nblg = 0;
			int poids = 0;
			int poidsC = 0;
			int poidsD = 0;
			int prix = 0;
			int prixC = 0;
			int prixD = 0;
			int cheque = 0;
			int remiseCheque = 0;
			int suppl = 0;
			int panierAtt = 0;
			int regltFait = 0;
			int flags = 0;
			int nbac = 0;
			for (CellNode cn : nodesByKey(keyOfAp1p())) {
				Ap c = (Ap) cn;
				regltFait += c.regltFait;
				panierAtt += c.panierAtt;
				nblg += c.nblg;
				poids += c.poids;
				poidsC += c.poidsC;
				poidsD += c.poidsD;
				prix += c.prix;
				prixC += c.prixC;
				prixD += c.prixD;
				cheque += c.cheque;
				remiseCheque += c.remiseCheque;
				suppl += c.suppl;
				if (c.db != 0) {
					if (c.descr != null && c.descr.length() != 0)
						crj += c.db;
					else cr += c.db;
				}
				if (c.cr != 0) {
					if (c.descr != null && c.descr.length() != 0)
						dbj += c.cr;
					else db += c.cr;
				}
				flags = flags | c.flags;
			}
			for (CellNode cn : nodesByKey(keyOfAc1p())) {
				Ac c = (Ac) cn;
				if (c.nblg != 0)
					nbac++;
			}
			nbac(nbac);
			db(db);
			dbj(dbj);
			cr(cr);
			crj(crj);
			nblg(nblg);
			poids(poids);
			poidsC(poidsC);
			poidsD(poidsD);
			prix(prix);
			prixC(prixC);
			prixD(prixD);
			panierAtt(panierAtt);
			regltFait(regltFait);
			cheque(cheque);
			remiseCheque(remiseCheque);
			suppl(suppl);
			flags(flags);
		}

	}
	
	private static class ERprod {
		int prod;
		int qte;
		int poids;
		boolean raz;
	}

	private static class CDac {
		int ac;
		int qte;
		int poids;
	}

	public static class Op extends Operation {

		private String line;
		private String column;
		private int authType;
		private int authPower;
		private int authUsr;
		private int gap;
		private int gac;
		private int ac;
		private int ami;
		private int apr;
		private int prod;
		private int codeLivr;
		private int phase;

		private int qte;
		private int poids;
		private int cheque;
		private int payeParPour;
		private int pour;
		private int suppl;
		private String descr;
		private String intitule;
		private ArrayList<Integer> lprix;
		private ArrayList<Integer> lqte;
		private ArrayList<ERprod> lerprod;
		private ArrayList<CDac> lcdac;
		private int cible;
		private int nprix;

		private String nomGap = "?";
		private String nomGac = "?";
		private String nomAp = "?";
		private String nomAc = "?";
		private String nomPr = "?";
		private GAP cellGap;
		private GAC cellGac;
		private Catalogue.Produit produit;
		private GAPC.GContact contactAc;
		private GAPC.GContact contactAp;
		private GAPC.GContact contactAmi;
		private LivrC.ToUpdate toUpd;
		private Catalogue cat;

		private int c; // opName - 40

		String err1() {
			StringBuffer sb = new StringBuffer();
			sb.append("Livraison [").append(codeLivr).append("] du groupement [").append(gap);
			sb.append("/").append(nomGap).append("] au groupe [").append(gac).append("/")
					.append(nomGac).append("]. ");
			if (ac != 0)
				sb.append("Pour l'alterconso [").append(ac).append("/").append(nomAc).append("]. ");
			if (prod != 0)
				sb.append("Produit [").append(prod).append("/").append(nomPr).append("]. ");
			if (apr != 0)
				sb.append("Producteur [").append(apr).append("/").append(nomAp).append("]. ");
			return sb.toString();
		}

		@Override public String mainLine() {
			return line;
		}

		ArrayList<ERprod> checkERprod(AcJSONArray a) throws AppException {
			if (a == null) return null;
			ArrayList<ERprod> lst = new ArrayList<ERprod>(a.size());
			for (int i = 0; i < a.size(); i++) {
				AcJSONObject obj = a.getO(i);
				ERprod x = new ERprod();
				x.prod = obj.getI("prod", 0);
				if (x.prod == 0) throw new AppException(MFA.ERPROD1, err1(), i);
				Produit produit = cat.produit(x.prod);
				if (produit == null) throw new AppException(MFA.ERPROD1, err1(), i);
				x.qte = obj.getI("qte", -1);
				if (x.qte < -1 || x.qte > 999) throw new AppException(MFA.ERPROD2, err1(), i);
				x.poids = obj.getI("poids", -1);
				if (x.poids < -1 || x.poids > 9999999) throw new AppException(MFA.ERPROD3, err1(), i);
				if (x.poids == -1 && x.qte == -1) throw new AppException(MFA.ERPROD4, err1(), i);
				x.raz = obj.getI("raz", 0) == 1;
				lst.add(x);
			}
			return lst;
		}

		ArrayList<CDac> checkCDac(AcJSONArray a) throws AppException {
			if (a == null) return null;
			ArrayList<CDac> lst = new ArrayList<CDac>(a.size());
			for (int i = 0; i < a.size(); i++) {
				AcJSONObject obj = a.getO(i);
				CDac x = new CDac();
				x.ac = obj.getI("ac", 0);
				if (x.ac == 0 || cellGac.contact(x.ac) == null) throw new AppException(MFA.CDAC1, err1(), i);
				x.qte = obj.getI("qte", -1);
				if (x.qte < -1 || x.qte > 999) throw new AppException(MFA.CDAC2, err1(), i);
				x.poids = obj.getI("poids", -1);
				if (x.poids < -1 || x.poids > 9999999) throw new AppException(MFA.CDAC3, err1(), i);
				if (x.poids == -1 && x.qte == -1) throw new AppException(MFA.CDAC4, err1(), i);
				lst.add(x);
			}
			return lst;		
		}

		ArrayList<Integer> checkLprix(AcJSONArray a) throws AppException {
			if (a == null) return null;
			ArrayList<Integer> lprix = new ArrayList<Integer>(a.size());
			for (int i = 0; i < a.size(); i++) {
				int pr = 0;
				try {
					pr = (int) (long) (Long) a.get(i);
				} catch (Exception ex) {}
				if (pr <= 1000) throw new AppException(MFA.CDDIS2, err1(), i);
				int ac = pr % 1000;
				if (authType == 2 && ac != 0 && ac != 999 && cellGac.contact(ac) == null)
					throw new AppException(MFA.CDDIS3, err1(), i);
				if (authType == 1 && ac != 0 && ac != 999)
					throw new AppException(MFA.CDDIS3, err1(), i);
				lprix.add(pr);
			}
			return lprix;
		}

		public StatusPhase phaseFaible() throws AppException {
			c = Integer.parseInt(getOpName()) - 40;

			gap = arg().getI("gap", 0);
			DirectoryG.Entry e = GAP.gapEntry(gap);
			if (e == null) throw new AppException(MFA.LIVANG, e != null ? e.label() : gap);
			nomGap = e.label();
			cellGap = GAP.get(gap);

			gac = arg().getI("gac", 0);
			DirectoryG.Entry e2 = GAC.gacEntry(gac);
			if (e2 == null) throw new AppException(MFA.LIVRCGAC, e2 != null ? e2.label() : gac);
			nomGac = e.label();
			cellGac = GAC.get(gac);

			cat = Catalogue.get(gap);
			
			ac = arg().getI("ac", 0);
			if (ac != 0) {
				contactAc = cellGac.contact(ac);
				if (contactAc == null) throw new AppException(MFA.CDACI, err1());
				nomAc = contactAc.initiales();
			}

			apr = arg().getI("apr", 0);
			if (apr != 0) {
				contactAp = cellGap.contact(apr);
				if (contactAp == null) throw new AppException(MFA.CDAPI, err1());
				nomAp = contactAp.nom();
			}

			ami = arg().getI("ami", 0);
			if (ami != 0) {
				contactAmi = cellGac.contact(ami);
				if (contactAmi == null || contactAmi.suppr() != 0)
					throw new AppException(MFA.CDAMI, err1(), contactAmi == null ? ami
							: contactAmi.nom());
				if (ami == ac) throw new AppException(MFA.CDEX13, err1());
			}

			prod = arg().getI("prod", 0);
			if (prod != 0) {
				produit = cat.produit(prod);
				if (produit == null) throw new AppException(MFA.CDPROD, err1());
				nomPr = produit.nom();
			}

			qte = arg().getI("qte", -1);
			if (qte < -1) throw new AppException(MFA.CDEX3, err1());
			poids = arg().getI("poids", -1);
			if (poids < -1) throw new AppException(MFA.CDEX4, err1());
			cheque = arg().getI("cheque", -1);
			if (cheque < -1) throw new AppException(MFA.CDEX5, err1());
			
			payeParPour = arg().getI("payeParPour", -1);
			if (payeParPour < -1) throw new AppException(MFA.CDEX6, err1());
			pour = arg().getI("pour", 0);

			suppl = arg().getI("suppl", Integer.MIN_VALUE);
			descr = arg().getS("descr", null);
			intitule = arg().getS("intitule", null);

			codeLivr = arg().getI("codeLivr", 0);
			if (codeLivr == 0) throw new AppException(MFA.CDEX2, err1());

			lprix = checkLprix(arg().getA("lprix", false));
			lqte = checkLprix(arg().getA("lqte", false));
			lerprod = checkERprod(arg().getA("lerprod", false));
			lcdac = checkCDac(arg().getA("lcdac", false));
			cible = arg().getI("cible", -1);
			if (cible > 0 && cible < 999 && cellGac.contact(cible) == null)
				throw new AppException(MFA.CDDIS4, err1(), cible);

			nprix = arg().getI("nprix", 0);
			if (nprix <= 0 && c == 6)
				throw new AppException(MFA.CDDIS5, err1());

			// if (lprix != null && cible == -1) throw new AppException(MFA.CDEX7e, err1());

			authType = authChecker.getAuthType();
			authPower = authChecker.getAuthPower();
			authUsr = authChecker.getAuthUsr();

			switch (c) {
			case 0: {
				// remise cheque par un producteur
				if (apr == 0) throw new AppException(MFA.CDEX11, err1());
				if (apr > 1 && apr < 100)
					throw new AppException(MFA.CDEX14b, err1());
				if (cheque == -1)
					throw new AppException(MFA.CDEX13c, err1());
				break;
			}
			case 1: {
				// commande / distribution
				if (prod == 0) throw new AppException(MFA.CDEX1, err1());
				if (lcdac == null) {
					if (ac == 0) throw new AppException(MFA.CDEX2, err1());
					if (poids == -1 && qte == -1) throw new AppException(MFA.CDEX7, err1());
				}
				break;
			}
			case 2: {
				// expédition / réception
				if (lerprod == null) {
					if (prod == 0) throw new AppException(MFA.CDEX1, err1());
					if (poids == -1 && qte == -1)
						throw new AppException(MFA.CDEX7c, err1());
				}
				break;
			}
			case 8: {
				// paiement du producteur cheque / suppl
				if (ac == 0) throw new AppException(MFA.CDEX2, err1());
				if (apr == 0) throw new AppException(MFA.CDEX11, err1());
				if ((apr > 1 && apr < 100) && (suppl != Integer.MIN_VALUE || cheque != -1))
					throw new AppException(MFA.CDEX14b, err1());
				if (cheque == -1 && suppl == Integer.MIN_VALUE && descr == null && intitule == null)
					throw new AppException(MFA.CDEX13b, err1());
				break;
			}
			case 9: {
				// paiement par / pour
				if (ac == 0) throw new AppException(MFA.CDEX2, err1());
				if (apr == 0) throw new AppException(MFA.CDEX11, err1());
				if (apr > 1 && apr < 100)
					throw new AppException(MFA.CDEX14b, err1());
				if (payeParPour == -1 || ami == 0) 
					throw new AppException(MFA.CDEX13b, err1());
				break;
			}
			case 4: {
				// regul AP
				if (apr == 0) throw new AppException(MFA.CDEX11, err1());
				if (descr == null) throw new AppException(MFA.CDEX13e, err1());
				break;
			}
			case 5: {
				// lprix
				if (prod == 0) throw new AppException(MFA.CDEX1, err1());
				if (prod % 10 != 2) throw new AppException(MFA.CDEX1b, err1());
				if (cible == -1) {
					if (lprix == null && lqte == null)
						throw new AppException(MFA.CDEX7i, err1());
					if (authType == 2 && lqte != null)
						throw new AppException(MFA.CDEX7j, err1());
				} else { // semble jamais appelé ???
					if (lprix == null || cible == -1) throw new AppException(MFA.CDEX13f, err1());
					if (authType == 2 && !(cible == 0 || cible == 999))
						throw new AppException(MFA.CDEX7f, err1());
				}
				break;
			}
			case 6: {
				// lprix manquants
				if (prod == 0) throw new AppException(MFA.CDEX1, err1());
				if (prod % 10 != 2) throw new AppException(MFA.CDEX1b, err1());
				if (nprix == 0) throw new AppException(MFA.CDEX13g, err1());
				if (authType != 1 || authUsr != 0)
					throw new AppException(MFA.CDEX7z, err1());
				break;
			}
			case 7: {
				// raz distrib / chargt
				if (prod == 0) throw new AppException(MFA.CDEX1, err1());
				if (authType != 1 || authUsr != 0)
					throw new AppException(MFA.CDEX7z, err1());
				break;
			}
			}

			column = GAP.colOfLivr(codeLivr, gac);
			line = GAP.lineOf(gap);

			if (authChecker.getAuthPower() >= 5) throw new AppException(MF.ANNUL);

			int lvl = authChecker.accessLevel(line, column, "LivrC");
			if (lvl < 1) throw new AppException(MFA.AUTHCD1, err1());
			
			if (authType == 1) {
				if (c != 1 && authPower > 2) throw new AppException(MFA.AUTHCD2, err1());
			} else if (authType == 2) {
				if (!(c == 2 || c == 0) && authPower > 3) throw new AppException(MFA.AUTHCD4, err1());
			}

			return StatusPhase.transactionMultiLines;
		}

		public void phaseForte() throws AppException {
			/*
			 * 6 : archivé
			 * 5 : en distribution
			 * 4 : en livraison
			 * 3 : en expédition
			 * 2 : en chargement
			 * 1 : en commande (plus tard pour responsable de groupe que pour AC)
			 * 0 : pas ouvert
			 * 
			 * authPower : 
			 * GAP / GAC 
			 * 1 : par mot de passe principal 
				 * 2 : par mot de passe secondaires
				 * 5 et 6 : annulé
			 * 
			 * AC / AP 
			 * 3 : par le mot de passe 
			 * 4 : par la clé de l'AC
			 */

			LivrC livrC = LivrC.get(gap, codeLivr, gac);
			Calendrier.Livr cal = livrC.calLivr();
			if (cal == null) throw new AppException(MFA.CDSLIVR, err1());

			if (authPower > 2) {
				if (cal.suppr() != 0 || cal.myLivr().suppr() != 0)
					throw new AppException(MFA.CDAN1, err1());
			}

			phase = livrC.phaseActuelle(authUsr != 0 && authType == 1, true);
			if (phase == 6) throw new AppException(MFA.CDCAL1, err1());
			if (phase == 0) throw new AppException(MFA.CDCAL2, err1());

			toUpd = livrC.new ToUpdate();
			MFA ret = null;
			switch (c) {
			case 0: {
				ret = livrC.getAp(apr).setRemiseCheque(toUpd, cheque); 
				break;
			}
			case 1: {
				boolean ac1 = authUsr == 0 && ac == 1;
				if (authUsr > 1) {
					if (phase != 1) throw new AppException(MFA.AUTHCD2, err1());
				} else {
					if (phase > 1 && phase < 4)
						throw new AppException(MFA.AUTHCD3, err1());
				}
				
				if (lcdac == null) {
					ret = livrC.getAcApPr(ac, prod / 10000, prod % 10000).commandeDistribution(toUpd,
						phase, qte, poids, (authUsr != 0), ac1);
				} else {
					for(CDac x : lcdac) {
						ret = livrC.getAcApPr(x.ac, prod / 10000, prod % 10000).commandeDistribution(toUpd,
								phase, x.qte, x.poids, (authUsr != 0), ac1);
						if (ret != null)
							break;
					}
				}
				break;
			}
			case 2: {
				if (phase == 5 && authPower > 2) throw new AppException(MFA.CDER1, err1());
				if (lerprod == null)
					ret = livrC.getApPr(prod / 10000, prod % 10000).expeditionReception(toUpd, phase,
							qte, poids, (authType == 2));
				else {
					for(ERprod x : lerprod) {
						ret = livrC.getApPr(x.prod / 10000, x.prod % 10000).expeditionReception(toUpd, phase, 
								x.qte, x.poids, (authType == 2));
						if (ret != null)
							break;
						if (x.qte == 0 && x.raz) {
							livrC.getApPr(x.prod / 10000, x.prod % 10000).razDistr(toUpd);
							for (CellNode cn : livrC.nodesByKey(keyOfAcApPr2p(x.prod / 10000, x.prod % 10000)))
								((AcApPr) cn).razQte2(toUpd);
						}
					}
				}
				break;
			}
			case 8: {
				ret = livrC.getAcAp(ac, apr).paiementChequeSuppl(toUpd, cheque, suppl, descr, intitule, this);
				break;
			}
			case 9: {
				ret = livrC.getAcAp(ac, apr).paiementParPour(toUpd, ami, payeParPour, (pour != 0), this);
				break;
			}
			case 4: {
				ret = livrC.getAp(apr).setRegul(toUpd, descr); 
				break;
			}
			case 5: { // "45"
				if (phase == 5 && authPower > 3) throw new AppException(MFA.CDER1, err1());
				boolean ac1 = authUsr == 0 && ac == 1;
//				if (cible == -1) {
				ret = livrC.getApPr(prod / 10000, prod % 10000).majLprix2(toUpd, phase, lprix, lqte,
						(authType == 2), ac1);
				if (ret != null)
					break;
				if (lcdac != null) {
					for(CDac x : lcdac) {
						ret = livrC.getAcApPr(x.ac, prod / 10000, prod % 10000).commandeDistribution(toUpd,
								phase, x.qte, x.poids, (authUsr != 0), ac1);
						if (ret != null)
							break;
					}
				}
				if (qte != -1)
					ret = livrC.getApPr(prod / 10000, prod % 10000).expeditionReception(toUpd, phase,
							qte, -1, (authType == 2));
				if (ret != null)
					break;
//				} 
//				else // semble jamais appelé ???
//					ret = livrC.getApPr(prod / 10000, prod % 10000).majLprix(toUpd, phase, lprix,
//							cible, (authType == 2));
				break;
			}
			case 6: { // "46" '46'
				throw new AppException(MFA.MPMOBS);
//				if (phase == 5 && authPower > 2) throw new AppException(MFA.CDER1, err1());
//				ret = livrC.getApPr(prod / 10000, prod % 10000).majPaquetsManquants(toUpd, phase, nprix);
//				break;
			}
			case 7: { // "47" '47'
				throw new AppException(MFA.RAZOBS);
//				if (phase == 5 && authPower > 2) throw new AppException(MFA.CDER1, err1());
//				livrC.getApPr(prod / 10000, prod % 10000).razDistr(toUpd);
//				for (CellNode cn : livrC.nodesByKey(keyOfAcApPr2p(prod / 10000, prod % 10000)))
//					((AcApPr) cn).razQte2(toUpd);
//				break;
			}
			}

			if (ret != null)
				throw new AppException(ret, err1());
			else toUpd.finalUpdate(true);
		}

	}
	
	public static class Import {
		StringWriter sw;
		int gac;
		int gap;
		int codeLivr;
		int ac;
		Hashtable<Integer, GPQ> lst;
		LivrC livrC;
		LivrC.ToUpdate toUpd;
		AppTransaction tr;
		int nb = 0;
		boolean fromAC;
		boolean ac1;
		int phase;

		Import(StringWriter sw, int gac, int gap, int codeLivr, int ac, boolean fromAC,
				Hashtable<Integer, GPQ> lst) {
			try {
				this.sw = sw;
				this.gap = gap;
				this.lst = lst;
				this.fromAC = fromAC;
				this.ac = ac;
				this.ac1 = !fromAC && ac == 1;
				tr = AppTransaction.tr();
				tr.startPhaseForte("P." + gap + ".", true);
				livrC = LivrC.get(gap, codeLivr, gac);
				phase = livrC.phaseActuelle(fromAC, false);
				toUpd = livrC.new ToUpdate();
			} catch (AppException e) {
				sw.append(e.getMessage());
				nb = -1;
			}
		}

		public int go() {
			if (nb == -1) return nb;
			try {
				HashMap<Integer, Integer> toChange = new HashMap<Integer, Integer>();
				LinkedList<Integer> toDel = new LinkedList<Integer>();
				Catalogue cat = Catalogue.get(gap);
				
				for(CellNode cn : livrC.nodesByKey(keyOfAcApPr1ac(ac))) {
					AcApPr x = (AcApPr)cn;
					GPQ xx = this.lst.get(x.prod());
					if (xx == null) {
						if (x.qte != 0)
							toDel.add(x.prod());
					} else {
						Produit px = cat.produit(x.prod());
						double qx = xx.qte;
						if (px.parDemi != 0)
							qx = qx * 2;
						int qy = (int)Math.round(qx);
						if (qy == x.qte) {
							this.lst.remove(x.prod());
						} else {
							toChange.put(x.prod(), qy);
						}			
					}
				}
				
				for (Integer prod : lst.keySet()) {
					double qx = lst.get(prod).qte;
					Produit px = cat.produit(prod);
					if (px == null){
						sw.append(" prod=" + prod + " produit non disponible : ignoré\n");
					} else {
						if (px.parDemi != 0)
							qx = qx * 2;
						int qy = (int)Math.round(qx);
						toChange.put(prod, qy);
					}
				}
				
				nb = toChange.size() + toDel.size();
				if (nb == 0) {
					tr.endPhase(false);
				} else {
					nb = 0;
					
					for(Integer prod : toChange.keySet()){
						Produit px = cat.produit(prod);
						String name = px == null ? "???" : px.nom;
						int qte = toChange.get(prod);
						MFA	ret = livrC.getAcApPr(ac, prod / 10000, prod % 10000).commandeDistribution(toUpd,
								phase, qte, -1, fromAC, ac1);
						if (ret == null){
							double qtex = px.parDemi != 0 ? ((double)qte / 2) : (double)qte;
							sw.append(name + " [" + prod + "]" + ", quantité: " + qtex + "\n");
							nb++;
						} else {
							String[] a = new String[1];
							a[0] = name + " [" + prod + "]";
							String m = ret.format(a);
							sw.append(m + "\n");
						}
					}
					
					for(Integer prod : toDel){
						Produit px = cat.produit(prod);
						String name = px == null ? "???" : px.nom;
						MFA ret = livrC.getAcApPr(ac, prod / 10000, prod % 10000).commandeDistribution(toUpd,
								phase, 0, -1, fromAC, ac1);
						if (ret == null) {
							sw.append(name + " [" + prod + "]" + ", suppression\n");
							nb++;
						} else {
							String m = ret.format(name + " [" + prod + "]");
							sw.append(m);
						}
					}
					if (nb != 0)
						toUpd.finalUpdate(true);
					tr.endPhase(nb != 0);
				}
				return nb;
			} catch (AppException e) {
				sw.append(e.getMessage() + "\n");
				try {
					tr.endPhase(false);
				} catch (AppException e1) {	}
				return -1;
			}
		}
	}

}
