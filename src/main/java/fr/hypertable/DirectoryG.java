package fr.hypertable;

import java.util.HashSet;

import fr.alterconsos.cell.Directory;
import fr.alterconsos.cell.GAC;
import fr.alterconsos.cell.GAP;
import fr.alterconsos.cell.GAPC;
import fr.alterconsos.cell.IGrp;
import fr.hypertable.AppTransaction.StatusPhase;

public abstract class DirectoryG extends Cell {

	public static String columnOf(int code) {
		return "" + code + ".";
	}

	public static DirectoryG get(int code) throws AppException {
		return (DirectoryG) Cell.get("D", columnOf(code), "Directory");
	}
	
	private int code = 0;

	public int code() {
		return code;
	}

	@Override public void setIds() {
		String s = column();
		code = Integer.parseInt(s.substring(0, s.length() - 1));
	}

	public String label() {
		Entry e = entry(0, code);
		return e != null ? e.label : "#" + code;
	}
	
	protected abstract boolean isValidType(int type);

	protected abstract boolean isMultiDir(int type);
	
	protected abstract IGrp getGrpCell(int type, int code) throws AppException; 
	
	@Override public void compile() throws AppException {
		if ("0.".equals(column())) {
			Entry entry = entry(0, 0);
			if (entry == null)
				entry = newEntry(0, 0, "ANGEN", "Annuaire des Annuaires");
		}
		if (getBuild() < 254) {
			for(CellNode cn : nodesByKey("C.")){
				Entry x = (Entry)cn;
				if (x.type != 0 && x.dirs.size() == 0) {
					x.dirmail(this.code);
					x.dirs.add(code());
				}
			}
			setBuild(254);
		}
	}
	
	private String sha(String pwd, int type, int code){
		return AppTransaction.tr().authChecker.toSHA1(pwd, type, code);
	}
	
	public Entry entry(int type, int code) {
		return (Entry) nodeByKey(keyOfEntryC(type, code));
	}

	private Entry entryByInitiales(int type, String initiales) {
		for (CellNode cn : nodesByKey(keyOfEntryIp(type, initiales))){
			Entry e = (Entry) cn;
			if (e.removed == 0)
				return e;
		};
		return null;
	}

	private Entry entryByLabel(int type, String label) {
		for (CellNode cn : nodesByKey(keyOfEntryIp(type, label))){
			Entry e = (Entry) cn;
			if (e.removed == 0)
				return e;
		};
		return null;
	}

	private Next next(int type) throws AppException {
		Next next = (Next) nodeByKey("N." + type + ".");
		if (next == null) {
			next = (Next) newCellNode("Next");
			next.type = type;
			next.next = 0;
			next.insert();
		}
		return next;
	}

	private Entry newEntry(int type, int code, String label, String initiales) throws AppException {
		Entry entry = entry(type, code);
		if (entry != null)
			entry.remove();
		entry = (Entry) newCellNode("Entry");
		entry.code = code;
		entry.type = type;
		entry.label = label;
		entry.initiales = initiales;
		entry.insert();
		return entry;
	}

	/****************************************************************/
	// Depuis un directory local

	private void createDir(String initiales, String label) throws AppException {
		Entry e = entryByLabel(0, label);
		if (e != null) 
			throw new AppException(MF.DIRLABD, label, 0, "?", e.code());
		e = entryByInitiales(0, initiales);
		if (e != null) 
			throw new AppException(MF.DIRLABD, initiales, 0, "?", e.code());
		int code = getCode(0);
		Entry entry = newEntry(0, code, label, initiales);
		String s = sha("0000", 0, code);
		entry.pwd(s);
		entry.dirmail(this.code);
		Entry e2 = DirectoryG.get(code).newEntry(0, code, label, initiales);
		e2.pwd(s);
		e2.dirmail(this.code);
	}

	private void activateDir(int code, boolean activer) throws AppException {
		if (code == 0) 
			return;
		Entry entry = entry(0, code);
		if (entry == null) 
			throw new AppException(MF.DIRACT, code);
		if (activer) {
			if (entry.suppr() == 0) 
				return;
			entry.suppr(0);
		} else {
			if (entry.suppr() != 0) 
				return;
			entry.suppr(HTServlet.appCfg.aujourdhui());
		}
		Entry e2 = DirectoryG.get(code).entry(0, code);
		e2.suppr(entry.suppr());
	}
	
	void resetDirPwd(int code) throws AppException{
		if (code == 0) 
			return;
		Entry entry = entry(0, code);
		if (entry == null) 
			throw new AppException(MF.DIRACT, code);
		entry.pwd(sha("0000", 0, code));
		Entry e2 = DirectoryG.get(code).entry(0, code);
		e2.pwd(sha("0000", 0, code));
	}
	
	private void updateDir(int code, String initiales, String label, String postit, int couleur) throws AppException{
		Entry entry = entry(0, code);
		if (entry == null) 
			throw new AppException(MF.DIRACT, code);
		Entry e;
		if (label != null) {
			e = entryByLabel(0, label);
			if (e != null && e.code() != code) 
				throw new AppException(MF.DIRLABD, label, 0, "?", e.code());
		}
		if (initiales != null) {
			e = entryByInitiales(0, initiales);
			if (e != null && e.code() != code) 
				throw new AppException(MF.DIRLABD, initiales, 0, "?", e.code());
		}
		
		if (initiales != null || label != null) {
			entry.remove();
			if (initiales != null)
				entry.initiales = initiales;
			if (label != null)
				entry.label = label;
			entry.insert();
		}
		
		if (postit != null)
			entry.postit(postit);
		if (couleur >= 0)
			entry.couleur(couleur);
				
		if (code != 0) {
			DirectoryG d = DirectoryG.get(0);
			Entry e2 = d.entry(0, code);
			if (initiales != null || label != null) {
				e2.remove();
				e2.initiales = entry.initiales;
				e2.label = entry.label;
				e2.insert();
			}
			e2.postit(entry.postit);
			e2.couleur(entry.couleur);
		}
	}

	/****************************************************************/
	// Depuis un directory local
	
	private void setDirPwd(String pwd) throws AppException {
		DirectoryG d = DirectoryG.get(0);
		Entry entry = d.entry(0, code);
		if (entry.suppr() != 0)
			throw new AppException(MF.DIRSUPPR2, code);
		if (entry != null) {
			entry.pwd(pwd);
			Entry e2 = DirectoryG.get(code).entry(0, code);
			e2.pwd(pwd);
		}
	}

	private void createGrp(int type, String initiales, String label) throws AppException {
		Entry e = entryByLabel(type, label);
		if (e != null) 
			throw new AppException(MF.DIRGRPX, type, initiales, label, e.code());
		e = entryByInitiales(type, initiales);
		if (e != null) 
			throw new AppException(MF.DIRGRPX, type, initiales, label, e.code());
		DirectoryG d = DirectoryG.get(0);
		int code = d.getCode(type);
		e = newEntry(type, code, label, initiales);
		e.pwd(sha("0000", type, code));
		e.dirs.add(this.code);
		IGrp gapc = getGrpCell(type, code);
		gapc.setup(initiales, label);
		gapc.addedDir(this.code);
	}
	
	private void removeGrp(int type, int code) throws AppException {
		Entry e = entry(type, code);
		if (e == null || e.removed != 0) 
			throw new AppException(MF.DIRGRPR, type, code);
		IGrp gapc = getGrpCell(type, code);
		int auj = HTServlet.appCfg.aujourdhui();
		if (e.dirs.size() == 1){
			if (e.suppr() != 0) 
				return;
			e.suppr(auj);
			e.dirmail(0);
			gapc.supprGrp(e.suppr());
		} else {
			int j = e.dirs.indexOf(this.code);
			if (j >= 0)
				e.dirs.remove(j);
			int d0 = e.dirs().getZ(0);
			if (e.dirmail() == this.code)
				e.dirmail(d0);
			for(int dirx : e.dirs()){
				if (dirx == this.code)
					continue;
				DirectoryG dx = DirectoryG.get(dirx);
				Entry ex = dx.entry(type, code);
				if (e.dirmail() == this.code)
					ex.dirmail(d0);
				ex.dirs.clear();
				for(int i : e.dirs)
					ex.dirs.add(i);
			}
			e.removed(auj);
			gapc.removedDir(this.code);
		}
	}

	private void reactivateGrp(int type, int code) throws AppException {
		Entry e = entry(type, code);
		if (e == null || e.removed != 0) 
			throw new AppException(MF.DIRGRPR, type, code);
		if (e.suppr() == 0) 
			return;
		e.suppr(0);
		e.dirmail(this.code);
		getGrpCell(type, code).supprGrp(0);
	}
	
	private void replicateGrp(Entry e) throws AppException{
		if (e == null)
			return;
		for(int dir : e.dirs()){
			if (dir == code)
				continue;
			DirectoryG d = DirectoryG.get(dir);
			Entry e2 = d.entry(e.type, e.code);
			e2.remove();
			e2.initiales = e.initiales;
			e2.label = e.label;
			e2.insert();
			e2.pwd(e.pwd);
			e2.pwd2(e.pwd2);
			e2.couleur(e.couleur);
			e2.postit(e.postit);
			e2.mailer(e.mailer);
			e2.jourmail(e.jourmail);
			e2.dirmail(e.dirmail);
			e2.dirs.clear();
			for(int i : e.dirs)
				e2.dirs.add(i);
		}
	}
	
	public void updateFromGrp(int type, int code, String initiales, 
			String label, String postit, int couleur) throws AppException {
		Entry e = entry(type, code);
		if (e == null || e.suppr() != 0 || e.removed != 0)
			throw new AppException(MF.DIRSUPPR, type, code);
		Entry e1 = entryByLabel(type, label);
		if (e1 != null && e1.code != code) 
			throw new AppException(MF.DIRGRPX, type, initiales, label, e1.code());
		e1 = entryByInitiales(type, initiales);
		if (e1 != null && e1.code != code) 
			throw new AppException(MF.DIRGRPX, type, initiales, label, e1.code());
		if (!e.initiales.equals(initiales) || !e.label.equals(label)) {
			e.remove();
			e.initiales = initiales;
			e.label = label;
			e.insert();
		}
		e.postit(postit);
		e.couleur(couleur);
		replicateGrp(e);
	}

	private void updateMail(int type, int code, int jourmail, String mailer) throws AppException {
		Entry e = entry(type, code);
		if (e == null || e.suppr() != 0 || e.removed != 0)
			throw new AppException(MF.DIRSUPPR, type, code);
		if (jourmail != -1)
			e.jourmail(jourmail);
		if (mailer != null)
			e.mailer(mailer);
		e.dirmail(this.code);
		replicateGrp(e);
	}
	
	private void updatePwds(int type, int code, String pwd, String pwd2) throws AppException {
		Entry e = entry(type, code);
		if (e == null || e.suppr() != 0 || e.removed != 0)
			throw new AppException(MF.DIRSUPPR, type, code);
		if (pwd != null)
			e.pwd(pwd);
		if (pwd2 != null)
			e.pwd2(pwd2);
		GAPC gapc = type == 1 ? GAC.get(code) : GAP.get(code);
		gapc.resetPwd1();
		replicateGrp(e);
	}
	
	private void importGrp(int type, int code, int dir, String pwd) throws AppException {
		DirectoryG d = DirectoryG.get(dir);
		if (d == null) 
			throw new AppException(MF.BADIMP0, type, code, dir);
		Entry e = d.entry(type, code);
		if (e == null || e.removed != 0) 
			throw new AppException(MF.BADIMP1, type, code, dir);
		if (e.suppr() != 0)
			throw new AppException(MF.DIRSUPPR, type, code);
		if (e.checkPwd(pwd) == 0)
			throw new AppException(MF.BADIMP2, type, code, dir);
		
		Entry e3 = entryByLabel(type, e.label);
		if (e3 != null && e3.code != code) 
			throw new AppException(MF.DIRGRPX, type, e.initiales, e.label, e3.code());
		e3 = entryByInitiales(type, e.initiales);
		if (e3 != null && e3.code != code) 
			throw new AppException(MF.DIRGRPX, type, e.initiales, e.label, e3.code());

		int j = e.dirs.indexOf(this.code);
		if (j == -1)
			e.dirs.add(this.code);
		
		Entry e2 = newEntry(type, e.code, e.label, e.initiales);
		e2.pwd(e.pwd);
		e2.pwd2(e.pwd2);
		e2.couleur(e.couleur);
		e2.postit(e.postit);
		e2.mailer(e.mailer);
		e2.jourmail(e.jourmail);
		e2.dirmail(e.dirmail);
		e2.dirs.clear();
		for(int i : e.dirs)
			e2.dirs.add(i);
		
		for(int dirx : e.dirs()){
			if (dirx == this.code || dirx == dir)
				continue;
			DirectoryG dx = DirectoryG.get(dirx);
			Entry ex = dx.entry(type, e.code);
			ex.dirs.clear();
			for(int i : e2.dirs)
				ex.dirs.add(i);
		}
		
		IGrp gapc = getGrpCell(type, e.code);
		gapc.addedDir(this.code);
	}
	
	protected Entry resetGrpPwd(int type, int code) throws AppException{
		Entry e = entry(type, code);
		if (e == null || e.suppr() != 0)
			throw new AppException(MF.DIRSUPPR, type, code);
		e.pwd(sha("0000", type, code));
		replicateGrp(e);
		return e;
	}
	
	private int getCode(int type) throws AppException {
		Next next = next(type);
		next.next(next.next() + 1);
		return next.next();
	}
	
	public int getBuild(){
		Recomp r = (Recomp)nodeByKey("R");
		return r == null ? 0 : r.recomp;
	}
	
	public void setBuild(int build) throws AppException{
		Recomp r = (Recomp)nodeByKey("R");
		if (r == null) {
			r = (Recomp) newCellNode("Recomp");
			r.insert();
		}
		r.recomp(build);
	}
	
	public class Recomp extends CellNode {
		@HT(id = 2) private int recomp;

		public void recomp(int value) {
			if (w(this.recomp, value)) this.recomp = value;
		}

	}

	public class Next extends CellNode {
		@Override public String[] keys() {
			String[] keys = { "N." + type + "." };
			return keys;
		}

		@HT(id = 1) public int type;

		public int type() {
			return type;
		}

		@HT(id = 2) public int next;

		public int next() {
			return next;
		}

		public void next(int value) {
			if (w(next, value)) next = value;
		}

	}

	public HashSet<Integer> codesOf(HashSet<Integer> hs, int type){
		if (hs == null)
			hs = new HashSet<Integer>();
		for(CellNode cn : nodesByKey("C."+ type + "."))
			hs.add(((Entry)cn).code);
		return hs;
	}
	
	public static String keyOfEntryC(int type, int code) {
		return "C." + type + "." + code + ".";
	}

	public static String keyOfEntryCp(int type) {
		return "C." + type + ".";
	}

	public static String keyOfEntryL(int type, String label, int code) {
		return "L." + type + "." + label + "." + code + ".";
	}

	public static String keyOfEntryLp(int type, String label) {
		return "L." + type + "." + label + ".";
	}

	public static String keyOfEntryI(int type, String initiales, int code) {
		return "I." + type + "." + initiales +  "." + code + ".";
	}

	public static String keyOfEntryIp(int type, String initiales) {
		return "I." + type + "." + initiales +  ".";
	}

	@HTCN(id = 1) public class Entry extends CellNode {
		@Override public String[] keys() {
			return AS.as(keyOfEntryC(type, code), keyOfEntryL(type, label, code),
					keyOfEntryI(type, initiales, code));
		}
		
		public int[] getDirs(){
			int[] x = new int[dirs.size()];
			for (int i = 0; i < dirs.size(); i++)
				x[i] = dirs.get(i);
			return x;
		}
		
		@HT(id = 1) public int type;

		public int type() {
			return type;
		}

		@HT(id = 2) public int code;

		public int code() {
			return code;
		}

		@HT(id = 3) private int suppr;

		public int suppr() {
			return suppr;
		}

		private void suppr(int value) {
			if (w(suppr, value)) suppr = value;
		}

		@HT(id = 7) private String initiales;

		public String initiales() {
			return initiales != null ? initiales : AS.shortId(label);
		}

		@HT(id = 8) private String postit;

		public String postit() {
			return postit;
		}

		private void postit(String value) {
			if (w(postit, value)) {
				postit = value;
			}
		}

		@HT(id = 4) private String label;

		public String label() {
			return label;
		}

		@HT(id = 5, hidden = true) private String pwd;

		public String pwd() {
			return pwd;
		}

		private void pwd(String value) {
			if (w(pwd, value)) {
				pwd = value;
			}
		}

		@HT(id = 6, hidden = true) private String pwd2;

		public String pwd2() {
			return pwd2;
		}

		private void pwd2(String value) {
			if (w(pwd2, value)) {
				pwd2 = value;
			}
		}
				
		@HT(id = 10) private int couleur;

		public int couleur() {
			return couleur;
		}

		public void couleur(int value) {
			if (w(couleur, value)) couleur = value;
		}

		@HT(id = 12) private String mailer;

		public String mailer() {
			return mailer;
		}

		private void mailer(String value) {
			if (w(mailer, value)) {
				mailer = value;
			}
		}
		
		@HT(id = 13) private int jourmail;

		public int jourmail() {
			return jourmail;
		}

		public void jourmail(int value) {
			if (w(jourmail, value)) jourmail = value;
		}

		@HT(id = 14) private int dirmail;

		public int dirmail() {
			return dirmail;
		}

		public void dirmail(int value) {
			if (w(dirmail, value)) dirmail = value;
		}

		@HT(id = 16) private int removed;

		public int removed() {
			return removed;
		}

		public void removed(int value) {
			if (w(removed, value)) removed = value;
		}

		@HT(id = 15) protected ArrayInt dirs;

		public ArrayInt dirs() {
			return dirs;
		}

		// private final int[] f = { 1, 2, 3, 4, 5, 6, 7, 8 };

		public int checkPwd(String pwd) throws AppException {
			String s2 = pwd2();
			if (pwd == null || pwd.length() == 0) return 0;
			if (pwd.equals(pwd())) return suppr() == 0 ? 1 : 5;
			String[] sx = s2 != null && s2.length() != 0 ? s2.split(" ") : new String[0];
			for (String mp : sx) {
				if (pwd.equals(mp)) return suppr() == 0 ? 2 : 6;
			}
			return 0;
		}

	}

	public abstract static class Op extends Operation {
		private int cmd = 0;

		public int authDir = -1;
		private String nomdir = null;

		private int type = 0;
		private int code = 0;

		private String label = null;
		private String initiales = null;
		private String postit = null;
		private String pwd = null;
		private String pwd2 = null;
		private String mailer = null;
		private int couleur = -1;
		private int jourmail = -1;
		private int impDir = -1;
		
		@Override public String mainLine() {
			return "D";
		}
		
		// 70 : createDir(String initiales, String label)
		// 71 : activateDir(int code, boolean activer)
		// 72 : desactivateDir(int code, boolean activer) 
		// 73 : resetDirPwd(int code)
		
		// 75 : setDirPwd(String pwd)
		// 76 : updateDir(int code, String initiales, String label, String postit, int couleur)
		// 77 : createGrp(int type, String initiales, String label)
		// 78 : removeGrp(int type, int code)
		// 79 : reactivateGrp(int type, int code)
		// 80 : importGrp(int type, String impGrp, int dir, String pwd)
		// 81 : updateMail(int type, int code, int jourmail, String mailer)
		// 82 : resetGrpPwd(int type, int code)
		
		// 85 : updatePwds(int type, int code, String pwd, String pwd2)
		
		@Override public StatusPhase phaseFaible() throws AppException {
			cmd = Integer.parseInt(getOpName());
			IAuthChecker ac = authChecker;
			authDir = ac.getAuthDir();
			int at = ac.getAuthType();

			if (cmd >= 70 && cmd <= 72 && at != IAuthChecker.ADMINGEN)
				throw new AppException(MF.ADMING);
			if (cmd >= 75 && cmd <= 82 && at != IAuthChecker.ADMINLOC) {
				if (!(cmd == 76 && at == IAuthChecker.ADMINGEN))
					throw new AppException(MF.ADMINL);
			}
				
			Directory dir = AppTransaction.tr().myDir();
			nomdir = dir.label();

			type = arg().getI("type", -1);
			if (type != 0 && !dir.isValidType(type))
				throw new AppException(MF.DIRTYPE, nomdir, type);
			if (type == -1 && cmd >= 77)
				throw new AppException(MF.DIRTYPE, nomdir, type);
			
			code = arg().getI("code", -1);
			if (code < -1) 
				throw new AppException(MF.DIRCODE, nomdir, type, code);
			if (code == -1 && cmd != 70 && cmd != 75 && cmd != 77)
				throw new AppException(MF.DIRCODE, nomdir, type, code);

			label = arg().getS("label", null);
			if (label == null && (cmd == 70 || cmd == 77))
				throw new AppException(MF.DIRLAB, nomdir, type, code);

			initiales = arg().getS("initiales", null);
			if (initiales == null && (cmd == 70 || cmd == 77))
				throw new AppException(MF.DIRLAB, nomdir, type, code);

			postit = arg().getS("postit", null);
			mailer = arg().getS("mailer", null);
			pwd = arg().getS("pwd", null);
			pwd2 = arg().getS("pwd2", null);
			
			if (pwd == null && cmd == 75)
				throw new AppException(MF.DIRPWD, code);

			if (pwd == null && pwd2 == null && cmd == 85)
				throw new AppException(MF.DIRPWD2, code);

			impDir = arg().getI("impDir", -1);
			if (cmd == 80 && impDir < 0) 
				throw new AppException(MF.IMPDIR, nomdir, type, impDir);
			
			couleur = arg().getI("couleur", -1);
			if (couleur != -1) {
				if (couleur < 0 || couleur > 16)
					couleur = code % 16;
			}

			jourmail = arg().getI("jourmail", -1);
			if (jourmail != -1) {
				if (jourmail < 0 || jourmail > 7)
					jourmail = 0;
			}

			return StatusPhase.transactionMultiLines;
		}

		@Override public void phaseForte() throws AppException {
			DirectoryG dir = (DirectoryG) Cell.get("D", "" + authDir + ".", "Directory");

			switch(cmd) {
			case 70 : {
				dir.createDir(initiales, label);
				break;
			}
			case 71 : {
				dir.activateDir(code, true);
				break;
			}
			case 72 : {
				dir.activateDir(code, false);
				break;
			}
			case 73 : {
				dir.resetDirPwd(code);
				break;
			}
			case 75 : {
				dir.setDirPwd(pwd);
				break;
			}
			case 76 : {
				dir.updateDir(code, initiales, label, postit, couleur);
				break;
			}
			case 77 : {
				dir.createGrp(type, initiales, label);
				break;
			}
			case 78 : {
				dir.removeGrp(type, code);
				break;
			}
			case 79 : {
				dir.reactivateGrp(type, code);
				break;
			}
			case 80 : {
				dir.importGrp(type, code, impDir, pwd);
				break;
			}
			case 81 : {
				dir.updateMail(type, code, jourmail, mailer);
				break;
			}
			case 82 : {
				dir.resetGrpPwd(type, code);
				break;
			}
			case 85 : {
				dir.updatePwds(type, code, pwd, pwd2);
				break;
			}
			}

		}

	}

}
