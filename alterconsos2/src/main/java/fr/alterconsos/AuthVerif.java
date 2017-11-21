package fr.alterconsos;

import java.security.MessageDigest;
import java.util.LinkedList;

import org.json.simple.AcJSONObject;

import fr.alterconsos.cell.GAC;
import fr.alterconsos.cell.GAP;
import fr.alterconsos.cell.GAPC;
import fr.alterconsos.cell.GAPC.GContact;
import fr.hypertable.AS;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.Cell;
import fr.hypertable.HTServlet;
import fr.hypertable.IAppConfig;
import fr.alterconsos.cell.Directory;
import fr.hypertable.IAuthChecker;
import fr.hypertable.DirectoryG.Entry;

public class AuthVerif implements IAuthChecker {

	/*
	 * 0 : non authentifié, -1 : admin générale, -2 : admin locale, -3 : task,
	 * 1 : GAC / AC, 2 GAP / AP
	 */
	private int authType = 0;

	/*
	 * Pour un GAP / GAC 1 = par mot de passe principal 2 = par l'un des mots de
	 * passe secondaires. Si annulé, 5 et 6
	 * 
	 * Pour un AC / AP, 3 = par le mot de passe, 4 par la clé de l'AC
	 */
	private int authInfo = 0;

	private String authDiag = null;

	private int authDir = 0;

	private int authGrp = 0;

	private int authUsr = 0;

	private int authPower = 0;
	
	private int[] dirs = new int[1];
		
	public int getAuthType() {
		return authType;
	}

	public int getAuthGrp() {
		return authGrp;
	}

	public int getAuthUsr() {
		return authUsr;
	}

	public String getAuthDiag() {
		return authDiag;
	}

	public int getAuthInfo() {
		return authInfo;
	}

	public int getAuthDir() {
		return authDir;
	}

	private Directory dir = null;

	public int getAuthPower() {
		return authPower;
	}

	public int[] getDirs() {
		return dirs;
	}
	
	private Directory[] myDirs = new Directory[1];
	public Directory[] myDirs(){
		return myDirs;
	}
		
	public boolean isMyDir(int dir){
		for(int d : dirs)
			if (d == dir)
				return true;
		return false;
	}
	
	private AppTransaction tr;

	AppTransaction tr() {
		return tr;
	}

	private static Directory[] myDirs(int[] dirs) throws AppException{
		LinkedList<Directory> lst = new LinkedList<Directory>();
		for(int dir : dirs){
			Directory d = (Directory)Directory.get(dir);
			if (d != null)
				lst.add(d);
		}
		return lst.toArray(new Directory[lst.size()]);
	}
	
	public void setInternalTask(String dirId) throws AppException{
		authType = IAuthChecker.TASK;
		authDir = Integer.parseInt(dirId);
		authInfo = 1;
		dirs = new int[1];
		dirs[0] = authDir;
		dir = (Directory) Cell.get("D", "" + authDir + ".", "Directory");
		myDirs[0] = dir;
	}

	public boolean verifierAuth() throws AppException {
		tr = AppTransaction.tr();
		dir = (Directory) Cell.get("D", "" + authDir + ".", "Directory");
		myDirs[0] = dir;
		dirs[0] = authDir;

		IAppConfig cfg = HTServlet.appCfg;
		Entry entry = null;
		AcJSONObject arg = tr.getArg();
		
		int at = arg.getI("at", 0);
		if (at < -2 || at > 2) {
			authDiag = "Mode d'authentification inconnu";
			return false;
		}
		if (at == 0) {
			authType = 0;
			return true;
		}
		
		String pwd = arg.getS("ap", null);
		if (pwd == null || pwd.length() == 0) {
			authDiag = "Mot de passe (ou clé d'accès) absent";
			return false;
		}

		if (at == IAuthChecker.ADMINGEN) {
			if (cfg.isAdmin(pwd)) {
				authType = IAuthChecker.ADMINGEN;
				authDir = 0;
				authInfo = 1;
				dirs = new int[1];
				dirs[0] = authDir;
				return true;					
			}
			authDiag = "Authentification d'administrateur général non acceptée";
			return false;
		}
		
		authType = at;
		authDir = arg.getI("ad", -1);

		if (authDir <= 0){
			authDiag = "Directory " + authDir + " inexistant";
			return false;
		}
		dir = tr.myDir();
		myDirs[0] = dir;
		if (dir == null || dir.isEmpty()) {
			authDiag = "Directory " + authDir + " inexistant";
			return false;
		}
		
		entry = dir.entry(0, authDir);

		if (authType == IAuthChecker.ADMINLOC) {
			authPower = entry.checkPwd(pwd);
			if (authPower != 0)
				return true;
			authDiag = "Mot de passe non reconnu";
			return false;
		}

		authGrp = arg.getI("ag", -1);
		if (authGrp == -1) {
			authDiag = (authType == 1 ? "Groupe" : "Groupement") + " absent";
			return false;
		}

		String pwd2 = toSHA1(pwd, authType, authGrp);
		
		entry = dir.entry(authType, authGrp);
		if (entry == null || entry.suppr() != 0 || entry.removed() != 0) {
			authDiag = (authType == 1 ? "Groupe" : "Groupement") + " non reconnu";;
			return false;
		}
		dirs = entry.getDirs();
		myDirs = myDirs(dirs);
		GAPC gapc = authType == 1 ? GAC.get(authGrp) : GAP.get(authGrp);
		
		GContact c = null;
		String au = arg.getS("au", null);
		if (au == null || au.equals("0")){
			authUsr = 0;
			authPower = entry.checkPwd(pwd);
			if (authPower > 0) return true;
			authPower = entry.checkPwd(pwd2);
			if (authPower > 0) return true;
			c = gapc.contact(1);
			if (c != null) {
				authPower = c.checkPwd(pwd, 0);
				if (authPower > 0) return true;
				authPower = c.checkPwd(pwd2, 0);
				if (authPower > 0) return true;
			}
			authDiag = "Mot de passe (ou clé d'accès) non reconnu";
			return false;
		}
		
		try {
			c = gapc.contact(Integer.parseInt(au));
			if (c == null)
				c = gapc.contactAyantInitiales(au);
		} catch (Exception e) {
			c = gapc.contactAyantInitiales(au);
		}
		if (c == null) {
			authDiag = (authType == 1 ? "Alterconso" : "Producteur") + " non reconnu";;
			return false;
		}
		authUsr = c.code();
		// Accepte mot de passe du groupe
		authPower = entry.checkPwd(pwd);
		if (authPower > 0) return true;
		String op = arg.getS("op", "0");
		int opi = 0;
		try { opi = Integer.parseInt(op); } catch (Exception e){}
		authPower = c.checkPwd(pwd, opi);
		if (authPower > 0) return true;
		authDiag = "Mot de passe (ou clé d'accès) non reconnu";
		return false;
	}

	public int accessLevel(String line, String column, String type) {

		if (authType == 0) // aucun
			return (("D".equals(line) && "Directory".equals(type)) 
					|| "PHOTO".equals(type) || "HTML".equals(type)) ? 1 : 0;

		if (authType == IAuthChecker.ADMINGEN)
			return "D".equals(line) && "Directory".equals(type) ? 9 : 0;

		boolean isMasterDir = "D".equals(line) && "0.".equals(column) && "Directory".equals(type);
		
		boolean mydir = false;
		if ("D".equals(line)) {
			mydir = ("" + authDir + ".").equals(column);
			if (!mydir) {
				for(int i : dirs){
					if (("" + i + ".").equals(column))
						mydir = true;
				}
			}
		}
		boolean isMyDir = mydir && "Directory".equals(type);
		boolean isMyCal = mydir && "Calendrier".equals(type);
		boolean isMyStats = mydir && "StatsMail".equals(type);
		
		if (authType == IAuthChecker.ADMINLOC) {
			if (isMyDir || isMasterDir || isMyStats) return 1;
			if ("TraceMail".equals(type)) return 1;
			if ("0.".equals(column) && ("GAP".equals(type) || "GAC".equals(type))) return 1;
			return 0;
		}

		if (isMyDir || isMyCal || isMasterDir || isMyStats) return 1;
		
		int x = hasGrp(2, line); // GAP  cité dans mon dir
		int y = hasGrp(1, line); // GAC  cité dans mon dir

		if (authType == 1) {
			if (authPower <= 2) {
				if (line.equals("C." + authGrp + ".")) return 9;
				if (line.startsWith("C.")) 
					return hasGrp(1, line);
				if (line.startsWith("P.")) {
					if (x == 0) 
						return 0;
					if (column.endsWith("." + authGrp + ".")) 
						return 9;
					if (type.equals("Tweets")) 
						return 2;
					return column.equals("0.") ? 1 : 0;
				}
			} else {
				if (line.equals("C." + authGrp + ".")) 
					return 2;
				if (line.startsWith("C.")) 
					return hasGrp(1, line);
				if (line.startsWith("P.")) {
					if (x == 0) return 0;
					if (column.endsWith("." + authGrp + ".")) return 2;
					if (type.equals("Tweets")) return 1;
					return column.equals("0.") ? 1 : 0;
				}
			}
			if (line.startsWith("P.") && column.equals("0.")) 
				return x;
			if (line.startsWith("C.") && column.equals("0.")) 
				return y;

			return x;
		}

		if (authType == 2) {
			if (line.equals("P." + authGrp + ".")) return 9;
			if (line.startsWith("P.") && column.equals("0.")) 
				return x;
			if (line.startsWith("C.") && column.equals("0.")) 
				return y;
			return 0;
		}

		return 0;
	}

	private int hasGrp(int type, String line) {
		int[] x = AS.split(line);
		int grp = x.length < 2 ? 0 : x[1];
		for(int d : dirs) {
			try {
				Entry e = Directory.get(d).entry(type, grp);
				if (e != null) 
					return 1;
			} catch (Exception e) {}
		}
		return 0;
	}

	public String toSHA1(String pwd, int authType, int authGrp){
		return toSHA1(pwd + authType + authGrp);
	}
	
	public static String toSHA1(String convertme) {
		try {
			MessageDigest md = MessageDigest.getInstance("SHA");
			return toHexString(md.digest(convertme.getBytes("UTF-8")));
		} catch (Exception ex) {
			return "";
		}
	}

	public static String toHexString(byte[] buf) {
		char[] hexChar = { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
				'a', 'b', 'c', 'd', 'e', 'f' };
		StringBuffer strBuf = new StringBuffer(buf.length * 2);
		for (int i = 0; i < buf.length; i++) {
			strBuf.append(hexChar[(buf[i] & 0xf0) >>> 4]);
			strBuf.append(hexChar[buf[i] & 0x0f]);
		}
		return strBuf.toString();
	}

}
