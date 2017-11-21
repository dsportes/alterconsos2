package fr.alterconsos.cell;

import java.io.ByteArrayOutputStream;

import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.IAuthChecker;
import fr.hypertable.Operation;
import fr.hypertable.AppTransaction.StatusPhase;

public class Stats extends Cell {

	public static final CellDescr cellDescr = new CellDescr(Stats.class);
	
	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	private int mois;
	
	public int mois() { return mois; }
	
	private int grp;
	
	public int grp() { return grp; }
	
	private boolean isGac;
	
	public boolean isGac(){ return isGac; }
	
	@Override public void setIds() {
		isGac = column().startsWith("C");
		String s = column().substring(2);
		int i = s.indexOf('.');
		grp = Integer.parseInt(s.substring(0, i));
		mois = (Integer.parseInt(s.substring(i+1)) * 100) + 1;
	}
	
	public static String columnOf(boolean isGac, int grp, int aa, int mm) throws AppException {
		return (isGac ? "C." : "P." ) + grp + "." + ((aa * 100) + mm);
	}

	public static Stats getGac(int gac, int aa, int mm) throws AppException {
		return (Stats) Cell.get("S", columnOf(true, gac, aa, mm), "Stats");
	}

	public static Stats getGap(int gap, int aa, int mm) throws AppException {
		return (Stats) Cell.get("S", columnOf(false, gap, aa, mm), "Stats");
	}
	
	public static String keyOfStatLine(int type, int grpCode, int date, int code){
		return type + "." + grpCode + "." + date + "." + code + ".";
	}

	public void writeAll(WB wb) throws AppException{
		for(CellNode cn : nodesByKey("")) {
			StatLine sl = (StatLine)cn;
			wb.nextRow(sl.type);
			sl.write(wb);
		}
	}

	public void put(int type, int grpCode, int date, int code, 
			String grpInit, String initiales, String nom, 
			int montant, int poids, int quantite, int supplement,
			int qteC, int prixC, int poidsC) throws AppException{
		StatLine sl = (StatLine) nodeByKey(keyOfStatLine(type, grpCode, date, code));
		if (sl == null) {
			sl = (StatLine)cellDescr.newCellNode(this, "StatLine");
			sl.type = type;
			sl.grpCode = grpCode;
			sl.date = date;
			sl.code = code;
			sl.insert();
		}
		sl.grpInit = grpInit;
		sl.initiales = initiales;
		sl.nom = nom;
		sl.montant = montant;
		sl.poids = poids;
		sl.quantite = quantite;
		sl.supplement = supplement;
		sl.quantiteExped = qteC;
		sl.montantExped = prixC;
		sl.poidsExped = poidsC;
	}
	
	@HTCN(id = 2)  public class StatLine extends CellNode {
		
		@Override public String[] keys() {
			return AS.as(keyOfStatLine(type, grpCode, date, code));
		}

		@HT(id = 1) private int type;
		
		@HT(id = 2) private int grpCode;

		@HT(id = 3) private String grpInit;

		@HT(id = 4) private int date;
		
		@HT(id = 5) private int code;

		@HT(id = 6) private String initiales;

		@HT(id = 7) private String nom;

		@HT(id = 8) private int montant;
		
		@HT(id = 9) private int poids;
		
		@HT(id = 10) private int quantite;

		@HT(id = 11) private int supplement;

		@HT(id = 12) private int quantiteExped;
		
		@HT(id = 13) private int montantExped;
		
		@HT(id = 14) private int poidsExped;

		private void write(WB wb) throws AppException{
			int nc = 0;
			wb.write(nc++, new Long(grpCode));
			wb.write(nc++, grpInit);
			wb.write(nc++, AS.aammjj2Date(date));
			wb.write(nc++, initiales);
			wb.write(nc++, new Long(code));
			wb.write(nc++, nom);
			wb.writeE(nc++, (double)montant / 100);
			wb.writeK(nc++, (double)poids / 1000);
			wb.write(nc++, new Long(quantite));
			wb.writeE(nc++, (double)supplement / 100);
			wb.writeE(nc++, (double)montantExped / 100);
			wb.writeK(nc++, (double)poidsExped / 1000);
			wb.write(nc++, new Long(quantiteExped));
		}
	}

	private static void titreGac1(WB wb) throws AppException{
		wb.nextRow(1);
		int nc = 0;
		wb.write(nc++, "Code Groupement");
		wb.write(nc++, "Initiales G");
		wb.write(nc++, "Distribution");
		wb.write(nc++, "Initiales AC");
		wb.write(nc++, "Code AC");
		wb.write(nc++, "Nom AC");
		wb.write(nc++, "Montant");
		wb.write(nc++, "Poids");
		wb.write(nc++, "Nb Lignes");
		wb.write(nc++, "Supplément");
		wb.write(nc++, "Montant Exped");
		wb.write(nc++, "Poids Exped");
		wb.write(nc++, "Quantité Exped");
	}

	private static void titreGac0(WB wb) throws AppException{
		wb.nextRow(0);
		int nc = 0;
		wb.write(nc++, "Code Groupement");
		wb.write(nc++, "Initiales G");
		wb.write(nc++, "Distribution");
		wb.write(nc++, "Initiales P");
		wb.write(nc++, "Code Produit");
		wb.write(nc++, "Nom Produit");
		wb.write(nc++, "Montant");
		wb.write(nc++, "Poids");
		wb.write(nc++, "Quantité");
		wb.write(nc++, "Supplément");
		wb.write(nc++, "Montant Exped");
		wb.write(nc++, "Poids Exped");
		wb.write(nc++, "Quantité Exped");
	}

	private static void titreGap(WB wb) throws AppException{
		wb.nextRow(0);
		int nc = 0;
		wb.write(nc++, "Code Groupe");
		wb.write(nc++, "Initiales G");
		wb.write(nc++, "Expédition");
		wb.write(nc++, "Initiales");
		wb.write(nc++, "Code Produit");
		wb.write(nc++, "Nom Produit");
		wb.write(nc++, "Montant");
		wb.write(nc++, "Poids");
		wb.write(nc++, "Quantité");
		wb.write(nc++, "Supplément");
		wb.write(nc++, "Montant Exped");
		wb.write(nc++, "Poids Exped");
		wb.write(nc++, "Quantité Exped");
	}
	
	private static final int[] cols = {3, 8, 10, 10, 8, 20, 8, 8, 8};

	private static String[][] sheetNames = {{"Produits"}, {"Produits", "Alterconsos"}};

	public static class OpStatsExport extends Operation {

		@Override public String mainLine() {
			return null;
		}

		@Override public StatusPhase phaseFaible() throws AppException {
			IAuthChecker ac = authChecker;
			int grp = ac.getAuthGrp();
			int type = ac.getAuthType();
			int usr = ac.getAuthUsr();
			if (usr != 0){
				resultat.content = "<html><body>animateurs seulements</body></html>";
				resultat.mime = "text/html";
				resultat.brut = true;
				return StatusPhase.brut;
			}
			int aammjj = arg().getI("d", 0);
			int aa = aammjj / 10000;
			int mm = (aammjj / 100) % 100;
			if (aa < 13 || aa > 98 || mm < 1 || mm > 12){
				resultat.content = "<html><body>aamm non valide</body></html>";
				resultat.mime = "text/html";
				resultat.brut = true;
				return StatusPhase.brut;				
			}
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			
			WB wb;
			if (type == 2) {
				wb = new WB(bos, sheetNames[0]);
				titreGap(wb);
			} else {
				wb = new WB(bos, sheetNames[1]);
				titreGac0(wb);
				titreGac1(wb);
			}
			
			Stats s;
			for (int x = 0; x < 12; x++){
				if (type == 1)
					s = Stats.getGac(grp, aa, mm);
				else
					s = Stats.getGap(grp, aa, mm);
				if (s.version() > 0)
					s.writeAll(wb);
				mm++;
				if (mm == 13){
					aa++;
					mm = 1;
				}
			}
			
			wb.setCols(cols, 0);
			if (type == 1)
				wb.setCols(cols, 1);
			wb.close();
			resultat.mime = "application/vnd.ms-excel";
			resultat.bytes = bos.toByteArray();
			return StatusPhase.brut;
		}

		@Override public void phaseForte() throws AppException {}

	}

}
