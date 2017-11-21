package fr.alterconsos.cell;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;

import fr.alterconsos.MFA;
import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.ArrayInt;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.Operation;
import fr.hypertable.AppTransaction.StatusPhase;

public class GAC extends GAPC {
	public static final CellDescr cellDescr = new CellDescr(GAC.class);

	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	public static String lineOf(int gac) throws AppException {
		if (gac <= 0) throw new AppException(MFA.GAC, gac);
		return "C." + gac + ".";
	}

	public static Directory.Entry gacEntry(int gac) {
		return Directory.entryG(1, gac);
	}

	public static GAC get(int gac) throws AppException {
		if (gac <= 0) throw new AppException(MFA.GAC, gac);
		return (GAC) Cell.get(lineOf(gac), "0.", "GAC", 0);
	}

	private Contact c1;

	public Contact c1() {
		return c1;
	}

	public static List<Integer> validGacs(Collection<Integer> gacs) {
		ArrayList<Integer> lst = new ArrayList<Integer>();
		if (gacs != null) 
			for (int gac : gacs) {
				Directory.Entry e = Directory.entryG(1, gac);
				if (e != null && e.suppr() == 0)
					lst.add(gac);
			}
		return lst;
	}

	@Override public void compile() throws AppException {
		HashSet<Integer> grps = new HashSet<Integer>();
		for (CellNode o : nodesByKey("C.")) {
			GContact c = ((GContact) o);
			c.setUrl();
			for (int s : c.groupements())
				grps.add(s);
		}
		Integer[] gx = grps.toArray(new Integer[grps.size()]);
		Arrays.sort(gx);
		Entete entete = (Entete) entete();
		Integer[] ga = entete.groupements.toArray(new Integer[entete.groupements.size()]);
		Arrays.sort(ga);
		if (!Arrays.equals(gx, ga)) {
			entete.groupements.clear();
			for (int s : gx)
				entete.groupements.add(s);
		}
	}

	public Entete entete() throws AppException {
		Entete entete = (Entete) nodeByKey("E");
		if (entete == null) {
			entete = (Entete) newCellNode("Entete");
			entete.insert();
		}
		return entete;
	}

	@HTCN(id = 1, single = 'E') public class Entete extends Cell.CellNode {

		@HT(id = 9, persist = false) public ArrayInt groupements;

		public ArrayInt getGroupements() {
			return groupements;
		}

	}

	@HTCN(id = 2) public class Contact extends GContact {}

	public void setPresence(int lundi, int jour, boolean matin, boolean plus, int contact) throws AppException{
		Presence p = (Presence) nodeByKey(keyOfPresence(lundi, jour));
		if (p == null){
			if (!plus)
				return;
			p = (Presence) cellDescr.newCellNode(this, "Presence");
			p.lundi = lundi;
			p.jour = jour;
			p.insert();
		}
		ArrayInt ai = matin ? p.matin : p.apm;
		Integer c = new Integer(contact);
		int i = ai.indexOf(c);
		if (plus){
			if (i == -1)
				ai.add(c);
		} else {
			if (i != -1)
				ai.remove(i);
		}
	}
	
	public static String keyOfPresence(int lundi, int jour){
		return "P." + lundi + "." + jour + ".";
	}
	
	@HTCN(id = 3) public class Presence extends CellNode {
		@Override public String[] keys() {
			return AS.as(keyOfPresence(lundi, jour));
		}
		
		@HT(id = 2) private int lundi;

		public int lundi() {
			return lundi;
		}

		public void lundi(int value) {
			if (w(this.lundi, value)) this.lundi = value;
		}

		@HT(id = 3) private int jour;

		public int jour() {
			return jour;
		}

		@HT(id = 4) public ArrayInt matin;

		public ArrayInt getMatin() {
			return matin;
		}

		@HT(id = 5) public ArrayInt apm;

		public ArrayInt getApm() {
			return apm;
		}

	}
	
	public static class Op extends Operation {

		int gac = 0;
		String line;
		int lundi;
		int jour;
		int ac;
		boolean plus;
		boolean matin;

		@Override public String mainLine() {
			return line;
		}

		public StatusPhase phaseFaible() throws AppException {
			gac = arg().getI("gac");

			line = GAC.lineOf(gac);
			int lvl = authChecker.accessLevel(line, "0.", "");
			if (lvl <= 0)
				throw new AppException(MFA.AUTH, gac);
	
			lundi = arg().getI("lundi");
			int js = AS.jsCheck(lundi);
			if (js == -1)
				throw new AppException(MFA.PRES1, js);
			if (js != 1)
				throw new AppException(MFA.PRES2, js);
			
			jour = arg().getI("jour");
			if (jour <= 0 || jour > 7)
				throw new AppException(MFA.PRES3, jour);

			ac = arg().getI("code");
			if (ac <= 0)
				throw new AppException(MFA.PRES4, ac);
			
			int usr = authChecker.getAuthUsr();
			if (usr != 0 && usr != ac)
				throw new AppException(MFA.PRES5, ac);
			
			matin = arg().getI("matin") == 1;
			plus = arg().getI("plus") == 1;
			
			return StatusPhase.transactionSimple;
		}
		
		public void phaseForte() throws AppException {
			GAC cgac = GAC.get(gac);
			if (cgac.contact(ac) == null)
				throw new AppException(MFA.PRES4, ac);
			cgac.setPresence(lundi, jour, matin, plus, ac);
		}
	}
}
