package fr.alterconsos.cell;

import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Date;

import fr.alterconsos.AppConfig;
import fr.alterconsos.cell.Calendrier.CodeLivrSet;
import fr.alterconsos.cell.Calendrier.LivrToPurge;
import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.ArrayInt;
import fr.hypertable.ArrayString;
import fr.hypertable.CellDescr;
import fr.hypertable.DirectoryG;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.HTServlet;
import fr.hypertable.IAppConfig;
import fr.hypertable.IW;
import fr.hypertable.Task;
import fr.hypertable.Versions;
import fr.hypertable.Cell.CellNode;

public class TaskPurge extends Task {

	public static final CellDescr cellDescr = new CellDescr(TaskPurge.class);
	
	public CellDescr cellDescr() {
		return cellDescr;
	}

	IAppConfig cfg;
	
	private ArrayList<IW> todolist;

	@HTCN(id = 1) public class Todo implements IW {
		public long version = 0;
		public void w() {}
		@HT(id = 1) public int gapgac;
		@HT(id = 2) public int grp;
		@HT(id = 3) public String initiales;
		@HT(id = 4) public long debut;
		@HT(id = 5) public int duree;
		@HT(id = 6) public ArrayString contacts = new ArrayString();
		@HT(id = 7) public ArrayInt produits = new ArrayInt();
		@HT(id = 8) public ArrayInt livraisons = new ArrayInt();
		@HT(id = 9) public ArrayInt dirs = new ArrayInt();
	}

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
						tr.endPhase(true);
						todo.debut = System.currentTimeMillis();
						ArrayList<String> v2del = new ArrayList<String>();
						String line = null;
						if (todo.gapgac == 1){
							line = "C." + todo.grp + ".";
							tr.startPhaseForte(line, true);
							purgeGac(line, todo, v2del);
						} else {
							line = "P." + todo.grp + ".";
							tr.startPhaseForte(line, true);
							purgeGap(line, todo, v2del);							
						}
						if (v2del.size() != 0) {
							Versions versions = Versions.get(line);
							versions.delRawVersions(v2del);
						}
						done++;
						todo.duree = (int)( System.currentTimeMillis() - todo.debut);
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
		// relance la tache pour traiter le gap / gac suivant
		enQueue(0);
	}

	private void report(Throwable ex){
		StringBuffer sb = new StringBuffer();
		if (ex != null){
			sb.append("Terminaison en exception de la tâche de purge\n");
			sb.append(AS.stackTrace(ex));
			sb.append("\n---------------------------\n");
		} else
			sb.append("Fin normale de la tâche de purge\n");
		sb.append(todolist.size() + " groupe(s) / groupement(s) à traiter\n");
		sb.append("---------------------------\n");
		DecimalFormat df = new DecimalFormat( "0.000" );
		for(IW iw : todolist){
			Todo todo = (Todo)iw;
			sb.append(todo.gapgac == 1 ? "groupe " : "groupement ")
			.append(todo.grp).append(" - ").append(todo.initiales);
			if (todo.debut != 0) {
				sb.append(" - Lancement: ").append(cfg.sdf1().format(new Date(todo.debut)));
				double d = ((double)todo.duree) / 1000;
				sb.append(" - Durée: ").append(df.format(d)).append(" sec.").append("\n");
				if (todo.gapgac == 1){
					if (todo.contacts.size() != 0) {
						sb.append(" alterconso(s) purgé(s): ").append(todo.contacts.size()).append("\n");
						for(String s : todo.contacts)
							sb.append("  ").append(s);
						sb.append("\n");
					}
				} else {
					if (todo.contacts.size() != 0) {
						sb.append(" producteur(s) purgé(s): ").append(todo.contacts.size()).append("\n");
						for(String s : todo.contacts)
							sb.append("  ").append(s);
						sb.append("\n");
					}
					if (todo.livraisons.size() != 0) {
						sb.append(" livraison(s) purgée(s): ").append(todo.livraisons.size()).append("\n");
						for(int s : todo.livraisons)
							sb.append(" ").append(s);
						sb.append("\n");
					}
					if (todo.produits.size() != 0) {
						sb.append(" produit(s) purgé(s): ").append(todo.produits.size()).append("\n");
						for(int s : todo.produits)
							sb.append("  ").append(s);
						sb.append("\n");
					}
				}
			} else
				sb.append("\n");
		}
		sb.append("---------------------------\n");
		// AppConfig.log.severe(sb.toString());
		AppConfig.mailToAdmin(sb.toString());
	}

	@Override public byte[] getArgs() {
		try {
			return cellDescr.serialize(todolist);
		} catch (AppException e) {
			return new byte[0];
		}
	}

	@Override public String getName() {
		return "TaskPurge";
	}

	private void fillTodolist() throws AppException {
		DirectoryG master = DirectoryG.get(0);
		for(CellNode cn : master.nodesByKey(DirectoryG.keyOfEntryCp(0))){
			DirectoryG.Entry e = (DirectoryG.Entry)cn;
			DirectoryG dir = DirectoryG.get(e.code());
			for(int t = 2; t > 0; t--)
				for(CellNode cn2 : dir.nodesByKey(DirectoryG.keyOfEntryCp(t))){
					DirectoryG.Entry e2 = (DirectoryG.Entry)cn2;
					if (e2.suppr() != 0)
						continue;
					boolean found = false;
					for(IW iw : todolist) {
						Todo td = (Todo)iw;
						if (td.gapgac == t && td.grp == e2.code) {
							found = true;
							break;
						}
					}
					if (!found) {
						Todo todo = new Todo();
						todo.gapgac = t;
						todo.grp = e2.code();
						todo.initiales = e2.initiales();
						ArrayInt dx = e2.dirs();
						todo.dirs.addAll(dx);
						todolist.add(todo);
					}
				}
		}
	}

	private void purgeGac(String line, Todo todo, ArrayList<String> v2del) throws AppException{
		GAC gapC = GAC.get(todo.grp);
		todo.contacts = gapC.purgeContacts(v2del);
		
		ArrayList<Calendrier> cals = new ArrayList<Calendrier>();
		for(Integer dir : todo.dirs)
			cals.add(Calendrier.get(dir));
		LivrG lg = LivrG.get(todo.grp);
		lg.purge(cals);
	}

	private void purgeGap(String line, Todo todo, ArrayList<String> v2del) throws AppException{
		GAP gapC = GAP.get(todo.grp);
		todo.contacts = gapC.purgeContacts(v2del);
		
		ArrayList<Calendrier> cals = new ArrayList<Calendrier>();
		for(Integer dir : todo.dirs)
			cals.add(Calendrier.get(dir));

		for(Calendrier cal : cals) {
			LivrToPurge l2p = cal.getLivrToPurge(todo.grp);
			l2p.purge();
		}
		
		LivrP lp = LivrP.get(todo.grp);
		lp.purge(cals);

		CalendrierGAP cgap = CalendrierGAP.get(todo.grp);
		LivrToPurge l2p = cgap.getLivrToPurge(todo.grp).purge();
		CodeLivrSet cls = new CalendrierGAP.CodeLivrSet(cals);
	
		AppTransaction tr = AppTransaction.tr();
		for(int codeLivr : l2p.listCodeLivr()) {
			todo.livraisons.add(codeLivr);
			
			for(int gac : l2p.gacsOf(codeLivr))	{
				String col = codeLivr + "." + gac + ".";
				v2del.add(Versions.keyOf("LivrC", col));
				tr.provider().purgeCellFromStorage(line, col, "LivrC");
			}
		}
				
		Catalogue cat = Catalogue.get(todo.grp);
		cat.purge(cls, todo.produits);
	}

}
