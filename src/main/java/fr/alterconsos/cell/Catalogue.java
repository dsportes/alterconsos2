package fr.alterconsos.cell;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.logging.Logger;

import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.json.simple.AcJSONArray;
import org.json.simple.AcJSONObject;

import fr.alterconsos.MFA;
import fr.alterconsos.cell.Calendrier.CodeLivrSet;
import fr.alterconsos.cell.Calendrier.Livr;
import fr.alterconsos.cell.GAPC.GContact;
import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.ArrayInt;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.DirectoryG;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.HTServlet;
import fr.hypertable.IAuthChecker;
import fr.hypertable.MF;
import fr.hypertable.Operation;
import fr.hypertable.AppTransaction.StatusPhase;

public class Catalogue extends Cell {
	public static final CellDescr cellDescr = new CellDescr(Catalogue.class);

	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	public static final Logger log = Logger.getLogger("fr.alterconsos");

	private int gapx;
	String nomGap;

	private boolean nouvelle = false;

	@Override public void compile() throws AppException {
		nouvelle = version() == -1;
		manageRecomp();
		if (rec.recomp == 0) {
			cleanupProds();
		}
	}

	private Recomp rec;
	
	private void manageRecomp() {
		if (nouvelle) {
			try {
				rec = (Recomp) cellDescr.newCellNode(this, "Recomp");
			} catch (AppException e) {
				return;
			}
			rec.recomp(1);
			rec.insert();
		} else {
			rec = (Recomp) nodeByKey("R");
			if (rec == null) { 
				try {
					rec = (Recomp) cellDescr.newCellNode(this, "Recomp");
				} catch (AppException e) {
					return;
				}
				// recomp == 0
				rec.insert();
			}
		}
	}
	
	@Override public void setIds() {
		String s = line().substring(2);
		gapx = Integer.parseInt(s.substring(0, s.length() - 1));
	}

	public int gap() {
		return gapx;
	}

	public static Catalogue get(int gap) throws AppException {
		return (Catalogue) Cell.get(GAP.lineOf(gap), "0.", "Catalogue", 0);
	}

	private void cleanupProds() {
		LinkedList<CellNode> lst = new LinkedList<CellNode>();
		for(CellNode cn : nodesByKey("X.")){
			Excl x = (Excl)cn;
			Produit prod = produit(x.prod);
			if (prod == null)
				lst.add(x);
		}
		for(CellNode cn : lst) cn.remove();
		lst.clear();
		for(CellNode cn : nodesByKey("M.")){
			Prix x = (Prix)cn;
			Produit prod = produit(x.prod);
			if (prod == null)
				lst.add(x);
		}
		for(CellNode cn : lst) cn.remove();
	}
	
	public void purge(CodeLivrSet cls, ArrayInt produits){
		LinkedList<CellNode> lst = new LinkedList<CellNode>();
		for(CellNode cn : nodesByKey("X.")){
			Excl x = (Excl)cn;
			if (x.codeLivr != 0 && !cls.has(gap(), x.codeLivr))
				lst.add(x);
		}
		for(CellNode cn : lst) cn.remove();
		lst.clear();
		for(CellNode cn : nodesByKey("A.")){
			LivrActives x = (LivrActives)cn;
			ArrayInt a = new ArrayInt();
			for(int codeLivr : x.livrs)
				if (cls.has(gap(), codeLivr))
					a.add(codeLivr);
			if (a.size() == 0)
				lst.add(x);
			else {
				x.livrs.clear();
				x.livrs.addAll(a);
			}
		}
		for(CellNode cn : lst) cn.remove();
		lst.clear();
		for(CellNode cn : nodesByKey("M.")){
			Prix x = (Prix)cn;
			if (x.codeLivr != 0 && !cls.has(gap(), x.codeLivr))
				lst.add(x);
		}
		for(CellNode cn : lst) cn.remove();
		lst.clear();
		HashSet<Integer> lp = new HashSet<Integer>();
		HashSet<Integer> lpx = new HashSet<Integer>();
		for(CellNode cn : nodesByKey("M.")){
			Prix x = (Prix)cn;
			lp.add(x.prod);
		}
		int[] pd = Calendrier.premierDernierJours();
		for(CellNode cn : nodesByKey("P.")){
			Produit x = (Produit)cn;
			if (!lp.contains(x.prod) || (x.suppr != 0 && x.suppr < pd[0])) {
				lst.add(cn);
				lpx.add(x.prod);
			}
		}
		for(CellNode cn : lst) cn.remove();		
		for(int p : lpx) produits.add(p);
		cleanupProds();
	}
	
	private String err(String nomAp, int pr, String nomPr, int codeLivr) {
		String s = "catalogue de [" + this.nomGap + "], producteur:[" + nomAp + "] " + ", produit["
				+ pr + "][" + nomPr + "]";
		return codeLivr == 0 ? s : s + ", livraison:[" + codeLivr + "]";
	}

	public void propagePrix(int codeLivr, int gac) throws AppException {
		for (CellNode cn : nodesByKey(Catalogue.keyOfPrix(codeLivr, 0))) {
			Prix prx = (Prix) cn;
			Excl ex = (Excl) nodeByKey(keyOfExcl(codeLivr, prx.prod));
			boolean isExcl = ex != null && ex.gacs.contains(gac);
			LivrC lc = LivrC.get(gap(), codeLivr, gac);
			lc.updatePrixExcl(prx.prod, prx, isExcl);
		}
	}

	private Prix cloneIt(Prix p, int codeLivr) throws AppException {
		Prix p2 = prix(codeLivr, p.prod);
		if (p2 == null) {
			p2 = (Prix) newCellNode("Prix");
			p2.prod = p.prod;
			p2.codeLivr = codeLivr;
			p2.insert();
		}
		p2.dispo(p.dispo);
		p2.pu(p.pu);
		p2.poids(p.poids);
		p2.parite(p.parite);
		p2.qmax(p.qmax);
		return p2;
	}

	private boolean cloneIt(Excl ex, int codeLivr) throws AppException {
		Excl ex2 = (Excl) nodeByKey(keyOfExcl(codeLivr, ex.prod));
		if (ex2 == null) {
			ex2 = (Excl) newCellNode("Excl");
			ex2.codeLivr = codeLivr;
			ex2.prod = ex.prod;
			ex2.insert();
		}
		return ex2.copyGacs(GAC.validGacs(ex.gacs));
	}
	
	public List<IPrix> getAllPrix(int codeLivr){
		LinkedList<IPrix> lst = new LinkedList<IPrix>();
		for (CellNode cn : nodesByKey(Catalogue.keyOfPrix(codeLivr, 0)))
			lst.add((Prix) cn);
		return lst;
	}

	public boolean isLivrActive(int codeLivr, int gac){
		LivrActives la = (LivrActives) nodeByKey(keyOfLivrActives(gac));
		if (la == null)
			return false;
		return la.livrs.contains(codeLivr);
	}
	
	public List<Integer> getAllExclProd(int codeLivr, int gac) throws AppException{
		LivrActives la = (LivrActives) nodeByKey(keyOfLivrActives(gac));
		if (la == null){
			la = (LivrActives) newCellNode("LivrActives");
			la.gac = gac;
			la.insert();
		}
		if (!la.livrs.contains(codeLivr)) {
			log.info("DECL ACTIVE - gap:" + this.gap() + " cLivr:" + codeLivr + " gac:" + gac);
			la.livrs.add(codeLivr);
		}
		LinkedList<Integer> lst = new LinkedList<Integer>();
		for (CellNode cn : nodesByKey(Catalogue.keyOfExcl(codeLivr, 0))) {
			Excl excl = (Excl) cn;
			if (excl.gacs.contains(gac))
				lst.add(excl.prod());
		}
		return lst;
	}

	public void dupPrix(int codeLivr, int srcCodeLivr) throws AppException {
		Hashtable<Integer, Prix> pcible = new Hashtable<Integer, Prix>();
		
		for (CellNode cn : nodesByKey(Catalogue.keyOfPrix(codeLivr, 0))) {
			Prix p = (Prix)cn;
			pcible.put(p.prod(), p);
		}
				
		for (CellNode cn : nodesByKey(Catalogue.keyOfPrix(srcCodeLivr, 0))) {
			Prix p = (Prix) cn;
			Produit produit = produit(p.prod);
			if (produit == null || produit.suppr() != 0) continue;
			Prix pc = pcible.get(p.prod);
			if (pc == null) {
				// nouveau prix pour cette livraison
				pc = cloneIt(p, codeLivr);
				Excl x = (Excl) nodeByKey(Catalogue.keyOfExcl(srcCodeLivr, p.prod()));
				if (x != null && x.gacs.size() != 0)
					cloneIt(x, codeLivr);
				else {
					Excl x2 = (Excl) nodeByKey(Catalogue.keyOfExcl(codeLivr, p.prod()));
					if (x2 != null)
						// anormal, exclusion sans prix ! mais ...
						x2.gacs.clear();
				}
				pc.dhChange(pc.version());
				continue;
			}
			
			pcible.remove(pc.prod);
			
			if (p.memeCV(pc)) {
				// prix inchangé, peut-être les exclusions
				boolean modif = false;
				Excl x = (Excl) nodeByKey(Catalogue.keyOfExcl(srcCodeLivr, p.prod()));
				if (x != null && x.gacs.size() != 0)
					modif = cloneIt(x, codeLivr);
				else {
					Excl x2 = (Excl) nodeByKey(Catalogue.keyOfExcl(codeLivr, p.prod()));
					if (x2 != null) {
						x2.gacs.clear();
						modif = true;
					}
				}
				if (modif)
					pc.dhChange(pc.version());
				continue;
			}
			
			// prix changé pour cette livraison
			cloneIt(p, codeLivr);
			Excl x = (Excl) nodeByKey(Catalogue.keyOfExcl(srcCodeLivr, p.prod()));
			if (x != null && x.gacs.size() != 0)
				cloneIt(x, codeLivr);
			else {
				Excl x2 = (Excl) nodeByKey(Catalogue.keyOfExcl(codeLivr, p.prod()));
				if (x2 != null)
					x2.gacs.clear();
			}			
		}

		for(Integer prod : pcible.keySet()){
			Prix p = pcible.get(prod);
			p.dispo(0);
		}
		
		if (!hasChanged())
			return;
		Calendrier cal = CalendrierGAP.get(gap());
		List<Integer> gacs = GAC.validGacs(cal.gacsOf(gap(), codeLivr));
		LivrG.ResyncLivrG up = new LivrG.ResyncLivrG();
		up.startTodo(this.gap());
		updatePrixExcl(up, gacs, codeLivr, 0);
		up.endTodo();
	}

	public Produit produit(int prod) {
		return (Produit) nodeByKey(Catalogue.keyOfProduit(prod));
	}

	public Prix prix(int codeLivr, int prod) {
		return (Prix) nodeByKey(Catalogue.keyOfPrix(codeLivr, prod));
	}

	public void annulation(int gap, String nomGap, int ap, String nomAp, int pr)
			throws AppException {
		this.nomGap = nomGap;
		int produit = prod(ap, pr);
		Produit p1 = produit(produit);
		if (p1 == null) throw new AppException(MFA.CTLGAC, pr, nomAp, nomGap);
		if (p1.suppr != 0) return;
		int aujourdhui = Calendrier.aujourdhui();
		
//		p1.suppr(aujourdhui);
		// Vérif. indisponibilité pour les livraisons non archivées
//		ArrayList<Integer> updLivrs = new ArrayList<Integer>();
		Calendrier cal = CalendrierGAP.get(gap());
		for (CellNode cn : nodesByKey(keyOfPrixPP(produit))) {
			Prix prix = (Prix) cn;
			Calendrier.Livr clivr = null;
			if (prix.codeLivr != 0) {
				clivr = cal.livr(gap, prix.codeLivr, 0);
				int arc = clivr.archive();
				if (arc <= aujourdhui) continue;
				if (prix.dispo() != 0)
					throw new AppException(MFA.CTLGAC2, pr, nomAp, nomGap, clivr.expedition());
			}
//			if (prix.dispo == 0)
//				continue ;
//			prix.dispoAA(prix.dispo);
//			prix.dispo(0);
//			updLivrs.add(prix.codeLivr);
		}
		p1.suppr(aujourdhui);
		
//		LivrG.ResyncLivrG up = new LivrG.ResyncLivrG().startTodo(this.gap());
//		for (Integer cLivr : updLivrs)
//			updatePrixExcl(up, cal.gacsOf(gap, cLivr), cLivr, produit);
//		up.doIt();
	}

	public void activation(int gap, String nomGap, int ap, String nomAp, int pr)
			throws AppException {
		this.nomGap = nomGap;
		int produit = prod(ap, pr);
		Produit p1 = produit(produit);
		if (p1 == null) throw new AppException(MFA.CTLGAC, pr, nomAp, nomGap);
		if (p1.suppr == 0) return;
		p1.suppr(0);
		// Disponibilité pour les livraisons non archivées
		// Ne devrait plus avoir lieu après novembre 2016 inactivation corrigée)
		ArrayList<Integer> updLivrs = new ArrayList<Integer>();
		int aujourdhui = Calendrier.aujourdhui();
		Calendrier cal = CalendrierGAP.get(gap());
		for (CellNode cn : nodesByKey(keyOfPrixPP(produit))) {
			Prix prix = (Prix) cn;
			if (prix.codeLivr != 0) {
				Calendrier.Livr clivr = cal.livr(gap, prix.codeLivr, 0);
				int arc = clivr.archive();
				if (arc <= aujourdhui) continue;
			}
			if (prix.dispoAA == 0)
				continue;
			prix.dispo(prix.dispoAA);
			prix.dispoAA(0);
			updLivrs.add(prix.codeLivr);
		}
		if (updLivrs.size() != 0) {
			LivrG.ResyncLivrG up = new LivrG.ResyncLivrG().startTodo(this.gap());
			for (Integer cLivr : updLivrs)
				updatePrixExcl(up, cal.gacsOf(gap, cLivr), cLivr, produit);
			up.doIt();
		}
	}

	@SuppressWarnings("serial") private class LivrGacs extends HashMap<Integer, HashSet<Integer>> {
		private void setLivr(int codeLivr, Collection<Integer> gacs) {
			HashSet<Integer> x = this.get(codeLivr);
			if (x == null) {
				x = new HashSet<Integer>();
				this.put(codeLivr, x);
			}
			if (gacs != null && gacs.size() != 0) for (int g : gacs)
				x.add(g);
		}

		private Collection<Integer> allLivrs() {
			return this.keySet();
		}

		private Collection<Integer> getGacs(int codeLivr) {
			HashSet<Integer> x = this.get(codeLivr);
			return x == null ? AS.emptyList : x;
		}

	}

	public void nouveauProduit(int gap, String nomGap, int ap, String nomAp, int pr, int codeLivr,
			AcJSONObject arg) throws AppException {	
		if (GAP.get(gap).contact(ap) == null)
			throw new AppException(MFA.CATPRX, nomGap, ap, pr);
		String nom = arg.getS("nom", null);
		if (nom == null) throw new AppException(MFA.CATNOM, err(nomAp, pr, nom, codeLivr));
		for (CellNode cn : nodesByKey("P.")) {
			Produit p = (Produit) cn;
			if (p.ap() != ap) continue;
			if (nom.equals(p.nom)) {
				throw new AppException(MFA.CATDNOM, err(nomAp, pr, nom, codeLivr));
			}
		}
		
		int last = 0;
		for(CellNode cn : nodesByKey("P." + ap + ".")){
			Produit p = (Produit)cn;
			if (p.pr() % 100 != pr)
				continue;
			int cp = p.pr() / 100;
			if (cp > last)
				last = cp;
		}
		if (last > 98)
			throw new AppException(MFA.CAT99, nomAp, pr % 10, pr / 10);
		last++;
		int produit = prod(ap, (last * 100) + pr);
		
		int parDemi = arg.getI("parDemi", 0);
		
		Produit p1 = (Produit) newCellNode("Produit");
		p1.prod = produit;
		p1.nom(nom);
		if (parDemi != 0)
			p1.parDemi = 1;
		p1.insert();
	}

	public void setProduitPrix(int gap, String nomGap, int ap, String nomAp, int pr, int codeLivr,
			AcJSONObject arg) throws AppException {

		LivrGacs livrGacs = new LivrGacs();

		this.nomGap = nomGap;
		boolean prod = false; // nom postit cond bio poids qmax
		boolean prix = false; // dispo pu poids
		int produit = prod(ap, pr);

		Produit p1 = produit(produit);
		if (p1 == null)
			throw new AppException(MFA.CATNEX, nomGap, produit);

		if (p1.suppr() != 0)
			throw new AppException(MFA.CATANN, nomGap, nomAp, p1.nom());

		String nom = arg.getS("nom", null);
		if (nom != null) {
			for (CellNode cn : nodesByKey("P.")) {
				Produit p = (Produit) cn;
				if (p.prod == produit || p.ap() != ap) continue;
				if (nom.equals(p.nom)) {
					throw new AppException(MFA.CATDNOM, err(nomAp, pr, nom, codeLivr));
				}
			}
			prod = true;
		}

		String postit = arg.getS("postit", null);
		if (postit != null) prod = true;

		String cond = arg.getS("cond", null);
		if (cond != null) {
			prod = true;
		}

		String bio = arg.getS("bio", null);
		if (bio != null) {
			prod = true;
		}

		int froid = arg.getI("froid", -1);
		if (froid >= 0) {
			froid = froid == 0 ? 0 : 1;
			prod = true;
		}

		int poidsemb = arg.getI("poidsemb", -1);
		if (poidsemb >= 0) {
			prod = true;
		}

		if (prod) {
			if (nom != null) p1.nom(nom);
			if (postit != null) p1.postit(postit);
			if (cond != null) p1.cond(cond);
			if (bio != null) p1.bio(bio);
			if (bio != null) p1.bio(bio);
			if (froid >= 0) p1.froid(froid);
			if (poidsemb >= 0) p1.poidsemb(poidsemb);
		}

		int qmax = -1;
		qmax = arg.getI("qmax", -1);
		if (qmax != -1) {
			if (qmax <= 0 || qmax > 10) qmax = 10;
			prix = true;
		}

		int dispo = arg.getI("dispo", -1);
		if (dispo != -1) {
			if (dispo < 0 || dispo > 4)
				throw new AppException(MFA.CATDISPO, err(nomAp, pr, nom, codeLivr), dispo);
			prix = true;
		}

		int pu = -1;
		pu = arg.getI("pu", -1);
		if (pu != -1) {
			if (pu <= 0 || pu > 99999)
				throw new AppException(MFA.CATPU, err(nomAp, pr, nom, codeLivr), pu);
			prix = true;
		}

		int poids = arg.getI("poids", -1);
		if (poids != -1) {
			if (poids <= 0 || poids > 99999)
				throw new AppException(MFA.CATPVRAC, err(nomAp, pr, "???", codeLivr), poids);
			prix = true;
		}

		int parite = arg.getI("parite", -1);
		if (parite != -1) {
			if (parite < 0 || parite > 4)
				throw new AppException(MFA.CATPPAR, err(nomAp, pr, "???", codeLivr), parite);
			prix = true;
		}

		AcJSONArray z = arg.getA("gacExcl", false);
		ArrayList<Integer> gacExcl = null;
		if (z != null) {
			gacExcl = new ArrayList<Integer>();
			for (Object o : z) {
				int g = (int) (long) (Long) o;
				if (g != 0 && !gacExcl.contains(g)) gacExcl.add(g);
			}
			prix = true;
		}

		AcJSONArray a = arg.getA("autres");
		ArrayList<Integer> autres = null;
		if (a != null) {
			for (Object o : a) {
				int cl = (int) (long) (Long) o;
				if (autres == null) autres = new ArrayList<Integer>();
				if (!autres.contains(cl)) autres.add(cl);
			}
			if (autres != null) prix = true;
		}

		if (!prix) return;
		if (codeLivr < 0) throw new AppException(MFA.CATLIVR, nomGap, codeLivr);

		int aujourdhui = Calendrier.aujourdhui();
		Calendrier cal = CalendrierGAP.get(gap());
		if (codeLivr != 0 && cal.livr(gap, codeLivr, 0).archive() <= aujourdhui)
			throw new AppException(MFA.CATPRARCH, err(nomAp, pr, nom, codeLivr));

		Prix p2 = prix(codeLivr, produit);
		if (p2 == null) {
			p2 = (Prix) cellDescr.newCellNode(this, "Prix");
			p2.prod = produit;
			p2.codeLivr = codeLivr;
			p2.insert();
		}
		if (dispo != -1) p2.dispo(dispo);
		if (pu != -1) p2.pu(pu);
		if (poids != -1) p2.poids(poids);
		if (qmax != -1) p2.qmax(qmax);
		if (parite != -1) p2.parite(parite);
		if (p2.poids() <= 0 || p2.pu() <= 0)
			throw new AppException(MFA.CATPUPOIDS, err(nomAp, pr, "???", codeLivr));

		if (p2.hasChanged() || gacExcl != null) {
			p2.dhChange(p2.version());
			livrGacs.setLivr(codeLivr, null);
		}
		
		if (autres != null) {
			for (int cl : autres) {
				if (cl == codeLivr) continue;
				Prix p3 = prix(cl, produit);
				if (p3 == null) {
					if (cl != 0) {
						Calendrier.Livr clivr = cal.livr(gap, cl, 0);
						if (clivr == null)
							throw new AppException(MFA.CATCAL, err(nomAp, pr, nom, cl));
						if (clivr.archive() <= aujourdhui)
							throw new AppException(MFA.CATPRARCH, err(nomAp, pr, nom, cl));
					}
					p3 = (Prix) newCellNode("Prix");
					p3.prod = produit;
					p3.codeLivr = cl;
					p3.insert();
				}
				p3.dispo(p2.dispo);
				p3.pu(p2.pu);
				p3.poids(p2.poids);
				p3.qmax(p2.qmax);
				p3.parite(p2.parite);
				if (p3.hasChanged()) p3.dhChange(p3.version());
				livrGacs.setLivr(cl, null);
			}
		}

		// gacs à notifier des changements
		for (int cl : livrGacs.allLivrs()) {
			Collection<Integer> gacs = cal.gacsOf(gap, cl);
			livrGacs.setLivr(cl, gacs); // gacs livrés
			Excl exa = (Excl) nodeByKey(keyOfExcl(cl, produit));
			if (exa != null) livrGacs.setLivr(cl, exa.gacs); 
			// gacs qui ETAIENT exclus du produit
			if (gacExcl != null) livrGacs.setLivr(cl, gacExcl); 
			// gacs qui SONT maintenant exclus du produit
		}

		// mise à jour des gac exclus
		updExcl(gacExcl, livrGacs.allLivrs(), produit);

		// notifier tous les gacs impliqués
		LivrG.ResyncLivrG up = new LivrG.ResyncLivrG().startTodo(this.gap());
		for (int cl : livrGacs.allLivrs())
			updatePrixExcl(up, livrGacs.getGacs(cl), cl, produit);
		up.doIt();
	}

	private void updatePrixExcl(LivrG.ResyncLivrG up, Collection<Integer> gacs, int cLivr, int produit) 
			throws AppException {
		long auj = HTServlet.appCfg.aujourdhui();
		CalendrierGAP cal = CalendrierGAP.get(this.gap());
		if (cLivr != 0 && gacs != null && gacs.size() != 0) {
			for(int gac : gacs){
				Calendrier.Livr livr = cal.livr(this.gap(), cLivr, 0);
				if (livr == null)
					continue;
				if (livr.archive() <= auj)
					continue;
				if (!this.isLivrActive(cLivr, gac))
					continue;
				List<Integer> exclGacs = null;
				Excl ex = (Excl) nodeByKey(Catalogue.keyOfExcl(cLivr, produit));
				if (ex != null) exclGacs = ex.gacs();
				boolean isExcl = exclGacs != null && exclGacs.indexOf(gac) != -1;
				LivrC lc = LivrC.get(this.gap(), cLivr, gac);
				for (CellNode cn : nodesByKey(Catalogue.keyOfPrix(cLivr, 0))) {
					Prix prx = (Prix) cn;
					if (produit != 0 && produit != prx.prod())
						continue;
					boolean updG = lc.updatePrixExcl(prx.prod(), prx, isExcl);
//					log.info("UPDATE Prix - gap:" + this.gap() + " cLivr:" + cLivr + " gac:" 
//							+ gac + " prod:" + prx.prod() + " updG:" + updG);
					if (updG)
						up.addGacLivr(gac, cLivr);
				}
			}
		}
	}

	private void updExcl(Collection<Integer> gacExcl, Collection<Integer> updLivrs, int produit)
			throws AppException {
		for (Integer codeLivr : updLivrs) {
			Excl ex = (Excl) nodeByKey(keyOfExcl(codeLivr, produit));
			if (gacExcl != null) {
				if (ex == null) {
					ex = (Excl) newCellNode("Excl");
					ex.codeLivr = codeLivr;
					ex.prod = produit;
					ex.insert();
				}
				ex.copyGacs(gacExcl);
			} else {
				if (ex != null) ex.remove();
			}
		}
	}

	public static int prod(int ap, int pr) {
		return (pr % 10000) + ((ap % 1000) * 10000);
	}

	public static String prod(int prod) {
		return "" + (prod / 10000) + "." + (prod % 10000);
	}

	public static String keyOfPrix(int codeLivr, int prod) {
		return prod == 0 ? "M." + codeLivr + "." : "M." + codeLivr + "." + Catalogue.prod(prod)
				+ ".";
	}

	public static String keyOfPrixPP(int codeLivr, int prod) {
		return "N." + Catalogue.prod(prod) + "." + codeLivr + ".";
	}

	public static String keyOfPrixPP(int prod) {
		return "N." + Catalogue.prod(prod) + ".";
	}

	public static String keyOfProduit(int prod) {
		return "P." + Catalogue.prod(prod) + ".";
	}

	public static String keyOfProduit(int ap, int pr) {
		return pr == 0 ? "P." + ap + "." : "P." + ap + "." + pr + ".";
	}

	public static String keyOfExcl(int codeLivr, int prod) {
		String s = "X." + codeLivr + ".";
		return prod == 0 ? s : s + Catalogue.prod(prod) + ".";
	}

	public static String keyOfLivrActives(int gac) {
		return "A." + gac + ".";
	}

	@HTCN(id = 5) public class LivrActives extends CellNode {
		@Override public String[] keys() {
			return AS.as(keyOfLivrActives(gac));
		}

		@HT(id = 1) public int gac;

		public int gac() {
			return gac;
		}

		@HT(id = 4) private ArrayInt livrs;

		public ArrayInt livrs() {
			return livrs;
		}

	}


	@HTCN(id = 4) public class Excl extends CellNode {
		@Override public String[] keys() {
			return AS.as(keyOfExcl(codeLivr, prod));
		}

		@HT(id = 1) public int codeLivr;

		public int codeLivr() {
			return codeLivr;
		}

		@HT(id = 2) public int prod;

		public int prod() {
			return prod;
		}

		public int ap() {
			return prod / 10000;
		}

		public int pr() {
			return prod % 10000;
		}

		public int typePrix() {
			return prod % 10;
		}

		@HT(id = 4) private ArrayInt gacs;

		public ArrayInt gacs() {
			return gacs;
		}

		public boolean copyGacs(Collection<Integer> value) {
			return copyIf(gacs, value);
		}

	}

	@HTCN(id = 2) public class Prix extends CellNode implements IPrix {
		@Override public String[] keys() {
			return AS
					.as(Catalogue.keyOfPrix(codeLivr, prod), Catalogue.keyOfPrixPP(codeLivr, prod));
		}

		public boolean memeCV(Prix src){
			return dispo == src.dispo && pu == src.pu && poids == src.poids 
					&& qmax == src.qmax && parite == src.parite;
		}

		@HT(id = 1) public int codeLivr;

		public int codeLivr() {
			return codeLivr;
		}

		@HT(id = 2) public int prod;

		public int prod() {
			return prod;
		}

		public int ap() {
			return prod / 10000;
		}

		public int pr() {
			return prod % 10000;
		}

		public int typePrix() {
			return prod % 10;
		}

		@HT(id = 3) private int dispo;

		public int dispo() {
			return dispo;
		}

		public void dispo(int value) {
			if (w(this.dispo, value)) this.dispo = value;
		}

		@HT(id = 4) private int pu;

		public int pu() {
			return pu;
		}

		public void pu(int value) {
			if (w(this.pu, value)) this.pu = value;
		}

		@HT(id = 5) private int poids;

		public int poids() {
			return poids;
		}

		public void poids(int value) {
			if (w(this.poids, value)) this.poids = value;
		}

		@HT(id = 8) private int qmax;

		public int qmax() {
			return qmax;
		}

		public void qmax(int value) {
			if (w(this.qmax, value)) this.qmax = value;
		}

		@HT(id = 9) private int dispoAA;

		public int dispoAA() {
			return dispoAA;
		}

		public void dispoAA(int value) {
			if (w(this.dispoAA, value)) this.dispoAA = value;
		}

		@HT(id = 10) private int parite;

		public int parite() {
			return parite;
		}

		public void parite(int value) {
			if (w(this.parite, value)) this.parite = value;
		}

		@HT(id = 11) private long dhChange;

		public long dhChange() {
			return dhChange;
		}

		public void dhChange(long value) {
			if (w(this.dhChange, value)) this.dhChange = value;
		}

	}

	@HTCN(id = 9, single = 'R') public class Recomp extends CellNode {
		@HT(id = 2) private int recomp;

		public void recomp(int value) {
			if (w(this.recomp, value)) this.recomp = value;
		}

	}

	@HTCN(id = 1) public class Produit extends CellNode {
		@Override public String[] keys() {
			return AS.as(Catalogue.keyOfProduit(prod));
		}

		@HT(id = 2) public int prod;

		public int prod() {
			return prod;
		}

		public int ap() {
			return prod / 10000;
		}

		public int pr() {
			return prod % 10000;
		}

		public int typePrix() {
			return prod % 10;
		}

		@HT(id = 3) public String nom;

		public String nom() {
			return nom;
		}

		public void nom(String value) {
			if (w(this.nom, value)) this.nom = value;
		}

		@HT(id = 4) private String postit;

		public String postit() {
			return postit;
		}

		public void postit(String value) {
			if (w(this.postit, value)) this.postit = value;
		}

		@HT(id = 5) private String cond;

		public String cond() {
			return cond;
		}

		public void cond(String value) {
			if (w(this.cond, value)) this.cond = value;
		}

		@HT(id = 6) private String bio;

		public String bio() {
			return cond;
		}

		public void bio(String value) {
			if (w(this.bio, value)) this.bio = value;
		}

		@HT(id = 8) private int suppr;

		public int suppr() {
			return suppr;
		}

		public void suppr(int value) {
			if (w(suppr, value)) suppr = value;
		}

		@HT(id = 9) private int froid;

		public int froid() {
			return froid;
		}

		public void froid(int value) {
			if (w(froid, value)) froid = value;
		}

		@HT(id = 10) private int poidsemb;

		public int poidsemb() {
			return poidsemb;
		}

		public void poidsemb(int value) {
			if (w(poidsemb, value)) poidsemb = value;
		}

		@HT(id = 11) public int parDemi;

		public int parDemi() {
			return parDemi;
		}

	}
	
	private class Pr {
		String prod;
		String nom;
		String bio;
		String cond;
		boolean parDemi = false;
		double pu;
		double poids;
		int typePrix;
		double qte;
		double qteD;
		double qteC;
		double prix;
		double prixC;
		double prixD;
		double poidsT;
		double poidsD;
		double poidsC;
		long nblg;
	}
	
	private class Ap {
		int ap;
		String nom;
		ArrayList<Pr> prs = new ArrayList<Pr>();
		Ap(int ap, String nom){
			this.ap = ap;
			this.nom = nom;
		}
	}
	
	private class ApA {
		Ap[] apa;
		String label;
		Catalogue cat;
		boolean hasQte = false;
	}
	
	public static class Cmp1 implements Comparator<Pr> {
		@Override public int compare(Pr o1, Pr o2) {
			return o1.nom.compareTo(o2.nom);
		}
	}

	public static class Cmp2 implements Comparator<Ap> {
		@Override public int compare(Ap o1, Ap o2) {
			return o1.nom.compareTo(o2.nom);
		}
	}

	public ApA printCat1(int codeLivr, int gac, int ac) throws AppException {
		LivrC livrC = null;
		if (gac != 0)
			livrC = LivrC.get(this.gap(), codeLivr, gac);
		GAP g = GAP.get(this.gap());
		GContact c = null;
		Hashtable<Integer, Ap> aps = new Hashtable<Integer, Ap>();
		boolean hasQte = false;
		for(CellNode cn : nodesByKey("M." + codeLivr + ".")){
			Prix prix = (Prix)cn;
			if (prix.dispo == 0)
				continue;
			Excl excl = (Excl)nodeByKey(keyOfExcl(codeLivr, prix.prod));
			if (excl != null && excl.gacs.contains(gac))
				continue;
			Produit p = (Produit)nodeByKey(keyOfProduit(prix.prod));
			if (p == null)
				continue;
			c = g.contact(prix.ap());
			if (c == null)
				continue;
			Pr pr = new Pr();
			pr.parDemi = p.parDemi != 0;
			pr.bio = (p.bio != null ? p.bio : "");
			pr.cond = (p.cond != null ? p.cond : "");
			pr.nom = (p.nom != null ? p.nom : "") + " - " + (p.postit != null ? p.postit : "");
			pr.pu = (double)prix.pu / 100;
			pr.poids = (double)prix.poids / 1000;
			if (p.parDemi != 0)
				pr.poids = pr.poids * 2;
			pr.typePrix = prix.typePrix();
			pr.prod = "" + this.gap() + "." + prix.prod;
			int ap = prix.ap();
			
			if (livrC != null) {
				if (ac != 0){
					LivrC.AcApPr y = livrC.getAcApPrX(ac, prix.ap(), prix.pr());
					if (y != null) {
						pr.qte = (double)y.qte;
						if (p.parDemi != 0)
							pr.qte = pr.qte / 2;
						pr.prix = (double)y.prix / 100;
						if (pr.qte != 0)
							hasQte = true;
					}
				} else {
					LivrC.ApPr y = livrC.getApPrX(prix.ap(), prix.pr());
					if (y != null) {
						pr.qte = (double)y.qte;
						if (p.parDemi != 0)
							pr.qte = pr.qte / 2;
						pr.prix = (double)y.prix / 100;
						pr.poidsT = (double)y.poids / 1000;
						pr.qteC = (double)y.qteC;
						if (p.parDemi != 0)
							pr.qteC = pr.qteC / 2;
						pr.qteD = (double)y.qteD;
						if (p.parDemi != 0)
							pr.qteD = pr.qteD / 2;
						pr.poidsC = (double)y.poidsC / 1000;
						pr.poidsD = (double)y.poidsD / 1000;
						pr.prixC = (double)y.prixC / 100;
						pr.prixD = (double)y.prixD / 100;
						pr.nblg = (long)y.nblg;
						if (pr.qte != 0 || pr.qteC != 0 || pr.qteD != 0)
							hasQte = true;
					}
				}
			}
			if (c.suppr() == 0 || pr.qte != 0) {
				Ap x = aps.get(ap);
				if (x == null){
					x = new Ap(ap, c.nom);
					aps.put(ap, x);
				}
				x.prs.add(pr);
			}
		}
		int i = 0;
		if (aps.size() == 0)
			return null;
		Ap[] apa = new Ap[aps.size()];
		for(int x : aps.keySet()) {
			Ap ap = aps.get(x);
			Collections.sort(ap.prs, new Cmp1());
			apa[i++] = ap;
		}
		Arrays.sort(apa, new Cmp2());
		ApA ret = new ApA();
		ret.apa = apa;
		ret.cat = this;
		ret.hasQte = hasQte;
		return ret;
	}
	
	private enum Filtre { TOUS, QUELESVIDES, QUELESNONVIDES }
	
	public boolean printCat2(WB wb, ApA x, Filtre filtre, boolean forGapExport) throws AppException {
		boolean gap1 = false;
		for(Ap ap : x.apa){
			boolean ap1 = false;
			for(Pr pr : ap.prs){
				if (filtre != Filtre.TOUS) {
					if (pr.qte == 0){
						if (filtre == Filtre.QUELESNONVIDES)
							continue;
					} else {
						if (filtre == Filtre.QUELESVIDES)
							continue;
					}
				}
				if (!gap1){
					wb.write(0, "G." + this.gap()).write(3, x.label);
					wb.nextRow();
					gap1 = true;
				}
				if (!ap1){
					wb.write(0, "P." + this.gap() + "." + ap.ap).write(3, ap.nom);
					wb.nextRow();
					ap1 = true;
				}
				wb.write(0, "A." + pr.prod);
				
				wb.write(1, pr.qte, wb.f3).write(2, pr.prix, wb.f1);
				double pux = pr.pu;
				String nom = pr.nom;
				if (pr.parDemi)
					nom += "\nCOMMANDABLE PAR DEMI (0,5 1,5 ...)";
				wb.write(3, nom).write(4, pr.bio).write(5, pr.cond)
				.write(6,  TP[pr.typePrix]).write(7, pux, wb.f1).write(8, pr.poids, wb.f2);
				if (forGapExport){ 
					int nx = 10;
					wb.write(nx++, pr.nblg, null);
					wb.write(nx++, pr.qte, null).write(nx++, pr.prix, wb.f1).write(nx++, pr.poidsT, wb.f2);
					if (pr.qteC != 0)
						wb.write(nx++, pr.qteC == -1 ? 0L : pr.qteC, null);
					else
						nx++;
					wb.write(nx++, pr.prixC, wb.f1).write(nx++, pr.poidsC, wb.f2);
					if (pr.qteD != 0)
						wb.write(nx++, pr.qteD == -1 ? 0L : pr.qteD, null);
					else
						nx++;
					wb.write(nx++, pr.prixD, wb.f1).write(nx++, pr.poidsD, wb.f2);
				}
				wb.nextRow();
			}
			if (ap1)
				wb.nextRow();
		}
		return gap1;
	}

	public static String[] TP = {"", "Prix unitaire", "Au Kg, pré-emb.", "Au Kg, vrac"};
		
	public static class WB {
		OutputStream os;
		Workbook workbook;
		Sheet sheet;
		Row row;
		int irow;
		int maxCol = 0;
		CellStyle f1; 
		CellStyle f2; 
		CellStyle f3;
        
		public WB(OutputStream os) throws AppException {
			try {
				this.os = os;
				workbook = new HSSFWorkbook(); 
				// workbook = new XSSFWorkbook();
				sheet = workbook.createSheet("Catalogue");
				nextRow();
				f1 = workbook.createCellStyle();
				f1.setDataFormat(workbook.createDataFormat().getFormat("0.00"));
				f2 = workbook.createCellStyle();
				f2.setDataFormat(workbook.createDataFormat().getFormat("0.000"));
				f3 = workbook.createCellStyle();
				f3.setFillForegroundColor(IndexedColors.YELLOW.getIndex());
				f3.setFillPattern(CellStyle.SOLID_FOREGROUND);
			} catch (Exception e) {
				String s = e.toString();
				throw new AppException(MF.IO, s);
			}
		}
		
		public void newSheet(String name){
			irow = 0;
			sheet = workbook.createSheet(name);
			nextRow();			
		}

		public void nextRow(){
			row = sheet.createRow(irow);
			irow++;
		};
				
		public WB write(int col, Object obj) throws AppException{
			return write(col, obj, null);
		}
		
		public WB write(int col, Object obj, CellStyle f) throws AppException{
			if (obj == null) return this;
			org.apache.poi.ss.usermodel.Cell cell = row.createCell((short) col);
			if (col > maxCol)
				maxCol = col;
			try {
				if (obj instanceof String) {
					cell.setCellValue((String) obj);
				} else if (obj instanceof Double) {
					cell.setCellValue((Double) obj);
					if (f != null)
						cell.setCellStyle(f);
				} else if (obj instanceof Long) {
					cell.setCellValue(new Double((Long) obj));
					if (f != null)
						cell.setCellStyle(f);
				}
			} catch (Exception e) {
				String s = e.toString();
				throw new AppException(MF.IO, s);
			}
			return this;
		}

		public void setCols(int[] cols){
			for(int c = 0; c < cols.length; c++){
		        /* Every character is 256 units wide, so scale it. */
		        sheet.setColumnWidth(c, cols[c] * 256 + 100);					
			}
		}
		
		public void close() throws AppException{
			try {
				for(int c = 0; c < cols.length; c++){
			        /* Every character is 256 units wide, so scale it. */
			        sheet.setColumnWidth(c, cols[c] * 256 + 100);					
				}
				workbook.write(os);
			} catch (IOException e) {
				String s = e.toString();
				throw new AppException(MF.IO, s);
			}
		}
		
	}

	
	public static void entete(WB wb, boolean forGap) throws AppException{
		wb.write(0, "Code").write(1, "Quantité").write(2, "Montant").write(3, "Nom / Intitulé").write(4, "Label bio")
		.write(5, "Conditionnement").write(6, "Type de prix").write(7, "Prix €").write(8, "Poids Kg");
		if (forGap){
			wb.write(10, "nblg").write(11, "qte").write(12, "prix").write(13, "poids");
			wb.write(14, "qteC").write(15, "prixC").write(16, "poidsC");
			wb.write(17, "qteD").write(18, "prixD").write(19, "poidsD");
		}
		wb.nextRow();				
	}
		
	private static final int[] cols = {10, 10, 10, 60, 16, 16, 16, 8, 8};
	private static final int[] cols2 = {10, 10, 10, 60, 16, 16, 16, 8, 8, 2, 8, 10, 10, 8, 10, 10, 8, 10, 10};

	public static class OpGacDistrib extends Operation {

		String dl;
		WB wb;
		int lu;
		List<Calendrier.GapCodeLivr> lst;
		int gac;
		
		@Override public String mainLine() {
			return null;
		}

		void fillSheet(GContact c) throws AppException{	
			int usr = c == null ? 0 : c.code;			
			boolean hasQte = false;
			
			LinkedList<ApA> lx = new LinkedList<ApA>();
			for(Calendrier.GapCodeLivr x : lst){
				DirectoryG.Entry e = GAP.gapEntry(x.gap);
				Catalogue cat = Catalogue.get(x.gap);
				ApA apa = cat.printCat1(x.codeLivr, gac, usr);
				if (apa == null)
					continue;
				apa.label = e.label();
				lx.add(apa);
				if (apa.hasQte)
					hasQte = true;
			}
			
			if (hasQte) {
				if (c != null)
					wb.newSheet(c.initiales());
				String nom = c == null ? "Total Groupe" : c.nom;
				entete(wb, false);
				wb.nextRow();
				wb.write(0, "DL." + lu).write(3, dl);
				wb.nextRow();
				wb.write(0, "AC." + gac + "." + usr).write(3, nom);
				wb.nextRow();
				wb.nextRow();

				for(ApA apa : lx){
					boolean vide = apa.cat.printCat2(wb, apa, Filtre.TOUS, false);
					if (!vide) {
						wb.nextRow();
						wb.nextRow();
					}
				}
				wb.setCols(cols);
			}
		}
		
		@Override public StatusPhase phaseFaible() throws AppException {
			IAuthChecker ac = authChecker;
			gac = ac.getAuthGrp();
			int dateLivr = arg().getI("d", 0);
			if (dateLivr == 0)
				throw new AppException(MFA.CATLVX2, dateLivr);
			// Calendrier cal = Calendrier.get();
			// lu = HTServlet.appCfg.getMondayOf(dateLivr, 0);
			lst = Calendrier.getGacLivrs(gac, dateLivr);
			dl = HTServlet.appCfg.sdfd().format(HTServlet.appCfg.aammjj2Date(lu));
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			wb = new WB(bos);
			
			GContact[] gca = GAC.get(gac).allContacts();
			fillSheet(null);
			for(GContact c : gca){
				// wb.newSheet(c.initiales());
				fillSheet(c);
			}
			
			wb.close();
			resultat.mime = "application/vnd.ms-excel";
			resultat.bytes = bos.toByteArray();
			return StatusPhase.brut;
		}

		@Override public void phaseForte() throws AppException {}

	}

	public static class OpGacExport extends Operation {

		@Override public String mainLine() {
			return null;
		}
		
		private static final SimpleDateFormat sdfx = new SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE);
		private static final TimeZone timezone = TimeZone.getTimeZone("Europe/Paris");

		private String f1(int d){
			return sdfx.format(HTServlet.appCfg.aammjj2Date(d));
		}
		
		@Override public StatusPhase phaseFaible() throws AppException {
			sdfx.setTimeZone(timezone);
			IAuthChecker ac = authChecker;
			int gac = ac.getAuthGrp();
			int dateLivr = arg().getI("d", 0);
			if (dateLivr == 0)
				throw new AppException(MFA.CATLVX2, dateLivr);
			int gap = arg().getI("gr", 0);
			// Calendrier cal = Calendrier.get();
			//int lu = HTServlet.appCfg.getMondayOf(dateLivr, 0);
			// List<Calendrier.GapCodeLivr> lst = cal.getGacLivrs(gac, lu);
			List<Calendrier.GapCodeLivr> lst = Calendrier.getGacLivrs(gac, dateLivr);
			int usr = ac.getAuthUsr();
			long cle = 0;
			String nom = "Mon nom";
			GContact c = null;
			if (usr != 0){
				GAC g = GAC.get(gac);
				c = g.contact(usr);
				if (c != null){
					cle = c.ci1();
					nom = c.nom();
				}
			}
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			WB wb = new WB(bos);
			entete(wb, false);
			wb.nextRow();
//			String dl = HTServlet.appCfg.sdfd().format(HTServlet.appCfg.aammjj2Date(lu));
//			wb.write(0, "DL." + lu).write(3, dl);
//			String dl = HTServlet.appCfg.sdfd().format(HTServlet.appCfg.aammjj2Date(dateLivr));
			StringBuffer sb = new StringBuffer();
			boolean pf = true;
			for(Calendrier.GapCodeLivr x : lst){
				if (gap != 0 && gap != x.gap)
					continue;
				if (c != null && c.grExcl().contains(x.gap))
					continue;
				DirectoryG.Entry e = GAP.gapEntry(x.gap);
				if (!pf)
					sb.append("\n");
				else
					pf = false;
				sb.append(e.label());
				sb.append(": Limite:" + f1(x.jl) + " " + x.fc + "h; Livraison:" + f1(x.jl) + " " + x.dl +
						"h; Distribution:" + f1(x.jd) + " " + x.dd + "h-" + x.fd + "h");
			}
			wb.row.setHeight((short) ((lst.size() + 2) * 200));
			String col3 = sb.toString();
			wb.write(0, "DL." + dateLivr).write(3, col3);
			
			
			wb.nextRow();
			wb.write(0, "AC." + gac + "." + usr).write(1, cle).write(3, nom);
			wb.nextRow();
			wb.nextRow();
			LinkedList<ApA> lx = new LinkedList<ApA>();
			for(Calendrier.GapCodeLivr x : lst){
				if (gap != 0 && gap != x.gap)
					continue;
				if (c != null && c.grExcl().contains(x.gap))
					continue;
				DirectoryG.Entry e = GAP.gapEntry(x.gap);
				Catalogue cat = Catalogue.get(x.gap);
				ApA apa = cat.printCat1(x.codeLivr, gac, usr);
				if (apa == null)
					continue;
				apa.label = e.label();
				lx.add(apa);
			}
			for(ApA apa : lx)
				if (apa.cat.printCat2(wb, apa, Filtre.QUELESNONVIDES, false)) 
					wb.nextRow();
			for(ApA apa : lx)
				if (apa.cat.printCat2(wb, apa, Filtre.QUELESVIDES, false)) 
					wb.nextRow();
			wb.setCols(cols);
			wb.close();
			resultat.mime = "application/vnd.ms-excel";
			resultat.bytes = bos.toByteArray();
			return StatusPhase.brut;
		}

		@Override public void phaseForte() throws AppException {}

	}

	public static class OpGapExport extends Operation {

		@Override public String mainLine() {
			return null;
		}

		@Override public StatusPhase phaseFaible() throws AppException {
			IAuthChecker ac = authChecker;
			int gap = ac.getAuthGrp();
			int gac = arg().getI("gr", 0); 
			int dateExped = arg().getI("d", 0);
			Calendrier cal = CalendrierGAP.get(gap);
			int lu = HTServlet.appCfg.getMondayOf(dateExped, 0);
			int codeLivr = cal.getGapLivr(gap, lu);
			if (codeLivr == 0)
				throw new AppException(MFA.CATLVX, gap, dateExped);
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			long cle = 0;
			String nom = "Mon nom";
			WB wb = new WB(bos);
			entete(wb, true);

			wb.nextRow();
			String dl = HTServlet.appCfg.sdfd().format(HTServlet.appCfg.aammjj2Date(lu));
			wb.write(0, "DL." + lu).write(3, dl);
			wb.nextRow();
			wb.write(0, "AC." + gac + ".0").write(1, cle).write(3, nom);
			wb.nextRow();
			wb.nextRow();
			Catalogue cat = Catalogue.get(gap);
			ApA apa = cat.printCat1(codeLivr, gac, 0);
			if (apa != null) {
				Directory.Entry e = GAP.gapEntry(gap);
				apa.label = e != null ? e.label() : "#" + gap;
				apa.cat.printCat2(wb, apa, Filtre.TOUS, true);
			}
			wb.setCols(cols2);
			wb.close();
			resultat.mime = "application/vnd.ms-excel";
			resultat.bytes = bos.toByteArray();
			return StatusPhase.brut;
		}

		@Override public void phaseForte() throws AppException {}

	}

	public static class Op extends Operation {

		String line;
		int gap;
		short restrictGac = 0;;
		String c;
		String nomGap;
		String nomAp;
		int pr;
		int livr;
		int srcLivr;
		int ap;

		GAP gapCell;
		Catalogue cat;
		Calendrier ecal;
		GContact contact;

		@Override public String mainLine() {
			return line;
		}

		public StatusPhase phaseFaible() throws AppException {
			c = getOpName();
			// Calendrier cal = Calendrier.get(tr());

			gap = arg().getI("gap", 0);
			Calendrier cal = CalendrierGAP.get(gap);

			DirectoryG.Entry e = GAP.gapEntry(gap);
			if (e == null || e.suppr() != 0) throw new AppException(MFA.CATANG, gap);
			nomGap = e.label();

			gapCell = GAP.get(gap);
			if (gapCell.version() == -1) throw new AppException(MFA.CTLGGAP, gap);

			IAuthChecker ac = authChecker;
			if (ac.getAuthPower() >= 5) throw new AppException(MF.ANNUL);

			line = GAP.lineOf(gap);
			int lvl = ac.accessLevel(line, "0.", "Catalogue");
			if (lvl < 2) throw new AppException(MFA.AUTHCAT, nomGap);

			livr = arg().getI("codeLivr", -1);
			if (livr >= 0) {
				if (livr > 999) throw new AppException(MFA.CATLIVR, nomGap, livr);
				if (livr != 0) {
					Livr l = cal.livr(gap, livr, 0);
					if (l == null) throw new AppException(MFA.CATLIVR, nomGap, livr);
				}
			}

			ap = arg().getI("apr", 0);
			if (ap < 1 || ap > 999) throw new AppException(MFA.CATAP, nomGap, ap);
			contact = gapCell.contact((short) ap);
			if (contact == null) throw new AppException(MFA.CATAP, nomGap, ap);
			nomAp = contact.nom();
			if (contact.suppr() != 0) throw new AppException(MFA.CATANAP, nomGap, nomAp);

			pr = arg().getI("pr", 0);
			if (pr < 1 || pr > 9999) throw new AppException(MFA.CATPR, nomGap, nomAp, pr);

			return StatusPhase.transactionMultiLines;
		}

		public void phaseForte() throws AppException {
			cat = Catalogue.get(gap);

			if (c.equals("11")) {
				if (pr < 100)
					cat.nouveauProduit(gap, nomGap, ap, nomAp, pr, livr, arg());
				else
					cat.setProduitPrix(gap, nomGap, ap, nomAp, pr, livr, arg());
			}
			if (c.equals("13")) cat.annulation(gap, nomGap, ap, nomAp, pr);
			if (c.equals("14")) cat.activation(gap, nomGap, ap, nomAp, pr);
			if (cat.rec.recomp == 0) {
				cat.cleanupProds();
				cat.rec.recomp(1);
			}
		}

	}

}
