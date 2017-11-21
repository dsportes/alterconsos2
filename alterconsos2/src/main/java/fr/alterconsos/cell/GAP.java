package fr.alterconsos.cell;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import fr.alterconsos.MFA;
import fr.hypertable.AppException;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.HTCN;

public class GAP extends GAPC {
	public static final CellDescr cellDescr = new CellDescr(GAP.class);

	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	public static String lineOf(int gap) throws AppException {
		if (gap <= 0) throw new AppException(MFA.GAP, gap);
		return "P." + gap + ".";
	}

	public static String colOfLivr(int livr, int gac) throws AppException {
		if (livr < 1 || livr > 999) throw new AppException(MFA.CALLIVR, livr);
		if (gac == 0) return "" + livr + ".";
		return "" + livr + "." + gac + ".";
	}

	public static Directory.Entry gapEntry(int gap) {
		return Directory.entryG(2, gap);
	}

	public static GAP get(int gap) throws AppException {
		if (gap <= 0) throw new AppException(MFA.GAP, gap);
		return (GAP) Cell.get(lineOf(gap), "0.", "GAP", 0);
	}

	public static List<Integer> validGaps(Collection<Integer> gaps, boolean etSuppr) {
		ArrayList<Integer> lst = new ArrayList<Integer>();
		if (gaps != null) for (int gap : gaps) {
			Directory.Entry e = Directory.entryG(2, gap);
			if (e == null)
				continue;
			if (e.suppr() == 0 || etSuppr) lst.add(gap);
		}
		return lst;
	}

	private Contact c1;

	public Contact c1() {
		return c1;
	}

//	@Override public void compile() throws AppException {
//		AppTransactionS tr = AppTransactionS.tr();
//		int at = tr.authChecker.getAuthType();
//		if (version() == -1 && (at == AuthVerif.ADMINGEN))
//			return;
//		super.compile();
//		c1 = (Contact) contact(1);
//		if (c1 == null) {
//			int c = code();
//			if ((at == AuthVerif.ADMINGEN)) {
//				c1 = (Contact) newContact(1, "$" + line() + "$", "$" + line() + "$");
//			} else {
//				DirectoryA dir = tr.myDir();
//				DirectoryA.Entry e = dir.entry(2, c);
//				if (e == null)
//					c1 = (Contact) newContact(1, "$" + line() + "$", "$" + line() + "$");
//				else {
//					c1 = (Contact) newContact(1, e.label(), e.initiales());
//					c1.postit(e.postit());
//				}
//			}
//			c1.setUrl();
//		}
//	}

	@HTCN(id = 2) public class Contact extends GContact {}

//	public void addDir(int dir) throws AppException {
//		super.addDir(dir);
//	}
//
//	public void removeDir(int dir) throws AppException {
//		super.removeDir(dir);
//	}
//
//	@HTCN(id = 9, single = 'D') public class DirIndex extends Cell.DirIndex {}

	@Override public void addedDir(int dir) throws AppException {
		CalendrierGAP cg = CalendrierGAP.get(code());
		cg.addDir(dir);
	}

	@Override public void removedDir(int dir)  throws AppException {
		CalendrierGAP cg = CalendrierGAP.get(code());
		cg.removeDir(dir);
	}

}
