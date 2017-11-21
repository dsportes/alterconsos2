package fr.alterconsos.cell;

import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.ArrayInt;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.HT;
import fr.hypertable.HTCN;

public class TraceMail extends Cell {
	public static final CellDescr cellDescr = new CellDescr(TraceMail.class);
	
	@Override public CellDescr cellDescr() {
		return cellDescr;
	}
	
	private boolean isGAC;

	private int code;

	@Override public void setIds() {
		String s = line().substring(2);
		code = Integer.parseInt(s.substring(0, s.length() - 1));
		isGAC = line().startsWith("C.");
	}

	public int code() {
		return code;
	}

	public int type() {
		return isGAC() ? 1 : 2;
	}

	public boolean isGAC() {
		return isGAC;
	}

	public static String lineOf(int authType, int grp) throws AppException {
		return (authType == 1 ? "C." : "P.") + grp + ".";
	}

	public static TraceMail get(int authType, int grp)throws AppException {
		return (TraceMail) Cell.get(lineOf(authType, grp), "0.", "TraceMail", 0);
	}
	
	public static String keyOfContact(int code) {
		return "C." + code + ".";
	}
		
	public int setTrace(int code, String initiales, String lot, int status, String statusText, String to, int taille) throws AppException{
		Trace t = (Trace)nodeByKey(keyOfContact(code));
		if (t == null){
			t = (Trace) cellDescr.newCellNode(this, "Trace");
			t.code = code;
			t.insert();
		}
		t.w();
		t.lot = lot;
		t.status = status;
		t.statusText = statusText;
		t.to = to;
		t.initiales = initiales;
		t.taille = taille;
		return status;
	}
	
	public ArrayInt getCpts() {
		ArrayInt r = new ArrayInt();
		for(int i = 0; i < 5 ; i++)
			r.add(0);
		for(CellNode cn : nodesByKey("C.")){
			Trace t = (Trace) cn;
			if (t.status >= 0 && t.status < 5)
				r.set(t.status, r.get(t.status) + 1);
		}
		return r;
	}
	
	public Trace getTrace(int code){
		Trace t = (Trace) nodeByKey(keyOfContact(code));
		return t;
	}
	
	@HTCN(id = 2) public class Trace extends CellNode {
		@Override public String[] keys() {
			return AS.as(keyOfContact(code));
		}

		@HT(id = 1) protected int code;

		@HT(id = 2) protected String initiales;

		public String lot() {
			return lot;
		}
		@HT(id = 3) protected String lot;

		@HT(id = 4) protected int status;

		@HT(id = 5) protected String statusText;

		@HT(id = 6) protected String to;

		@HT(id = 7) protected int taille;

	}
}
