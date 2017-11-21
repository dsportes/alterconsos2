package fr.alterconsos.cell;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

import com.Ostermiller.util.Base64;

import fr.alterconsos.cell.GAPC.GContact;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.HTServlet;
import fr.hypertable.IAuthChecker;
import fr.hypertable.MF;
import fr.hypertable.Operation;
import fr.hypertable.AppTransaction.StatusPhase;

public class ImportCmd extends Operation {

	@Override public String mainLine() {
		return null;
	}

	GAC gac;
	StringWriter sw = new StringWriter();
	boolean first = true;
	int at;
	int au;
	int ac;
	int grp;
	// int dir;
	int cible;
	GContact contact;
	Workbook workbook;
	Sheet sheet;
	int dateLivr;

	@Override public StatusPhase phaseFaible() throws AppException {
		try {
			AppTransaction tr = AppTransaction.tr();
			IAuthChecker ack = tr.authChecker;
			// dir = ack.getAuthDir();
			at = ack.getAuthType();
			au = ack.getAuthUsr();
			cible = arg().getI("cible", 0);
			if (at != 1 && cible == 0) 
				return end("Opération réservée aux animateurs de groupe et alterconsos.");
			grp = cible != 0 ? cible : ack.getAuthGrp();
			gac = GAC.get(grp);
			String op = getOpName();
			byte[] bytes;
			if ("bdc".equals(op)) {
				bytes = tr.uploadFile();
			} else {
				String xls = arg().getS("xls", null);
				if (xls == null || xls.length() == 0) return end("Fichier xls vide.");
				try {
					bytes = Base64.decodeToBytes(xls);
					if (bytes == null || bytes.length == 0) return end("Fichier xls vide.");
				} catch (Exception e) {
					return end("Fichier transmis corrompu (b64).");
				}
			}
			try {
				workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes));
			    sheet = workbook.getSheetAt(0);
				if (sheet == null) return end("Fichier transmis corrompu (Excel, pas d'onglet).");
			} catch (Exception e) {
				return end("Fichier transmis non Excel.");
			}
			
			Row row = sheet.getRow(2);
			if (row == null) return end("Fichier Excel transmis non conforme (ligne 3 vide).");
			Cell dl = row.getCell(0);
			if (dl == null) return end("Fichier Excel transmis non conforme (cellule A3).");
			String dls = dl.getStringCellValue();
			if (dls == null || !dls.startsWith("DL.") || dls.length() != 9) 
				return end("Fichier Excel transmis non conforme (cellule A3).");
			try {
				dateLivr = Integer.parseInt(dls.substring(3));
				int[] b = Calendrier.premierDernierJours();
				if (dateLivr < b[0] || dateLivr > b[1])
					return end("Fichier Excel transmis non conforme (cellule A3).");
			} catch(Exception e){
				return end("Fichier Excel transmis non conforme (cellule A3).");
			}
			
			row = sheet.getRow(3);
			if (row == null) 
				return end("Fichier Excel transmis non conforme (cellule A4).");
			Cell us = row.getCell(0);
			if (us == null) 
				return end("Fichier Excel transmis non conforme (cellule A4).");
			String uss = us.getStringCellValue();
			String sx = "AC." + grp + ".";
			
			Cell pw = row.getCell(1);
			if (pw == null) 
				return end("Fichier Excel transmis non conforme (cellule B4).");
			String pws;
			if (pw.getCellType() == Cell.CELL_TYPE_NUMERIC) {
				pws = "" + (long)pw.getNumericCellValue();
			} else
				pws = pw.getStringCellValue();
			if (pws == null)
				return end("Fichier Excel transmis non conforme (cellule B4).");

			if (cible == 0) {
				if (uss == null || (!uss.startsWith(sx) && !uss.equals("AC.0.0"))) 
					return end("Fichier Excel transmis non conforme (cellule A4).");
				try {
					if (au == 0){
						ac = Integer.parseInt(uss.substring(sx.length()));
						if (ac == 0)
							ac = 1;
					} else {
						if (!uss.equals(sx + au))
							return end("Fichier Excel transmis non conforme (cellule A4 : code alterconso non authentifié).");
						ac = au;
					}
					if (ac == 0)
						return end("Importation d'un fichier Excel : aucun alterconso spécifié.");
					contact = gac.contact(ac);
					if (contact == null)
						return end("Fichier Excel transmis non conforme (cellule A4 : code alterconso non authentifié).");
				} catch(Exception e){
					return end("Fichier Excel transmis non conforme (cellule A4).");
				}
				if (au != 0 && ac != 1 && !pws.equals("" + contact.ci1()))
					return end("Fichier Excel transmis non conforme (cellule B4 : clé alterconso non authentifiée).");
			} else {
//				if (!gac.estFantome())
//					return end("Le groupe a des alterconsos réels, c'est à lui d'importer (le groupement n'est pas habilité à le faire)");
				ac = 1;
			}
			
			//HashSet<Integer> gaps = tr.myDir().codesOf(null, 2);
			HashSet<Integer> gaps = Directory.codesOfG(null, 2);
			
			HashMap<Integer, Hashtable<Integer, GPQ>> cmds = new HashMap<Integer, Hashtable<Integer, GPQ>>();
			int nbr = sheet.getLastRowNum();
			for(int r = 4; r < nbr + 1; r++){
				try {
					row = sheet.getRow(r);
					if (row == null)
						continue;
					Cell a = row.getCell(0);
					Cell b = row.getCell(1);
					if (a == null || b == null)
						continue;
					String ax = a.getStringCellValue();
					if (ax == null || !ax.startsWith("A."))
						continue;
					ax = ax.substring(2);
					int i = ax.indexOf('.');
					if (i == -1)
						return end("Cellule A" + (r + 1) + " mal formée : code groupement absent");
					String s = ax.substring(0, i);
					int g;
					try {
						g = Integer.parseInt(s);
						if (!gaps.contains(g))
								return end("Cellule A" + (r + 1) + " mal formée : code groupement [" + s + "] inconnu");
					} catch (Exception e) {
						return end("Cellule A" + (r + 1) + " mal formée : code groupement [" + s + "] non valide");
					}
					s = ax.substring(i+1);
					int p;
					try {
						p = Integer.parseInt(s);
						if (p < 101 || p > 9999999)
								return end("Cellule A" + (r + 1) + " mal formée : code produit [" + s + "] non valide");
					} catch (Exception e) {
						return end("Cellule A" + (r + 1) + " mal formée : code groupement [" + s + "] non valide");
					}
					double q = 0;
					int ct = b.getCellType();
					if (ct != Cell.CELL_TYPE_BLANK) {
						if (ct != Cell.CELL_TYPE_NUMERIC)
							return end("Cellule B" + (r + 1) + " (quantité) non numérique");
						try {
							q = (double)b.getNumericCellValue();
							if (q < 0 || q > 999)
								return end("Cellule B" + (r + 1) + " (quantité) valeur invalide");
						} catch (Exception e) {
							return end("Cellule B" + (r + 1) + " (quantité) non numérique");
						}
					}
					Hashtable<Integer, GPQ> lst = cmds.get(g);
					if (lst == null){
						lst = new Hashtable<Integer, GPQ>();
						cmds.put(g,  lst);
					}
					if (q == 0)
						continue;
					GPQ gpq = new GPQ();
					gpq.prod = p;
					gpq.qte = q;
					lst.put(p, gpq);
				} catch(Exception e){
					continue;
				}
			}
			
			int auj = HTServlet.appCfg.aujourdhui();
			// Directory[] dirs = Directory.myDirs();
			for(Integer gap : cmds.keySet()) {
				// String nomGap = tr.myDir().entry(2,  gap).label();
				Directory.Entry e = Directory.entryG(2,  gap);
				String nomGap = e == null ? "#" + gap : e.label();
				// Calendrier cal = Calendrier.get();
				int lu = HTServlet.appCfg.getMondayOf(dateLivr, 0);
				Calendrier.Livr livr = Calendrier.getGapGacLivr(gap, grp, lu);
				int codeLivr = livr.codeLivr();
				if (codeLivr == 0) {
					sw.append("Pas de livraison du groupement " + nomGap + " à la date du " + dateLivr + "\n");
					continue;
				}
				String lib = "Livraison " + codeLivr + " du groupement " + nomGap + "[" + gap + "] : ";
				if (au != 0 && livr.archive() < auj) {
					sw.append(lib + "dDate d'archive dépassée : les commandes ne peuvent plus être changées\n");
					continue;
				}
				int ov = livr.ouverture();
				if (ov == 0 || ov > auj) {
					sw.append(lib + "pas encore ouverte aux commandes, les commandes ne peuvent pas être enregistrées\n");
					continue;
				}
				if (cible == 0) {
					if (livr.livr() < auj) {
						sw.append(lib + "date de livraison dépassée, les commandes ne peuvent plus être changées\n");
						continue;
					}
					if (au != 0 && livr.limite() < auj) {
						sw.append(lib + "date limite de commande dépassée, les commandes ne peuvent plus être changées\n");
						continue;
					}
				}
				Hashtable<Integer, GPQ> lst = cmds.get(gap);
				sw.append(lib + lst.size() + " produit(s) commandé(s)\n");
				LivrC.Import imp = new LivrC.Import(sw, grp, gap, codeLivr, ac, (au != 0), lst);
				int nb = imp.go();
				if (nb < 0)
					sw.append("Pas de mise à jour effectuée du fait d'une erreur\n");
				else if (nb == 0)
					sw.append("Pas de mise à jour effectuée, rien n'ayant changé\n");
				else
					sw.append(nb + " mise(s) à jour effectuée(s)\n");
			}
			return end("Fin de l'importation\n");
		} catch (Exception e) {
			throw new AppException(e, MF.EXC);
		}
	}

	public static class GPQ {
		int prod;
		double qte;
	}
	
	private StatusPhase end(String msg) throws IOException {
		if (msg != null) sw.append(msg);
		resultat.content = sw.toString();
		resultat.mime = "application/json";
		resultat.encoding = "UTF-8";
		resultat.brut = true;
		sw.close();
		return StatusPhase.brut;
	}

	@Override public void phaseForte() throws AppException {}

}
