package fr.alterconsos;

import java.util.ArrayList;
import java.util.List;

import fr.alterconsos.cell.Directory;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.ArrayInt;
import fr.hypertable.CellDescr;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.IW;
import fr.hypertable.Task;

public class Toto extends Task {
	public static final CellDescr cellDescr = new CellDescr(Toto.class);
	public CellDescr cellDescr() { return cellDescr; }

	public Toto(){}
	
	private ArrayList<IW> outArgs = new ArrayList<IW>();
	public byte[] getArgs(){
		try {
			return cellDescr.serialize(outArgs);
		} catch (AppException e) {
			return new byte[0];
		}
	}

	public String getName(){
		return "toto1";
	}
	
	private List<IW> inArgs;
	public void start(byte[] args, String[] uri)  throws AppException {
		try {
			if (args != null)
				inArgs = cellDescr.read(this, args);
			AppTransaction t = AppTransaction.tr();
			Directory dir = t.myDir();
			t.startPhaseFaible();
			t.startPhaseForte("D.", false);
			System.out.println(dir.label());
			System.out.println(cellDescr.toJSON(null, inArgs).toString());
			t.endPhase(true);
			t.startPhaseFaible();
			t.startPhaseForte("D.", false);
			System.out.println(dir.label());
			System.out.println(cellDescr.toJSON(null, inArgs).toString());
			t.endPhase(true);
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public void testQ(String data){
		A a = new A();
		a.param1 = data;
		a.livrs = new ArrayInt();
		a.livrs.add(1);
		a.livrs.add(2);
		outArgs.add(a);
		A b = new A();
		b.param1 = "deux";
		b.livrs = new ArrayInt();
		b.livrs.add(1);
		b.livrs.add(2);
		outArgs.add(b);
		enQueue(1);
	}
	
	public long lastLoad = 0;

	@HTCN(id = 1) public class A implements IW {
		public long version = 12;

		public void w(){
			lastLoad = version;
		}
		
		@HT(id = 14) public String param1;

		@HT(id = 18) private ArrayInt livrs;

	}
	
	public static void main(String[] args){
		try {
			ArrayList<IW> l = new ArrayList<IW>();
			Toto t = new Toto();
			A a1 = t.new A();
			a1.param1 = "115";
			a1.livrs = new ArrayInt();
			a1.livrs.add(3);
			a1.livrs.add(4);
			l.add(a1);
			A a2 = t.new A();
			a2.param1 = "125";
			l.add(a2);
			System.out.println(cellDescr.toJSON(null, l).toString());
			byte[] bytes = cellDescr.serialize(l);
			l.clear();
			List<IW> res = cellDescr.read(t, bytes);
			System.out.println(cellDescr.toJSON(null, res).toString());			
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
}
