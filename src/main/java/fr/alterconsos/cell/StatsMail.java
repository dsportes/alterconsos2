package fr.alterconsos.cell;

import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.ArrayInt;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.HT;
import fr.hypertable.HTCN;

public class StatsMail extends Cell {
	public static final CellDescr cellDescr = new CellDescr(StatsMail.class);
	
	@Override public CellDescr cellDescr() {
		return cellDescr;
	}
	
	private int code;

	@Override public void setIds() {
		int i = column().indexOf('.');
		code = Integer.parseInt(column().substring(0, i));
	}

	public int code() {
		return code;
	}

	public static String columnOf(int dir) throws AppException {
		return dir + ".";
	}

	public static StatsMail get(int dir)throws AppException {
		return (StatsMail) Cell.get("D", columnOf(dir), "StatsMail");
	}
	
	public static String keyOfStat(int type, int grp) {
		return "C." + type + "." + grp + ".";
	}
		
	public void start(int type, int grp, String lot) throws AppException{
		Stat t = (Stat)nodeByKey(keyOfStat(type, grp));
		if (t == null){
			t = (Stat) cellDescr.newCellNode(this, "Stat");
			t.type = type;
			t.grp = grp;
			t.insert();
		}
		t.w();
		t.lot = lot;
		t.status = 1;
		t.startTime = t.version();
	}

	public void ok(int type, int grp, String lot, ArrayInt cpts) throws AppException{
		Stat t = (Stat)nodeByKey(keyOfStat(type, grp));
		if (t == null){
			t = (Stat) cellDescr.newCellNode(this, "Stat");
			t.type = type;
			t.grp = grp;
			t.insert();
		}
		t.w();
		t.lot = lot;
		t.status = 0;
		t.endTime = t.version();
		t.cpts.clear();
		if (cpts != null) {
			t.statusText = "";
			t.cpts.addAll(cpts);
		} else {
			t.statusText = "Aucun message à envoyer";			
		}
	}

	public void ko(int type, int grp, String lot, String statusText) throws AppException{
		Stat t = (Stat)nodeByKey(keyOfStat(type, grp));
		if (t == null){
			t = (Stat) cellDescr.newCellNode(this, "Stat");
			t.type = type;
			t.grp = grp;
			t.insert();
		}
		t.w();
		t.lot = lot;
		t.status = 2;
		t.statusText = statusText;
		t.endTime = t.version();
	}

	public Stat get(int type, int grp){
		return (Stat)nodeByKey(keyOfStat(type, grp));
	}
	
	@HTCN(id = 2) public class Stat extends CellNode {
		@Override public String[] keys() {
			return AS.as(keyOfStat(type, grp));
		}

		@HT(id = 1) protected int type;
		
		@HT(id = 2) protected int grp;

		@HT(id = 3) protected String lot;

		@HT(id = 4) protected int status;

		@HT(id = 5) protected long startTime;

		@HT(id = 6) protected long endTime;

		@HT(id = 7) protected ArrayInt cpts;

		@HT(id = 8) protected String statusText;
	}
}
