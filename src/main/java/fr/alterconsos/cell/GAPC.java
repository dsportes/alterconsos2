package fr.alterconsos.cell;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.Random;

import org.json.simple.AcJSONObject;

import fr.alterconsos.MFA;
import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.ArrayInt;
import fr.hypertable.ArrayString;
import fr.hypertable.Cell;
import fr.hypertable.DirectoryG;
import fr.hypertable.HT;
import fr.hypertable.HTServlet;
import fr.hypertable.IAppConfig;
import fr.hypertable.IAuthChecker;
import fr.hypertable.MF;
import fr.hypertable.Operation;
import fr.hypertable.AppTransaction.StatusPhase;
import fr.hypertable.Versions;

public abstract class GAPC extends Cell implements IGrp {

	private boolean isGAC;

	private int code;

	@Override public void setIds() {
		String s = line().substring(2);
		code = Integer.parseInt(s.substring(0, s.length() - 1));
		isGAC = this.getClass() == GAC.class;
	}

	public int code() {
		return code;
	}

	public int grpCode() {
		return code;
	}

	public int type() {
		return isGAC() ? 1 : 2;
	}

	public boolean isGAC() {
		return isGAC;
	}

	@Override public void compile() throws AppException {
		for (CellNode o : nodesByKey("C."))
			((GContact) o).setUrl();
	}

	public void checkIf1(DirectoryG.Entry e)  throws AppException {
		GContact c = contact(1);
		if (c == null){
			c = newContact(1, e.label(), e.initiales());
			c.couleur = e.couleur();
		}
	}
	
	protected GContact newContact(int code, String nom, String initiales) throws AppException {
		if (code < 1 || code > 999) throw new AppException(MFA.GAPCCODE, code);
		if (!isGAC() && (code < 1 || code > 299)) throw new AppException(MFA.GAPCCODE, code);
		GContact a = (GContact) newCellNode("Contact");
		a.code = code;
		a.nom = nom;
		a.initiales = initiales;
		a.insert();
		a.genererCle();
		return a;
	}

	public void nouveauContact(AcJSONObject arg) throws AppException {
		int min = arg.getI("min", 2);
		int max = arg.getI("max", 999);
		int code = getFreeCode(min, max);
		String nom = arg.getS("nom", null);
		if (nom == null || nom.length() == 0) throw new AppException(MFA.GAPCNOM, code);
		String initiales = arg.getS("initiales", null);
		if (initiales == null || initiales.length() == 0)
			throw new AppException(MFA.GAPCNOM, code);
		initiales = AS.shortId(initiales);
		GContact c2 = contactN(nom);
		if (c2 != null) throw new AppException(MFA.GAPCDN, code, c2.code());
		c2 = contactI(initiales);
		if (c2 != null) throw new AppException(MFA.GAPCDN, code, c2.code());
		newContact(code, nom, initiales);
		compile();
	}

	public GContact contactN(String nom) {
		return (GContact) nodeByKey(keyOfContactN(nom));
	}

	public GContact contactI(String initiales) {
		return (GContact) nodeByKey(keyOfContactI(initiales));
	}

	public GContact contactA(String adherent) {
		return (GContact) nodeByKey(keyOfContactA(adherent));
	}

	public int getFreeCode(int min, int max){
		for(int i = min; i <= max; i++){
			GContact g = contact(i);
			if (g == null)
				return i;
		}
		return 0;
	}
	
	public GContact contact(int code) {
		return (GContact) nodeByKey(keyOfContact(code));
	}

	private GContact getContact(AcJSONObject arg, boolean ex) throws AppException {
		int code = arg.getI("code", -1);
		if (code < 1 || code > 999) throw new AppException(MFA.GAPCCODE, code);
		if (!isGAC() && (code < 1 || code > 299)) throw new AppException(MFA.GAPCCODE, code);
		GContact c = contact(code);
		if (c == null && ex) throw new AppException(MFA.GAPCCODE, code);
		return c;
	}

	public boolean estFantome() {
		for (CellNode cn : nodes("C.")) {
			GContact c = (GContact) cn;
			if (c.code != 1 && c.suppr == 0)
				return false;
		}
		return true;		
	}

	public List<GContact> aContacter() {
		ArrayList<GContact> lst = new ArrayList<GContact>();
		for (CellNode cn : nodes("C.")) {
			GContact c = (GContact) cn;
			if (c.aContacter == 1) lst.add(c);
		}
		return lst;
	}

	public GContact[] allContacts() {
		ArrayList<GContact> lst = new ArrayList<GContact>();
		for (CellNode cn : nodes("C.")) {
			GContact c = (GContact) cn;
			lst.add(c);
		}
		GContact[] gcs = lst.toArray(new GContact[lst.size()]);
		Arrays.sort(gcs, new CompI());
		return gcs;
	}

	public ArrayString purgeContacts(ArrayList<String> v2del) throws AppException{
		int[] pd = Calendrier.premierDernierJours();
		// pd[0] = 150501; // pour tester
		ArrayString lst = new ArrayString();
		LinkedList<GContact> lstc = new LinkedList<GContact>();
		for (CellNode cn : nodes("C.")) {
			GContact c = (GContact) cn;
			if (c.code != 1 && c.suppr != 0 && c.suppr < pd[0])
				lstc.add(c);
		}
		AppTransaction tr = AppTransaction.tr();
		for (GContact c : lstc) {
			if (c.initiales != null)
				lst.add(c.initiales);
			c.remove();
			tr.provider().purgeCellFromStorage(line(), c.code + ".", "PHOTO");
			v2del.add(Versions.keyOf("PHOTO", c.code + "."));
		}
		return lst;
	}
	
	public GContact[] allContactsSauf1() {
		ArrayList<GContact> lst = new ArrayList<GContact>();
		for (CellNode cn : nodes("C.")) {
			GContact c = (GContact) cn;
			if (c.code == 1)
				continue;
			lst.add(c);
		}
		GContact[] gcs = lst.toArray(new GContact[lst.size()]);
		Arrays.sort(gcs, new CompI());
		return gcs;
	}

	private static class CompI implements Comparator<GContact> {
		@Override public int compare(GContact o1, GContact o2) {
			return o1.initiales == null ? -1 : (o2.initiales == null ? 1 : o1.initiales.compareTo(o2.initiales));
		}
	}
	
	private int contactAyantCle(int cle) {
		if (cle <= 0) return 0;
		for (CellNode cn : nodes("C.")) {
			GContact c = (GContact) cn;
			if (c.ci1() == cle) return c.code();
		}
		return 0;
	}

	public GContact contactAyantInitiales(String s) {
		GContact c = null;
		if (s == null || s.length() > 6) return null;
		c = (GContact) nodeByKey(keyOfContactI(s));
		if (c != null)
			return c;
		return (GContact) nodeByKey(keyOfContactA(s));
	}

	public static String keyOfContact(int code) {
		return "C." + code + ".";
	}

	public static String keyOfContactN(String nom) {
		return "N." + nom + ".";
	}

	public static String keyOfContactI(String initiales) {
		return "I." + initiales + ".";
	}

	public static String keyOfContactA(String adherent) {
		return adherent == null ? null : "A." + adherent + ".";
	}

	@Override public void setup(String initiales, String nom) throws AppException {
		if (contact(1) != null)
			throw new AppException(MFA.GRPEXIST, initiales, nom);
		newContact(1, nom, initiales);
	}
	
	@Override public void addedDir(int dir) throws AppException {
	}

	@Override public void removedDir(int dir)  throws AppException {
	}

	public void searchEmails(StringBuffer sb, String filter){
		GContact g1 = contact(1);
		if (g1 == null) // !!!!!!
			return;
		String initG = g1.initiales;
		if (initG != null) {
			GContact[] lst = allContacts();
			for(GContact c : lst){
				String em = c.email1;
				if (em != null && em.contains(filter)) {
					String em2 = em.replaceAll("\n", "; ");
					sb.append("[" + initG + "] [" + c.initiales + "] " + c.nom + " ==> " + em2);
				}
			}
		}
	}

	public void supprGrp(int date) {
		GContact c = contact(1);
		if (c != null)
			c.suppr(date);
	}

	public void resetPwd1(){
		GContact c = contact(1);
		if (c != null)
			c.pwd(null);
	}

	public abstract class GContact extends CellNode {

		@Override public String[] keys() {
			return AS.as(keyOfContact(code), keyOfContactN(nom), keyOfContactI(initiales),
					keyOfContactA(adherent));
		}

		@HT(id = 1) protected int code;

		public int code() {
			return code;
		}

		public boolean isGroupement() {
			return !isGAC() && code == 1;
		}

		public boolean isDirect() {
			return !isGAC() && code >= 100;
		}

		public boolean isIntegre() {
			return !isGAC() && code > 1 && code < 100;
		}

		@HT(id = 2) protected String nom;

		public String nom() {
			return nom;
		}

		@HT(id = 3, persist = false) private String url;

		public String url() {
			return url;
		}

		public void setUrl() {
			if (nph() == 0)
				url = "images/default-64x64.jpg";
			else url = "alterconsos/mime/" + line() + "/" + code + "./PHOTO/" + nph();
		}

		@HT(id = 4) private String initiales;

		public String initiales() {
			return initiales;
		}

		@HT(id = 5) private String postitContact;

		public String postit() {
			return postitContact;
		}

		public void postit(String value) {
			if (w(this.postitContact, value)) this.postitContact = value;
		}

		@HT(id = 16) private String adherent;

		public String adherent() {
			return adherent;
		}

		public void adherent(String value) {
			if (w(adherent, value)) adherent = value;
		}

		@HT(id = 7) private int confidentialite;

		public int confidentialite() {
			return confidentialite;
		}

		public void confidentialite(int value) {
			if (w(this.confidentialite, value)) this.confidentialite = value;
		}

		@HT(id = 8) private int suppr;

		public int suppr() {
			return suppr;
		}

		public void suppr(int value) {
			if (w(suppr, value)) suppr = value;
		}

		@HT(id = 9) private String email1;

		public String email1() {
			return email1;
		}

		public void email1(String value) {
			if (w(email1, value)) this.email1 = value;
		}

		@HT(id = 11) private String telephones;

		public String telephones() {
			return telephones;
		}

		public void telephones(String value) {
			if (w(telephones, value)) this.telephones = value;
		}

		@HT(id = 12) private String ordreCheque;

		public String ordreCheque() {
			return ordreCheque;
		}

		public void ordreCheque(String value) {
			if (w(ordreCheque, value)) ordreCheque = value;
		}

		@HT(id = 18) private ArrayInt groupements;

		public ArrayInt groupements() {
			return groupements;
		}

		@HT(id = 19) private ArrayInt grExcl;

		public ArrayInt grExcl() {
			return grExcl;
		}

		@HT(id = 15) private String derniereCotis;

		public String derniereCotis() {
			return derniereCotis;
		}

		public void derniereCotis(String value) {
			if (w(derniereCotis, value)) derniereCotis = value;
		}

		@HT(id = 30) private long dhi1;

		public long dhi1() {
			return dhi1;
		}

		public void dhi1(long value) {
			if (w(dhi1, value)) dhi1 = value;
		}

		public boolean hasCle(int cle) {
			return (ci1() == cle);
		}

		@HT(id = 31) private int ci1;

		public int ci1() {
			return ci1;
		}

		public void ci1(int value) {
			if (w(ci1, value)) ci1 = value;
		}

		@HT(id = 34) private int nph;

		public int nph() {
			return nph;
		}

		public void nph(int value) {
			if (w(nph, value)) nph = value;
		}

		@HT(id = 35, hidden = true) private String pwd;

		public String pwd() {
			return pwd;
		}

		private void pwd(String value) {
			if (w(pwd, value)) {
				pwd = value;
			}
		}

		@HT(id = 40) private int couleur;

		public int couleur() {
			return couleur;
		}

		public void couleur(int value) {
			if (w(couleur, value)) couleur = value;
		}

		@HT(id = 41) private int nomail;

		public int nomail() {
			return nomail;
		}

		public void nomail(int value) {
			if (w(nomail, value)) nomail = value;
		}

		@HT(id = 43) private int unclic;

		public int unclic() {
			return unclic;
		}

		public void unclic(int value) {
			if (w(unclic, value)) unclic = value;
		}

		@HT(id = 44) private int aContacter;

		public int aContacter() {
			return aContacter;
		}

		public void aContacter(int value) {
			if (w(aContacter, value)) aContacter = value;
		}

		@HT(id = 45) private String jsonData;

		public String jsonData() {
			return jsonData;
		}

		public void jsonData(String value) {
			if (w(this.jsonData, value)) this.jsonData = value;
		}

		@HT(id = 46) private String localisation;

		public String localisation() {
			return localisation;
		}

		public void localisation(String value) {
			if (w(localisation, value)) localisation = value;
		}

		@HT(id = 47) private int novol;

		public int novol() {
			return nomail;
		}

		public void novol(int value) {
			if (w(novol, value)) novol = value;
		}

		@HT(id = 42) private String bienvenueT;

		public String bienvenueT() {
			return bienvenueT;
		}

		public void bienvenueT(String value) {
			if (w(this.bienvenueT, value)) this.bienvenueT = value;
		}

		@HT(id = 48) private String bienvenueS;

		public String bienvenueS() {
			return bienvenueS;
		}

		public void bienvenueS(String value) {
			if (w(this.bienvenueS, value)) this.bienvenueS = value;
		}

		@HT(id = 49) private int bienvenueJ;

		public int bienvenueJ() {
			return bienvenueJ;
		}

		public void bienvenueJ(int value) {
			if (w(this.bienvenueJ, value)) this.bienvenueJ = value;
		}

		public void set(AcJSONObject arg, int power) throws AppException {
			boolean reset = false;
			boolean ilpc = false;
			String nom = arg.getS("nom", null);
			if (nom != null && !"".equals(nom)) {
				GContact t2 = contactN(nom);
				if (t2 != null && t2.code() != code())
					throw new AppException(MFA.GAPCDN, code(), t2.code());
				if (nom() != null && !nom().equals(nom)) {
					ilpc = true;
					reset = true;
				}
			} else nom = nom();

			String initiales = arg.getS("initiales", null);
			if (initiales != null && initiales.length() != 0) {
				GContact t2 = contactI(initiales);
				if (t2 != null && t2.code() != code())
					throw new AppException(MFA.GAPCDI, code(), t2.code());
				if (!initiales.equals(initiales())) {
					ilpc = true;
					reset = true;
				}
			} else initiales = initiales();

			if (reset) {
				remove();
				this.initiales = initiales;
				this.nom = nom;
				insert();
			}

			String bienvenueT  = arg.getS("bienvenueT", null);
			if (bienvenueT != null) 
				this.bienvenueT(bienvenueT.length() == 0 ? null : bienvenueT);
			String bienvenueS  = arg.getS("bienvenueS", null);
			if (bienvenueS != null) 
				this.bienvenueS(bienvenueS.length() == 0 ? null : bienvenueS);
			int bienvenueJ = arg.getI("bienvenueJ", -1);
			if (bienvenueJ != -1) 
				this.bienvenueJ(bienvenueJ);

			String localisation  = arg.getS("localisation", null);
			if (localisation != null) this.localisation(localisation);

			String postitContact = arg.getS("postitContact", null);
			if (postitContact != null) {
				this.postit(postitContact);
				ilpc = true;
			}

			int conf = arg.getI("confidentialite", -1);
			if (conf != -1) {
				if (conf < 0 || conf > 2) throw new AppException(MFA.TYPCTC, conf, code());
				this.confidentialite((short) conf);
			}

			int couleur = arg.getI("couleur", -1);
			if (couleur != -1) {
				if (couleur < 0 || couleur > 16)
					couleur = code % 16;
				ilpc = true;
				this.couleur(couleur);
			}

			int nomail = arg.getI("nomail", -1);
			if (nomail != -1) {
				if (nomail < 0 || nomail > 1)
					nomail = 1;
				this.nomail(nomail);
			}

			if (code == 1) {
				int novol = arg.getI("novol", -1);
				if (novol != -1) {
					if (novol < 0 || novol > 1)
						novol = 1;
					this.novol(novol);
				}
			}
			
			int unclic = arg.getI("unclic", -1);
			if (unclic != -1) {
				if (unclic < 0 || unclic > 1)
					unclic = 1;
				this.unclic(unclic);
			}

			String email1 = arg.getS("email1", null);
			if (email1 != null) {
				this.email1(email1);
			}

			String jsonData = arg.getS("jsonData", null);
			if (jsonData != null) {
				this.jsonData(jsonData != "" ? jsonData : null);
			}

			String telephones = arg.getS("telephones", null);
			if (telephones != null) {
				this.telephones(telephones);
			}

			if (!isGAC() && (isDirect() || isGroupement())) {
				String ordreCheque = arg.getS("ordreCheque", null);
				if (ordreCheque != null) {
					this.ordreCheque(ordreCheque);
				}
			}
			
			if (power < 3){
				String adherent = arg.getS("adherent", null);
				if (adherent != null) {
					GContact t2 = contactA(adherent);
					if (t2 != null && t2.code() != code())
						throw new AppException(MFA.GAPCDA, code(), t2.code());
					this.adherent(adherent);
				}
				int aContacter = arg.getI("aContacter", -1);
				if (aContacter != -1) {
					if (aContacter < 0 || aContacter > 1)
						aContacter = 1;
					this.aContacter(aContacter);
				}
			}

			if (power < 3) {
				String derniereCotis = arg.getS("derniereCotis", null);
				if (derniereCotis != null) this.derniereCotis(derniereCotis);
			
				if (isGAC()) {
					List<Integer> l1 = arg.getLI("groupements", false, -1);
					if (l1 != null)
						groupements.copy(GAP.validGaps(l1, true));
					
					l1 = arg.getLI("grExcl", false, -1);
					if (l1 != null)
						grExcl.copy(GAP.validGaps(l1, true));
				}
			}
			
			if (code == 1 && ilpc) {
				DirectoryG d = DirectoryG.get(AppTransaction.tr().authChecker.getAuthDir());
				d.updateFromGrp(type(), grpCode(), initiales(), nom(), postit(), couleur());
			}
		}

		private void genererCle() throws AppException {
			long now = new Date().getTime();
			Random rd = new Random();
			int cle = 0;
			while (true) {
				cle = rd.nextInt(1000000000);
				if (cle < 30000) cle = cle * cle;
				int x = contactAyantCle(cle);
				if (x == 0) break;
			}
			dhi1(now);
			ci1(cle);
		}

		private void activer(boolean activer) throws AppException {
			if (activer) {
				if (suppr() != 0) suppr(0);
			} else {
				int aujourdhui = Calendrier.aujourdhui();
				suppr(aujourdhui);
			}
		}

		public int checkPwd(String pwd, int opi) {
			if (pwd == null || pwd.length() == 0) return 0;
			if (pwd.equals(pwd())) return suppr() == 0 ? 3 : 5;
			if (unclic() == 0 && opi != 52) // désabonnement envoi mails
				return 0;
			try {
				long cle = Long.parseLong(pwd);
				if (ci1() == cle)
					return suppr() == 0 ? 4 : 5;
				else return 0;
			} catch (Exception ex) {
				return 0;
			}
		}
		
	}

	public static class Op extends Operation {

		int gap = 0;
		int gac = 0;
		String line;
		String c;
		GAPC gapc;
		int power;

		@Override public String mainLine() {
			return line;
		}

		public StatusPhase phaseFaible() throws AppException {
			gap = arg().getI("gap");
			gac = arg().getI("gac");
			c = getOpName();

			if (authChecker.getAuthPower() >= 5
					&& !("24".equals(c) && authChecker.getAuthPower() == 5))
				throw new AppException(MF.ANNUL);

			line = gap != 0 ? GAP.lineOf(gap) : GAC.lineOf(gac);
			int lvl = authChecker.accessLevel(line, "0.", "");
			power = authChecker.getAuthPower();
			if (lvl < 1 || ((c.equals("24") || c.equals("23")) && power > 2))
				throw new AppException(MFA.AUTH, gap + gac);
			
			int code = arg().getI("code", -1);
			
			if (code == 1 && c.equals("25"))
				throw new AppException(MFA.AUTH, gap + gac);
			return code == 1 ? StatusPhase.transactionMultiLines : StatusPhase.transactionSimple;
		}

		public void phaseForte() throws AppException {

			gapc = gap != 0 ? GAP.get(gap) : GAC.get(gac);

			if (c.equals("21")) {
				gapc.nouveauContact(arg());
				return;
			}

			GContact contact = gapc.getContact(arg(), true);

			if (c.equals("22")) {
				contact.set(arg(), power);
				gapc.compile();
				return;
			}

			if (c.equals("23")) {
				contact.activer(false);
				return;
			}

			if (c.equals("24")) {
				contact.activer(true);
				return;
			}

			if (c.equals("25")) {
				String pwd = arg().getS("pwd", null);
				if (pwd == null)
					contact.genererCle();
				else contact.pwd(pwd);
				return;
			}

		}

	}

	public static class OpNoMail extends Operation {

		int grp;
		int usr;
		String line;
		int type;
		GAPC gapc;

		@Override public String mainLine() {
			return line;
		}

		public StatusPhase phaseFaible() throws AppException {
			IAuthChecker ac = AppTransaction.tr().authChecker;
			grp = ac.getAuthGrp();
			usr = ac.getAuthUsr();
			type = ac.getAuthType();
			if (usr == 0)
				usr = 1;
			line = type == 2 ? GAP.lineOf(grp) : GAC.lineOf(grp);
			int lvl = authChecker.accessLevel(line, "0.", "");
			if (lvl < 1)
				throw new AppException(MFA.AUTH, grp);
			return StatusPhase.transactionSimple;
		}

		public void phaseForte() throws AppException {
			gapc = type == 2 ? GAP.get(grp) : GAC.get(grp);
			GContact contact = gapc.contact(usr);
			if (contact != null)
				contact.nomail(1);
			resultat.brut = true;
			resultat.mime = "text/html";
			resultat.content = "<div>Cette adresse mail a été retirée de la liste de diffusion."
					+ " Pour la réintégrer se connecter à l'application, accéder à <b>Mon Profil</b>,"
					+ " puis <b>Modifier les données personnelles</b> et y cocher la case correspondante</div>"; 
		}

	}

	public static class OpNoUnClic extends Operation {

		int grp;
		int usr;
		String line;
		int type;
		GAPC gapc;

		@Override public String mainLine() {
			return line;
		}

		public StatusPhase phaseFaible() throws AppException {
			IAuthChecker ac = AppTransaction.tr().authChecker;
			grp = ac.getAuthGrp();
			usr = ac.getAuthUsr();
			type = ac.getAuthType();
			if (usr == 0)
				usr = 1;
			line = type == 2 ? GAP.lineOf(grp) : GAC.lineOf(grp);
			int lvl = authChecker.accessLevel(line, "0.", "");
			if (lvl < 1)
				throw new AppException(MFA.AUTH, grp);
			return StatusPhase.transactionSimple;
		}

		public void phaseForte() throws AppException {
			gapc = type == 2 ? GAP.get(grp) : GAC.get(grp);
			GContact contact = gapc.contact(usr);
			if (contact != null)
				contact.unclic(0);
			resultat.brut = true;
			resultat.mime = "text/html";
			resultat.content = "<div>L'accès en un clic a été supprimé."
					+ " Pour le rétablir se connecter à l'application, accéder à <b>Mon Profil</b>,"
					+ " puis <b>Modifier les données personnelles</b> et y cocher la case correspondante</div>"; 
		}

	}

	public static class StorePhoto extends fr.hypertable.StorePhoto {

		private String type;
		private int code = 0;

		@Override public StatusPhase phaseFaible() throws AppException {
			if (authChecker.getAuthPower() >= 5) throw new AppException(MF.ANNUL);
			if (authChecker.getAuthType() == 0) throw new AppException(MF.PHOTO);

			column = arg().getS("c");
			try {
				code = Short.parseShort(column.substring(0, column.length() - 1));
			} catch (Exception ex) {
				throw new AppException(MFA.ANIMGACP, column, line);
			}
			line = arg().getS("l");

			type = line.startsWith("C.") ? "GAC" : "GAP";

			Cell c = Cell.get(line, "0.", type, 0);
			if (c.version() == -1) throw new AppException(MFA.ANIMGACP, column, line);
			if (c instanceof GAC) {
				if (((GAC) c).contact(code) == null)
					throw new AppException(MFA.ANIMGACP, column, line);
			} else if (c instanceof GAP) {
				if (((GAP) c).contact(code) == null)
					throw new AppException(MFA.ANIMGACP, column, line);
			} else throw new AppException(MFA.ANIMGACP, column, line);
			return super.phaseFaible();
		}

		@Override public void phaseForte() throws AppException {
			super.phaseForte();
			GAPC c = (GAPC) Cell.get(line, "0.", type, 0);
			GContact contact = c.contact(code);
			if (contact != null) {
				contact.nph(contact.nph() + 1);
				contact.setUrl();
			}
		}
	}
		
	private static final int[] cols = {3, 5, 20, 10, 10, 3, 5, 10, 8, 20, 5, 5, 5,
		10, 20, 20, 20, 20, 20};

	private static String[] confids = {"normale", "restreinte", "publique"};

	private static String[][] sheetNames = {{"Alterconsos"}, {"Producteurs"}};

	public static class OpGapcExport extends Operation {

		@Override public String mainLine() {
			return null;
		}

		@Override public StatusPhase phaseFaible() throws AppException {
			IAppConfig cfg = HTServlet.appCfg;
			IAuthChecker ac = authChecker;
			int grp = ac.getAuthGrp();
			int type = ac.getAuthType();
			int usr = ac.getAuthUsr();
			GAPC gapc = type == 1 ? GAC.get(grp) : GAP.get(grp);
			// Directory[] dirs = Directory.myDirs();
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			WB wb = new WB(bos, sheetNames[type - 1]);
			
			wb.nextRow(0);
			int nc = 0;
			wb.write(nc++, "Code");
			wb.write(nc++, "Initiales");
			wb.write(nc++, "Nom");
			wb.write(nc++, "Adhérent");
			wb.write(nc++, "Résilié");
			wb.write(nc++, "Couleur");
			wb.write(nc++, "Mot de passe");
			wb.write(nc++, "Clé générée à ");
			wb.write(nc++, "Confidentialité");
			wb.write(nc++, "E-mail");
			wb.write(nc++, "Synth. Hebdo.");
			wb.write(nc++, "Accès en 1 clic");
			wb.write(nc++, "A contacter");
			wb.write(nc++, "Téléphones");
			wb.write(nc++, "Localisation");
			wb.write(nc++, "Postit");
			if (type == 2)
				wb.write(nc++, "Ordre des chèques");
			if (type == 1) {
				wb.write(nc++, "Dernière cotisation");
				wb.write(nc++, "Animateur des groupements");
				wb.write(nc++, "Ne reçoit pas les produits de");
			}		

			GContact[] lst = gapc.allContacts();
			for(GContact c : lst){
				if (usr != 0 && usr != c.code)
					continue;
				wb.nextRow(0);
				nc = 0;
				wb.write(nc++, new Long(c.code));
				wb.write(nc++, c.initiales);
				wb.write(nc++, c.nom);
				wb.write(nc++, c.adherent);
				wb.write(nc++, c.suppr == 0 ? "actif" : "résilié depuis " + c.suppr);
				wb.write(nc++, new Long(c.couleur));
				wb.write(nc++, c.pwd != null ? "oui" : "non");
				wb.write(nc++, c.ci1 == 0 ? "non" : "" + c.ci1 + " générée à " 
						+ cfg.sdf1().format(new Date(c.dhi1)));
				wb.write(nc++, confids[c.confidentialite]);
				wb.write(nc++, cfg.parseEmails(c.email1));
				wb.write(nc++, c.nomail == 1 ? "non" : "oui");
				wb.write(nc++, c.unclic == 1 ? "oui" : "non");
				wb.write(nc++, c.aContacter == 1 ? "oui" : "non");
				wb.write(nc++, c.telephones);
				wb.write(nc++, c.localisation);
				wb.write(nc++, c.postitContact);
				if (type == 2)
					wb.write(nc++, c.ordreCheque());
				if (type == 1) {
					wb.write(nc++, c.derniereCotis);
					StringBuffer sb = new StringBuffer();
					for(int g : c.groupements) {
						Directory.Entry e = Directory.entryG(2, g);
						if (e != null){
							if (sb.length() != 0)
								sb.append("\n");
							sb.append(e.initiales() + " - " + e.label());
						}
					}
					wb.write(nc++, sb.length() != 0 ? sb.toString() : null);
					sb = new StringBuffer();
					for(int g : c.grExcl) {
						Directory.Entry e = Directory.entryG(2, g);
						if (e != null){
							if (sb.length() != 0)
								sb.append("\n");
							sb.append(e.initiales() + " - " + e.label());
						}
					}
					wb.write(nc++, sb.length() != 0 ? sb.toString() : null);
				}		
			}
						
			wb.setCols(cols, 0);
			wb.close();
			resultat.mime = "application/vnd.ms-excel";
			resultat.bytes = bos.toByteArray();
			return StatusPhase.brut;
		}

		@Override public void phaseForte() throws AppException {}

	}

}
