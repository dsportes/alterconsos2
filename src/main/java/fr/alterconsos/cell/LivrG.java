package fr.alterconsos.cell;

import java.util.ArrayList;
import java.util.Hashtable;
import java.util.LinkedList;
import java.util.List;
import java.util.logging.Logger;

import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.ArrayInt;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.HTServlet;
import fr.hypertable.IW;
import fr.hypertable.Task;

public class LivrG extends Livr implements ICpt {
	public static final CellDescr cellDescr = new CellDescr(LivrG.class);
	@Override public CellDescr cellDescr() { return cellDescr;}

	public static final Logger log = Logger.getLogger("fr.alterconsos");

	public static LivrG get(int gac) throws AppException {
		return (LivrG) Cell.get(GAC.lineOf(gac), "0.", "LivrG");
	}

	public static String keyOfGac(int gap, int codeLivr) {
		return "A." + gap + "." + codeLivr + ".";
	}

	public static String keyOfAc1(int gap, int codeLivr, int ac) {
		return "B." + ac + "." + gap + "." + codeLivr + ".";
	}
	
	public static String keyOfAc2(int gap, int codeLivr, int ac) {
		return "C." + gap + "." + codeLivr + "." + ac + ".";
	}

	public void purge(ArrayList<Calendrier> cals){
		ArrayList<CellNode> x = new ArrayList<CellNode>();
		Calendrier.CodeLivrSet cls = new Calendrier.CodeLivrSet(cals);
		for(CellNode cn : nodesByKey("A.")) {
			Gac g = (Gac)cn;
			if (!cls.has(g.gap, g.codeLivr))
				x.add(g);
		}
		for(CellNode cn : nodesByKey("C.")) {
			Ac g = (Ac)cn;
			if (!cls.has(g.gap, g.codeLivr))
				x.add(g);
		}
		for(CellNode cn : x)
			cn.remove();
	}
	
	public Cpt getCpt(Calendrier.Livr l, int usr) {
		if (usr > 1) {
			LivrG.Ac x = (LivrG.Ac)this.nodeByKey(LivrG.keyOfAc2(l.gap(), l.codeLivr(), usr));
			return x == null ? new Cpt(l) : new Cpt(l, x.prix(), x.poids(), x.nblg(), x.db(), x.cr(), 
					(x.nblg() != 0 ? 1 : 0), x.panierAtt(), x.regltFait());
		}
		else {
			LivrG.Gac x = (LivrG.Gac) this.nodeByKey(LivrG.keyOfGac(l.gap(), l.codeLivr()));
			return x == null ? new Cpt(l) : new Cpt(l, x.prix(), x.poids(), x.nblg(), x.db() + x.dbj(), 
					x.cr() + x.crj(), x.nbac(), x.panierAtt(), x.regltFait());
		}
	}

	public void copyAc(int gap, int codeLivr, Livr.Ac src) throws AppException {
		Ac t = (Ac) nodeByKey(keyOfAc1(gap, codeLivr, src.ac));
		if (t == null) {
			t = (Ac) newCellNode("Ac");
			t.codeLivr = codeLivr;
			t.gap = gap;
			t.ac = src.ac;
			t.insert();
		}
		t.w();
		t.panierAtt = src.panierAtt;
		t.regltFait = src.regltFait;
		t.cheque = src.cheque;
		t.db = src.db;
		t.cr = src.cr;
		t.flags = src.flags;
		t.nblg = src.nblg;
		t.poids = src.poids;
		t.prix = src.prix;
		t.payePar = src.payePar;
		t.payePour = src.payePour;
		t.suppl = src.suppl;
	}

	public void copyGac(int gap, int codeLivr, Livr.Gac src) throws AppException {
		Gac t = (Gac) nodeByKey(keyOfGac(gap, codeLivr));
		if (t == null) {
			t = (Gac) newCellNode("Gac");
			t.codeLivr = codeLivr;
			t.gap = gap;
			t.insert();
		}
		t.w();
		t.nbac = src.nbac;
		t.panierAtt = src.panierAtt;
		t.regltFait = src.regltFait;
		t.cheque = src.cheque;
		t.remiseCheque = src.remiseCheque;
		t.db = src.db;
		t.cr = src.cr;
		t.dbj = src.dbj;
		t.crj = src.crj;
		t.flags = src.flags;
		t.nblg = src.nblg;
		t.poids = src.poids;
		t.prix = src.prix;
		t.poidsC = src.poidsC;
		t.poidsD = src.poidsD;
		t.prixC = src.prixC;
		t.prixD = src.prixD;
		t.suppl = src.suppl;
	}

	@HTCN(id = 2) public class Gac extends Livr.Gac {
		@Override public String[] keys() {
			return AS.as(keyOfGac(gap, codeLivr));
		};
		
		@HT(id = 3) public int gap;

		@HT(id = 4) public int codeLivr;
		
	}

	@HTCN(id = 3) public class Ac extends Livr.Ac {
		@Override public String[] keys() {
			return AS.as(keyOfAc1(gap, codeLivr, ac), keyOfAc2(gap, codeLivr, ac));
		};
		
		@HT(id = 3) public int gap;

		@HT(id = 4) public int codeLivr;
		
	}

	public static class ResyncLivrG extends Task {
		public static final CellDescr cellDescr = new CellDescr(ResyncLivrG.class);

		public CellDescr cellDescr() {
			return cellDescr;
		}

		public ResyncLivrG() {}

		public String getName() {
			return "ResyncLivrG";
		}

		private ArrayList<IW> outArgs = new ArrayList<IW>();

		public byte[] getArgs() {
			try {
				return cellDescr.serialize(outArgs);
			} catch (AppException e) {
				return new byte[0];
			}
		}
		
		int gap;
		
		Hashtable<Integer, LinkedList<Integer>> toNotif;
		
		public ResyncLivrG startTodo(int gap){
			this.gap = gap;
			toNotif = new Hashtable<Integer, LinkedList<Integer>>();
			return this;
		}
		
		public void addGacLivr(int gac, int cLivr){
			LinkedList<Integer> livrs = toNotif.get(gac);
			if (livrs == null) {
				toNotif.put(gac, new LinkedList<Integer>());
				livrs = toNotif.get(gac);
			}
			if (!livrs.contains(cLivr))
				livrs.add(cLivr);
		}
		
		public void doIt(){
			for(int gac : toNotif.keySet()){
				UpdList l = new UpdList();
				l.gap = this.gap;
				l.gac = gac;
				l.livrs.addAll(toNotif.get(gac));
				outArgs.add(l);				
			}
			endTodo();
		}

		public void endTodo(){
			if (outArgs.size() == 0)
				return;
			int dir = AppTransaction.tr().authChecker.getAuthDir();
			enQueue(dir);
		}

		public void start(byte[] args, String[] uri) throws AppException {
			List<IW> inArgs = cellDescr.read(this, args);
			AppTransaction t = AppTransaction.tr();
			int i = 0;
			for (IW iw : inArgs) {
				UpdList arg = (UpdList) iw;
				if (i == 0) {
					StringBuffer sb = new StringBuffer();
					for(int x : arg.livrs)
						sb.append(x + " ");
					log.fine("RESYNCLIVRG - à traiter:" + inArgs.size() + ". Traitement de  gap:" + arg.gap + " livrs:" + sb.toString() + " gac:" + arg.gac);
					doUpdate(t, arg);
				} else
					outArgs.add(arg);
				i++;
			}
			endTodo();
		}

		private void doUpdate(AppTransaction t, UpdList arg) throws AppException {
			t.startPhaseFaible();
			try {
				t.startPhaseForte(GAP.lineOf(arg.gap), true);
				StringBuffer sb = new StringBuffer();
				LivrG livrG = LivrG.get(arg.gac);
				for(int cLivr : arg.livrs) {
					sb.append(cLivr + " ");
					LivrC lc = LivrC.get(arg.gap, cLivr, arg.gac);
					for(CellNode cn : lc.nodesByKey(LivrC.keyOfAc1p()))
						livrG.copyAc(arg.gap, cLivr, (LivrC.Ac)cn);
					Livr.Gac x = (Livr.Gac)lc.nodeByKey(LivrC.keyOfGac());
					if (x != null)
						livrG.copyGac(arg.gap, cLivr, x);
				}
				t.endPhase(true);
				// HTServlet.log.fine("RESYNCLIVRG done - gap:" + arg.gap + " gac:" + arg.gac + " livrs:" + sb.toString());
			} catch (AppException e) {
				HTServlet.log.severe("RESYNCLIVRG " + " Exc:" + e.toString());
				try {
					Thread.sleep(2000);
				} catch (InterruptedException ex) {}
			}
		}

		@HTCN(id = 1) public class UpdList implements IW {
			public long version = 0;
			public void w() {}
			@HT(id = 1) public int gap;
			@HT(id = 2) public int gac;
			@HT(id = 4) public ArrayInt livrs = new ArrayInt();
		}
	}
}
