package fr.alterconsos.cell;

import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Hashtable;

import fr.alterconsos.AppConfig;
import fr.alterconsos.cell.CalendrierGAP.Livr;
import fr.alterconsos.cell.Catalogue.Produit;
import fr.alterconsos.cell.GAPC.GContact;
import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.ArrayInt;
import fr.hypertable.Cell.CellNode;
import fr.hypertable.CellDescr;
import fr.hypertable.DirectoryG;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.HTServlet;
import fr.hypertable.IAppConfig;
import fr.hypertable.IW;
import fr.hypertable.Task;

public class TaskArchive extends Task {
	
	public static final CellDescr cellDescr = new CellDescr(TaskArchive.class);

	public CellDescr cellDescr() {
		return cellDescr;
	}

	IAppConfig cfg;
	
	@Override public void start(byte[] args, String[] uri) throws AppException {
		AppTransaction tr = AppTransaction.tr();
		cfg = HTServlet.appCfg;
		int done = 0;
		tr.startPhaseFaible();
		todolist = cellDescr.read(this, args);
		if (todolist.size() == 0)
			fillTodolist();
		if (todolist.size() == 0)
			tr.endPhase(true);
		else {
			for(IW iw : todolist){
				Todo todo = (Todo)iw;
				if (todo.debut != 0)
					done++;
				else {
					try {
						doit1(todo);
						tr.endPhase(true);
						tr.startPhaseForte("S", true);
						doit2(todo);
						done++;
						tr.endPhase(true);
						break;
					} catch (Throwable ex){
						// fini en erreur : e-mail le report et l'exception
						tr.endPhase(false);
						report(ex);
						return;
					}
				}
			}
		}
		if (todolist.size() == done) {
			// fini : e-mail le report
			report(null);
			return;
		}
		// relance la tache pour traiter la livraison suivante
		enQueue(0);
	}
	
	private void report(Throwable ex){
		StringBuffer sb = new StringBuffer();
		if (ex != null){
			sb.append("Terminaison en exception de la tâche d'archivage\n");
			sb.append(AS.stackTrace(ex));
			sb.append("\n---------------------------\n");
		} else
			sb.append("Fin normale de la tâche d'archivage\n");
		sb.append(todolist.size() + " livraison(s) à archiver\n");
		sb.append("---------------------------\n");
		DecimalFormat df = new DecimalFormat( "0.000" );
		for(IW iw : todolist){
			Todo todo = (Todo)iw;
			sb.append(todo.gap).append(" - ").append(todo.initiales)
			.append(" - Livraison:").append(todo.codeLivr);
			if (todo.debut != 0) {
				sb.append(" - Lancement: ").append(cfg.sdf1().format(new Date(todo.debut)));
				double d = ((double)todo.duree) / 1000;
				sb.append(" - Durée: ").append(df.format(d)).append(" sec.\n");
			}
		}
		sb.append("---------------------------\n");
		AppConfig.mailToAdmin(sb.toString());
	}
	
	private ArrayList<IW> todolist;

	@Override public byte[] getArgs() {
		try {
			return cellDescr.serialize(todolist);
		} catch (AppException e) {
			return new byte[0];
		}
	}

	@Override public String getName() {
		return "TaskArchive";
	}

	@HTCN(id = 1) public class Todo implements IW {
		public long version = 0;
		public void w() {}
		@HT(id = 1) public int gap;
		@HT(id = 2) public String initiales;
		@HT(id = 3) public int codeLivr;
		@HT(id = 4) public long debut;
		@HT(id = 5) public int duree;
		@HT(id = 6) public ArrayInt gacs = new ArrayInt();
	}
	
	private class GapCI {
		int gap;
		String initiales;
		GapCI(int g, String s){
			gap = g;
			initiales = s;
		}
	}
	
	private void fillTodolist() throws AppException {
		Hashtable<Integer, GapCI> lst = new Hashtable<Integer, GapCI>();
		DirectoryG master = DirectoryG.get(0);
		for(CellNode cn : master.nodesByKey(DirectoryG.keyOfEntryCp(0))){
			DirectoryG.Entry e = (DirectoryG.Entry)cn;
			DirectoryG dir = DirectoryG.get(e.code());
			for(CellNode cn2 : dir.nodesByKey(DirectoryG.keyOfEntryCp(2))){
				DirectoryG.Entry e2 = (DirectoryG.Entry)cn2;
				lst.put(e2.code(), new GapCI(e2.code(), e2.initiales()));
			}
		}
		int aj = cfg.aujourdhui();
		for(GapCI g : lst.values()){
//			int x;
			CalendrierGAP cal = CalendrierGAP.get(g.gap);
			for (CellNode cn : cal.nodesByKey(Calendrier.gapKey(g.gap))){
				Livr l = (Livr) cn;
//				if (g.gap == 1 && l.codeLivr() == 601)
//					x = aj;
				if (l.gac() != 0 || l.suppr() != 0 || l.archivage() != 0)
					continue;
//				x = l.archive();
				if (l.archive() >= aj)
					continue;
				ArrayList<Calendrier.Livr> slst = cal.sousLivr(g.gap, l.codeLivr());
				Todo todo = new Todo();
				todo.gap = g.gap;
				todo.initiales = g.initiales;
				todo.codeLivr = l.codeLivr();
				todo.debut = 0;
				todo.duree = 0;
				for(Calendrier.Livr sl : slst)
					todo.gacs.add(sl.gac());
				todolist.add(todo);
			}
		}
	}
	
	private Hashtable<Integer, LivrC> lcs = new Hashtable<Integer, LivrC>();

	private Hashtable<Integer, GAC> lgac = new Hashtable<Integer, GAC>();

	private CalendrierGAP cal;
	
	private GAP gapC;
	
	private Catalogue cat;
	
	private void doit1(Todo todo) throws AppException {
		gapC = GAP.get(todo.gap);
		cat = Catalogue.get(todo.gap);
		for(int gac : todo.gacs) {
			lcs.put(gac, LivrC.get(todo.gap, todo.codeLivr, gac));
			lgac.put(gac, GAC.get(gac));
		}
	}
	
	private void doit2(Todo todo) throws AppException {
		todo.debut = System.currentTimeMillis();
		cal = CalendrierGAP.get(todo.gap);
		Livr livr = cal.livr(todo.codeLivr);
		int exped = livr.expeditionRaw();
		Stats stGap = Stats.getGap(todo.gap, exped / 10000, (exped / 100) % 100);
		
		for(int gac : todo.gacs) {
			LivrC lc = lcs.get(gac);
			GAC gacC = lgac.get(gac);
			GContact c0 = gacC.contact(1);
			Calendrier.Livr sLivr = cal.livr(todo.gap, todo.codeLivr, gac);
			int distrib = sLivr.distrib();
			Stats stGac = Stats.getGac(gac, distrib / 10000, (distrib / 100) % 100);
			
			for(CellNode cn : lc.nodesByKey(LivrC.keyOfAc1p())){
				LivrC.Ac x = (LivrC.Ac)cn;
				GContact c = gacC.contact(x.ac);
				stGac.put(1, todo.gap, distrib, x.ac, 
						todo.initiales, (c == null ? "" : c.initiales()), (c == null ? "" : c.nom()), 
						x.prix(), x.poids(), x.nblg(), x.suppl(), 0, 0, 0);
			}
			
			for(CellNode cn : lc.nodesByKey(LivrC.keyOfApPr2p())){
				LivrC.ApPr x = (LivrC.ApPr)cn;
				Produit p = cat.produit(x.prod());
				GContact c = gapC.contact(x.ap);
				
				stGac.put(0, todo.gap, distrib, x.prod(), todo.initiales,
						(c == null ? "" : c.initiales()), (p == null ? "" : p.nom()), 
						x.prix(), x.poids(), x.qte(), 0, x.qteC(), x.prixC(), x.poidsC());
				stGap.put(0, gac, exped, x.prod(), (c0 == null ? "" : c0.initiales()), 
						(c == null ? "" : c.initiales()), (p == null ? "" : p.nom()), 
						x.prix(), x.poids(), x.qte(), 0, x.qteC(), x.prixC(), x.poidsC());
			}

			for(CellNode cn : lc.nodesByKey(LivrC.keyOfAp1p())){
				LivrC.Ap x = (LivrC.Ap)cn;
				if (x.suppl() == 0)
					continue;
				GContact c = gapC.contact(x.ap);
				int cp = x.ap * 10000;
				stGac.put(0, todo.gap, distrib, cp, todo.initiales,
						(c == null ? "" : c.initiales()), "Suppléments", 
						0, 0, 0, x.suppl(), 0, 0, 0);
				stGap.put(0, gac, exped, cp, (c0 == null ? "" : c0.initiales()), 
						(c == null ? "" : c.initiales()), "Suppléments", 
						0, 0, 0, x.suppl(), 0, 0, 0);
			}
		}
		
		int aj = cfg.aujourdhui();
		cal.setArchivage(todo.codeLivr, aj);
		todo.duree = (int)( System.currentTimeMillis() - todo.debut);
	}

}
