package fr.hypertable;

import org.json.simple.AcJSON;
import org.json.simple.AcJSONArray;
import org.json.simple.AcJSONObject;

import fr.alterconsos.AppConfig;

public class SyncEntites {

	/*
	 * arg = { cmd:1, sync: [{l:"1001", c:"0", t:"GAC", filterArg:"X",
	 * filterKeys:["**C027", "=+R"], version:0}, { ...} ] }
	 * 
	 * retour dans resultat { ... sync:[{ ...idem ... , data:{} pas de data si
	 * l'entite n'existe pas et version = -1
	 */

	private static String[] allNodes = { "**" };

	@SuppressWarnings("unchecked") public void sync() throws AppException {
		AppTransaction tr = AppTransaction.tr();
		AppTransaction.Resultat resultat = tr.getResultat();

		AcJSONArray sync = tr.getArg().getA("sync");
		StringBuffer sb = new StringBuffer();
		sb.append("[");
		boolean first = true;
		for (int k = 0; k < sync.size(); k++) {
			AcJSONObject ent = sync.getO(k);
			line = ent.getS("l");
			column = ent.getS("c");
			cellType = ent.getS("t");
			selId = ent.getS("s");

			filterArg = ent.getS("filterArg");

			AcJSONArray a = ent.getA("filterKeys");
			if (a == null)
				filterKeys = allNodes;
			else try {
				filterKeys = (String[]) a.toArray(new String[a.size()]);
			} catch (Exception e) {
				filterKeys = allNodes;
			}
			boolean allincr = true;
			for (String s : filterKeys) {
				if (s.length() >= 2 && s.charAt(1) == '*') allincr = false;
			}

			filterVersion = ent.getL("version");

			int lvl = tr.authChecker.accessLevel(line, column, cellType);
			if (lvl == 0) continue;

			boolean isAdmin = tr.authChecker.getAuthType() == IAuthChecker.ADMINGEN;

			filterArg = "" + lvl + filterArg;;
			long fvx = allincr && filterVersion != -9 ? filterVersion : 0;
			Cell cell = Cell.get(line, column, cellType, fvx);

			if (cell != null) {
				if (filterVersion == -9 && cell.version() != -1) {
					filterVersion = cell.version();
					if (cell.changedByCurrentTr(tr))
						filterVersion--;
				}
				if (cell.version() == -1 && filterVersion >= 0) {
					filterVersion = -1;
					if (first)
						first = false;
					else sb.append(", ");
					json(sb, null);
				} else {
					long vx = cell.version() != -1 ? cell.version() : 0;
					if (filterVersion < vx) {
						if (first)
							first = false;
						else sb.append(", ");
						String s = cell.toJSON(new StringBuffer(), filterKeys, filterVersion,
								filterArg, isAdmin).toString();
						filterVersion = vx; // prochain filtre
						json(sb, s);
					}
					if (maxVersion < filterVersion) maxVersion = filterVersion;
				}
			}
		}
		sb.append("]");
		String s = sb.toString();
		resultat.setObj("sync", s);
		if (AppConfig.VERBOSE) {
			AppConfig.log.fine("Sync :" + s);
		}
		resultat.setVersion(maxVersion);
	}

	private long maxVersion = -1;

	String line;
	String cellType;
	String column;
	long filterVersion;
	String filterArg;
	String[] filterKeys;
	String selId;

	private void json(StringBuffer sb, String data) {
		sb.append("{\"l\":\"").append(line).append("\"");
		sb.append(",\"c\":\"").append(column).append("\"");
		sb.append(",\"t\":\"").append(cellType).append("\"");
		if (selId != null) sb.append(",\"s\":\"").append(selId).append("\"");
		sb.append(",\"filterArg\":\"");
		AcJSON.escape(filterArg, sb);
		sb.append("\"");
		sb.append(",\"filterKeys\":[");
		boolean first = true;
		for (String s : filterKeys) {
			if (first) {
				sb.append("\"");
				first = false;
			} else sb.append(",\"");
			AcJSON.escape(s, sb);
			sb.append("\"");
		}
		sb.append("]");
		sb.append(",\"version\":").append(filterVersion);
		if (data != null) sb.append(",\"data\":").append(data);
		sb.append("}");
	}
}
