package fr.alterconsos.cell;

import java.util.ArrayList;

import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.MF;

public class LivrP extends Livr implements ICpt {
	public static final CellDescr cellDescr = new CellDescr(LivrP.class);

	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	public static LivrP get(int gap) throws AppException {
		return (LivrP) Cell.get(GAP.lineOf(gap), "0.", "LivrP");
	}

	public static String keyOfAp1(int codeLivr, int gac, int ap) {
		return "H." + codeLivr + "." + ap + "." + gac + "." ;
	}

	public static String keyOfAp1p(int codeLivr, int ap) {
		return "H." + codeLivr + "." + ap + "." ;
	}

	public static String keyOfAp2(int codeLivr, int gac, int ap) {
		return "I." + ap + "." + codeLivr + "." + gac + "." ;
	}

	public static String keyOfGac1(int codeLivr, int gac) {
		return "J." + codeLivr + "." + gac + ".";
	}

	public static String keyOfGac1p(int codeLivr) {
		return "J." + codeLivr + ".";
	}

	public static String keyOfSGAp2(int codeLivr, int ap) {
		return "M."  + ap + "." + codeLivr + ".";
	}

	public static String keyOfSGAp1(int codeLivr, int ap) {
		return "K." + codeLivr + "." + ap + ".";
	}

	public static String keyOfSGAp1p(int codeLivr) {
		return "K." + codeLivr + ".";
	}

	public static String keyOfSG(int codeLivr) {
		return "L." + codeLivr + ".";
	}

	public void purge(ArrayList<Calendrier> cals){
		ArrayList<CellNode> x = new ArrayList<CellNode>();
		Calendrier.CodeLivrSet cls = new Calendrier.CodeLivrSet(cals);
		for(CellNode cn : nodesByKey("H.")) {
			Ap g = (Ap)cn;
			if (!cls.has(gap(),  g.codeLivr))
				x.add(g);
		}
		for(CellNode cn : nodesByKey("J.")) {
			Gac g = (Gac)cn;
			if (!cls.has(gap(),  g.codeLivr))
				x.add(g);
		}
		for(CellNode cn : nodesByKey("L.")) {
			SG g = (SG)cn;
			if (!cls.has(gap(),  g.codeLivr))
				x.add(g);
		}
		for(CellNode cn : nodesByKey("K.")) {
			SGAp g = (SGAp)cn;
			if (!cls.has(gap(),  g.codeLivr))
				x.add(g);
		}
		for(CellNode cn : x)
			cn.remove();
	}

	public Cpt getCpt(Calendrier.Livr l, int usr) {
		if (usr <= 1) {
			LivrP.Gac x = (LivrP.Gac) this.nodeByKey(LivrP.keyOfGac1(l.codeLivr(), l.gac()));
			return x == null ? new Cpt(l) : new Cpt(l, x.prix(), x.poids(), x.nblg(), 
					x.db() + x.dbj(), x.cr() + x.crj(), x.nbac(), x.panierAtt(), x.regltFait());
		}
		else {
			LivrP.Ap x = (LivrP.Ap) this.nodeByKey(LivrP.keyOfAp2(l.codeLivr(), l.gac(), usr));
			return x == null ? new Cpt(l) : new Cpt(l, x.prix(), x.poids(), x.nblg(), x.db(), x.cr(), 0, 0, 0);
		}
	}

	@Override public void setIds() throws AppException {
		try {
			String[] s = line().split("\\.");
			gapx = Integer.parseInt(s[1]);
		} catch (Exception e) {
			throw new AppException(MF.COLUMN, column());
		}
	}

	public void copyAp(int gac, int codeLivr, Livr.Ap src) throws AppException {
		Ap t = (Ap) nodeByKey(keyOfAp1(codeLivr, gac, src.ap));
		if (t == null) {
			t = (Ap) newCellNode("Ap");
			t.codeLivr = codeLivr;
			t.gac = gac;
			t.ap = src.ap;
			t.insert();
		}
		t.w();
		t.regltFait = src.regltFait;
		t.panierAtt = src.panierAtt;
		t.remiseCheque = src.remiseCheque;
		t.cheque = src.cheque;
		t.descr = src.descr;
		t.db = src.db;
		t.cr = src.cr;
		t.flags = src.flags;
		t.nblg = src.nblg;
		t.poids = src.poids;
		t.poidsC = src.poidsC;
		t.poidsD = src.poidsD;
		t.prix = src.prix;
		t.prixC = src.prixC;
		t.prixD = src.prixD;
		t.prixPG = src.prixPG;
		t.suppl = src.suppl;
		CalendrierGAP cal = CalendrierGAP.get(gap());
		this.rebuildSGAp(cal, codeLivr, t.ap);
	}

	public void rebuildSGAp(CalendrierGAP cal, int codeLivr, int ap) throws AppException {
		SGAp g = (SGAp) nodeByKey(keyOfSGAp1(codeLivr, ap));
		if (g != null) g.remove();
		g = (SGAp) newCellNode("SGAp");
		g.codeLivr = codeLivr;
		g.ap = ap;
		g.insert();
		for (CellNode cn : nodesByKey(keyOfAp1p(codeLivr, g.ap))) {
			Ap c = (Ap) cn;
			Calendrier.Livr livr = cal.livr(gap(), codeLivr, c.gac);
			if (livr == null || livr.suppr() != 0) continue;
			if (c.db != 0){
				if (c.descr != null && c.descr.length() != 0)
					g.crj += c.db;
				else
					g.cr += c.db;
			}
			if (c.cr != 0){
				if (c.descr != null && c.descr.length() != 0)
					g.dbj += c.cr;
				else
					g.db += c.cr;
			}
			g.panierAtt += c.panierAtt;
			g.regltFait += c.regltFait;
			g.remiseCheque += c.remiseCheque;
			g.cheque += c.cheque;
			g.nblg += c.nblg;
			g.poids += c.poids;
			g.poidsC += c.poidsC;
			g.poidsD += c.poidsD;
			g.prix += c.prix;
			g.prixC += c.prixC;
			g.prixD += c.prixD;
			g.prixPG += c.prixPG;
			g.suppl += c.suppl;
			g.flags = g.flags | c.flags;
		}
	}

	public void rebuildSG(int codeLivr) throws AppException {
		SG sg = (SG) nodeByKey(keyOfSG(codeLivr));
		if (sg != null) sg.remove();
		sg = (SG) newCellNode("SG");
		sg.codeLivr = codeLivr;
		sg.insert();
		for (CellNode cn : nodesByKey(keyOfSGAp1p(codeLivr))) {
			SGAp c = (SGAp) cn;
			sg.panierAtt += c.panierAtt;
			sg.regltFait += c.regltFait;
			sg.cheque += c.cheque;
			sg.remiseCheque += c.remiseCheque;
			sg.db += c.db;
			sg.dbj += c.dbj;
			sg.cr += c.cr;
			sg.crj += c.crj;
			sg.nblg += c.nblg;
			sg.poids += c.poids;
			sg.poidsC += c.poidsC;
			sg.poidsD += c.poidsD;
			sg.suppl += c.suppl;
			sg.prix += c.prix;
			sg.prixC += c.prixC;
			sg.prixD += c.prixD;
			sg.flags = sg.flags | c.flags;
		}
	}

	public void recomputeSG(int codeLivr) throws AppException {
		CalendrierGAP cal = CalendrierGAP.get(gap());
		ArrayList<Integer> lap = new ArrayList<Integer>();
		for (CellNode cn : nodesByKey(keyOfSGAp1p(codeLivr))) {
			SGAp c = (SGAp) cn;
			lap.add(c.ap);
		}
		for (int ap : lap) {
			this.rebuildSGAp(cal, codeLivr, ap);
		}
		this.rebuildSG(codeLivr);
	}

	public void copyGac(int gac, int codeLivr, Livr.Gac src) throws AppException {
		Gac t = (Gac) nodeByKey(keyOfGac1(codeLivr, gac));
		if (t == null) {
			t = (Gac) newCellNode("Gac");
			t.codeLivr = codeLivr;
			t.gac = gac;
			t.insert();
		}
		t.w();
		t.nbac = src.nbac;
		t.panierAtt = src.panierAtt;
		t.regltFait = src.regltFait;
		t.remiseCheque = src.remiseCheque;
		t.cheque = src.cheque;
		t.db = src.db;
		t.dbj = src.dbj;
		t.cr = src.cr;
		t.crj = src.crj;
		t.nblg = src.nblg;
		t.poids = src.poids;
		t.poidsC = src.poidsC;
		t.poidsD = src.poidsD;
		t.prix = src.prix;
		t.prixC = src.prixC;
		t.prixD = src.prixD;
		t.suppl = src.suppl;
		t.flags = src.flags;
	}

	@HTCN(id = 14) public class Ap extends Livr.Ap {
		@Override public String[] keys() {
			return AS.as(keyOfAp1(codeLivr, gac, ap), keyOfAp2(codeLivr, gac, ap));
		};

		@HT(id = 1) public int codeLivr;

		@HT(id = 2) public int gac;
	}

	@HTCN(id = 15) public class Gac extends Livr.Gac {
		@Override public String[] keys() {
			return AS.as(keyOfGac1(codeLivr, gac));
		};

		@HT(id = 1) public int codeLivr;

		@HT(id = 2) public int gac;
		
	}

	@HTCN(id = 16) public class SGAp extends Livr.Gac {
		@Override public String[] keys() {
			return AS.as(keyOfSGAp1(codeLivr, ap),keyOfSGAp2(codeLivr, ap));
		};
		
		@HT(id = 1) public int codeLivr;

		@HT(id = 3) public int ap;
		
		@HT(id = 47) public int prixPG;

	}

	@HTCN(id = 17) public class SG extends Livr.Gac {
		@Override public String[] keys() {
			return AS.as(keyOfSG(codeLivr));
		};

		@HT(id = 1) public int codeLivr;
	}

}