package fr.hypertable;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedList;
import java.util.Locale;
import java.util.TimeZone;
import java.util.logging.Level;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import org.json.simple.AcJSON;
import org.json.simple.AcJSONObject;
import org.json.simple.parser.ParseException;

public class AppTransactionAdmin extends AppTransaction {
	private static final SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmmssSSS", Locale.FRANCE);

	static {
		sdf.setTimeZone(HTServlet.appCfg.timezone());		
	}
	
	AppTransactionAdmin(String body, byte[] file) throws AppException {
		super(body, false);
		if (status != 0) return;
		if (authChecker.getAuthType() != IAuthChecker.ADMINGEN) {
			throwableInfo = "Requête réservée à l'administrateur général";
			log.log(Level.INFO, "$" + status + "-" + throwableInfo);
			status = 1;
			release();
			return;
		}

		String op = getArg().getS("op");
		String ver = getArg().getS("v", null);
		String type = getArg().getS("t", null);
		String line = getArg().getS("l", null);
		String col = getArg().getS("c", null);
		long nj = getArg().getL("nj", 0);
		
		if (op.startsWith("tm")) {
			try {
				String report = provider().tmOperation(op, type, line, col);
				getResultat().content = report;
				getResultat().brut = true;
				getResultat().mime = "text/plain";
				status = 0;
			} catch (Throwable t){
				logException(t);
			}
			release();
			return;
		}
		
		if (type != null && type.length() == 0) type = null;
		StringBuffer sb = new StringBuffer();
		sb.append("/* ");
		sb.append(HTServlet.appCfg.sdf1().format(new Date())).append(" */\n");

		if ("on".equals(op) || "off".equals(op)) {
			String report = "";
			boolean onoff = true;
			if ("on".equals(op))
				report = provider().onOff(true);
			else {
				onoff = false;
				report = provider().onOff(false);
			}
			getResultat().content = report;
			getResultat().brut = true;
			getResultat().mime = "application/json";
			status = 0;
			release();
			HTServlet.onoff = onoff;
			return;
		}

		if ("purgedocs".equals(op)) {
			String report = "";
			if (nj <= 0) {
				report = "aucun document supprimé";
			} else {
				long version = System.currentTimeMillis() - (86400000 * nj);
				int n = provider().purgeDocument(version);
				report = n + " document(s) supprimé(s)"; 
			}
			getResultat().content = report;
			getResultat().brut = true;
			getResultat().mime = "application/json";
			status = 0;
			release();
			return;
		}

		
		if ("linesS".equals(op)) {
			Filter f = new Filter(line);
			LinkedList<String> lst = new LinkedList<String>();
			provider().listLinesS(ver, lst, f);
			String[] as = lst.toArray(new String[lst.size()]);
			Arrays.sort(as);
			StringBuffer sb2 = new StringBuffer();
			boolean first = true;
			sb2.append("[");
			for (String s : as) {
				if (!first)
					sb2.append(",");
				else first = false;
				sb2.append("\"" + s + "\"");
			}
			sb2.append("]");
			getResultat().content = sb2.toString();
			getResultat().brut = true;
			getResultat().mime = "application/json";
			status = 0;
			release();
			return;
		}

		if ("docsS".equals(op)) {
			Filter f = new Filter(line);
			LinkedList<String> lst = new LinkedList<String>();
			provider().listDocs(normVer(ver), lst, f);
			String[] as = lst.toArray(new String[lst.size()]);
			Arrays.sort(as);
			StringBuffer sb2 = new StringBuffer();
			boolean first = true;
			sb2.append("[");
			for (String s : as) {
				if (!first)
					sb2.append(",");
				else first = false;
				sb2.append("\"" + s + "\"");
			}
			sb2.append("]");
			getResultat().content = sb2.toString();
			getResultat().brut = true;
			getResultat().mime = "application/json";
			status = 0;
			release();
			return;
		}

		if ("dumpD".equals(op)) {
			boolean gz = line.endsWith(".gz");
			if (gz)
				line = line.substring(0, line.length() - 3);
			byte[] b = provider().getDocument(line);
			if (gz) {
				try {
					ByteArrayOutputStream out = new ByteArrayOutputStream();
				    GZIPOutputStream gzip = new GZIPOutputStream(out);
				    gzip.write(b);
				    gzip.close();
				    byte[] b2 = out.toByteArray();
				    getResultat().bytes = b2;
				} catch (Exception e){
					throw new AppException(MF.EXC, e);
				}
			} else
				getResultat().bytes = b;
			getResultat().brut = true;
			getResultat().mime = "application/octet-stream";
			status = 0;
			release();
			return;
		}

		if ("dumpS".equals(op)) {
			getResultat().bytes = dumpLineS(line, ver, col, type);
			getResultat().brut = true;
			getResultat().mime = "application/octet-stream";
			status = 0;
			release();
			return;
		}

		if ("dumpC".equals(op)) {
			getResultat().bytes = dumpCells(line, col);
			getResultat().brut = true;
			getResultat().mime = "application/octet-stream";
			status = 0;
			release();
			return;
		}

		if ("dumpV".equals(op)) {
			try {
				String[] filterKeys = { "**" };
				ByteArrayOutputStream bos = new ByteArrayOutputStream();
				GZIPOutputStream zos = new GZIPOutputStream(bos);
				Versions versions = provider().getVersionsFromStorage(line);
				StringBuffer sbx = new StringBuffer();
				versions.toJSON(sbx, filterKeys, 0, null, true);
				byte[] bytes = sbx.toString().getBytes("UTF-8");
				zos.write(bytes);
				zos.close();
				getResultat().bytes = bos.toByteArray();
				getResultat().brut = true;
				getResultat().mime = "application/octet-stream";
				status = 0;
				release();
				return;
			} catch (Exception e) {
				throw new AppException(MF.DUMP, line, e.toString());
			}
		}

		if ("load".equals(op)) {
			getResultat().content = loadLine(line, file, col == null);
			/* convention si col non null c'est une extension de la ligne
			 * si col est null c'est sa recreation (premiere extension)
			 */
			getResultat().brut = true;
			getResultat().mime = "application/json";
			status = 0;
			release();
			return;
		}

		if ("loadD".equals(op)) {
			// col : url du serveur origine
			// type : url du serveur destination (ce serveur)
			getResultat().content = loadDoc(line, file, col, type);
			getResultat().brut = true;
			getResultat().mime = "application/json";
			status = 0;
			release();
			return;
		}

		status = 1;
	}

	private String loadDoc(String line, byte[] file, String u1, String u2) throws AppException {
		try {
			boolean gz = line.endsWith(".gz");
			if (gz) {
				line = line.substring(0, line.length() - 3);
				try {
					 GZIPInputStream gzis = new GZIPInputStream(new ByteArrayInputStream(file));
					 ByteArrayOutputStream bos = new ByteArrayOutputStream();
					 byte[] b = new byte[8192];
					 int l;
					 while((l = gzis.read(b)) >= 0)
						bos.write(b, 0, l);
					 gzis.close();
					 file = bos.toByteArray();
				} catch (Exception e){
					throw new AppException(MF.EXC, e);
				}
			}
			long dinf = sdf.parse("20120101000000000").getTime();
			int lg = 0;
			if (line == null || line.length() < 25)
				throw new Exception("clé mal formée : [" + line + "]");
			else {
				int i = line.lastIndexOf('.');
				if (i < 17)
					throw new Exception("clé mal formée : [" + line + "]");
				else {
					String v = line.substring(i - 17, i);
					long vl = HTServlet.appCfg.sdfjhsm().parse(v).getTime();
					if (vl > dinf && vl < System.currentTimeMillis()) {
						byte[] r = replaceUrl(file, u1, u2);
						provider().putDocument(vl, line, r);
						lg = file.length;
					} else
						throw new Exception("version incorrecte : [" + line + "]");
				}
			}
			StringBuffer sb = new StringBuffer();
			sb.append("{\"status\":\"OK\", \"bytes\":").append(lg).append("}");
			return sb.toString();
		} catch (Exception e) {
			throw new AppException(MF.LOAD, line, e.toString());
		}
	}
	
	private byte[] replaceUrl(byte[] file, String u1, String u2){
		if (u1 == null || u1.length() == 0 || u2 == null || u2.length() == 0)
			return file;
		try {
			String s = new String(file, "UTF-8");
			String s2 = s.replaceAll(u1, u2);
			return s2.getBytes("UTF-8");
		} catch (UnsupportedEncodingException e) {
			return file;
		}
	}
	
	private String loadLine(String line, byte[] file, boolean first) throws AppException {
		try {
			int totLg = 0;
			int totNb = 0;
			int totMi = 0;
			int totCe = 0;
			//LinkedList<Versions.Ver> verList = new LinkedList<Versions.Ver>();
			provider().beginTransaction(false);
			
			if (first)
				provider().delLine(line);

			Versions versions = provider().getVersionsFromStorage(line);
			if (versions == null) 
				versions = (Versions) new Versions().init(line, "", -1, null);

			TimeZone tz = HTServlet.appCfg.timezone();
			SimpleDateFormat sdf1 = HTServlet.appCfg.sdf1();
			ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(file));
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			byte[] buf = new byte[4096];
			ZipEntry ze;
			while ((ze = zis.getNextEntry()) != null) {
				long version = ze.getTime();
				version = version - tz.getOffset(version);
				String versionDH = sdf1.format(new Date(version));
				String name = ze.getName();
				if (name.startsWith("Versions") || name.startsWith("_Versions"))
					continue;
				bos.reset();
				int l = 0;
				while ((l = zis.read(buf, 0, 4096)) > 0)
					bos.write(buf, 0, l);
				byte[] content = bos.toByteArray();
				int i = name.lastIndexOf(".");
				if (i <= 0)
					throw new Exception("Extension inconnue pour l'entrée " + name + ", ligne ["
							+ line + "]");
				String ext = name.substring(i + 1).toLowerCase();
				String col = name.substring(0, i);
				i = name.lastIndexOf("_");
				if (i <= 0)
					throw new Exception("Type inconnu pour l'entrée " + name + ", ligne [" + line
							+ "]");
				String type = col.substring(i + 1);
				if ("Versions".equals(type))
					continue;
				col = col.substring(0, i);
				if (type.equals("HTML"))
					continue;
				if (ext.equals("json")) {
					String text = new String(content, "UTF-8");
					try {
						CellDescr cd = CellDescr.getCellDescr(type);
						if (cd == null) continue;
						AcJSONObject json = AcJSON.parseObjectEx(text);
						Serial serial = new Serial();
						cd.serial(json, serial);
						int lg = serial.bytes.length;
						if (lg != 0) {	
							provider().putInStorage(line, col, type, serial.version, serial.bytes, true);
							versions.setRawVersion(type, col, serial.version);
//							verList.add(new Versions.Ver(type, col, serial.version));
							log.fine("LOAD l=" + line + " c=" + col + " t=" + type + " dh="
									+ versionDH + " json=" + json.size() + " lg=" + lg + " count1="
									+ serial.count1 + " count2=" + serial.count2);
							totLg = totLg + lg;
							totCe++;
							totNb = totNb + serial.count2;
						}
					} catch (ParseException e) {
						throw new Exception("JSON mal formé pour l'entrée " + name + ", ligne ["
								+ line + "], colonne [" + col + "]. " + e.getMessage());
					}
				} else {
					if (content.length != 0) {
						String mime = HTServlet.mimeOfExt(ext);
						if (mime == null)
							throw new Exception("MIME type inconnu pour l'entrée " + name
									+ ", ligne [" + line + "], colonne [" + col + "]. Extension : "
									+ ext);
						
						Archive a = new Archive(line, col, type, mime, content, version);
						provider().putArchiveInStorage(a, version, true);
												
						versions.setRawVersion(type, col, version);
//						verList.add(new Versions.Ver(type, col, version));
						log.fine("LOAD l=" + line + " c=" + col + " m=" + mime + " dh=" + versionDH
								+ " size=" + content.length);
						totLg = totLg + content.length;
						totMi++;
					}
				}
			}

//			// generation de Versions
//			if (verList.size() != 0) {
//				Serial serial = new Serial();
//				Versions.serial(verList, serial);
//				provider().putInStorage(line, "", "Versions", serial.version, serial.bytes, true);
//			}
			
			versions.serialize();
			provider().putInStorage(line, "", "Versions", 
					versions.version(), versions.bytes(), versions.creation());
			
			provider().commit(false);
			StringBuffer sb = new StringBuffer();
			sb.append("{\"status\":\"OK\", \"bytes\":").append(totLg);
			sb.append(", \"cells\":").append(totCe);
			sb.append(", \"nodes\":").append(totNb);
			sb.append(", \"mimes\":").append(totMi).append("}");

			return sb.toString();
		} catch (Exception e) {
			try {
				provider().rollBack();
			} catch (Exception ex2) {
				log.log(Level.SEVERE, "Rollback failed", ex2);
			}
			throw new AppException(MF.LOAD, line, e.toString());
		}
	}

	private byte[] dumpCells(String line, String cols) throws AppException {
		try {
			ArrayList<String> absents = new ArrayList<String>();
			Filter f = new Filter(cols);
			String[] filterKeys = { "**" };
			TimeZone tz = HTServlet.appCfg.timezone();
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			ZipOutputStream zos = new ZipOutputStream(bos);
			
			for(String x : f){
				int i = x.indexOf('/');
				String col = x.substring(0, i);
				String type = x.substring(i + 1);
				if ("HTML".equals(type)) continue;
				String ext = "json";
				byte[] bytes = null;
				long version = 0;
				if ("PHOTO".equals(type)) {
					Archive a = provider().getStorageArchive(line, col,  type, true);
					if (a == null) {
						absents.add(Versions.keyOf(type, col));
						continue;
					}
					ext = HTServlet.extOfMime(a.getMime());
					if (ext == null)
						continue;
					version = a.getVersion();
					bytes = a.getBytes();
				} else {
					try {
						CachedCell cc = provider().getCellFromStorage(line, col,type);
						if (cc != null) { // si null, cell purgée mais encore présente dans Versions
							Cell c = Cell.buildCell(type, line, col, cc.version, cc.bytes);
							StringBuffer sbx = new StringBuffer();
							c.toJSON(sbx, filterKeys, -0, null, true);
							bytes = sbx.toString().getBytes("UTF-8");
						} else {
							absents.add(Versions.keyOf(type, col));
							continue;
						}		
					} catch(Exception ex) {
						log.log(Level.SEVERE, "Dump Cell impossible : " + 
							type + " - " + line + " - " + col, ex);
					}
				}
				if (bytes != null) {
					ZipEntry entry = new ZipEntry(col + "_" + type + "." + ext);
					entry.setTime(version + tz.getOffset(version));
					entry.setSize(bytes.length);
					try {
						zos.putNextEntry(entry);
						zos.write(bytes, 0, bytes.length);
						zos.closeEntry();			
					} catch (IOException e) {
						throw new AppException(e, MF.DUMPZIP, line);
					}
				}
			}
			zos.close();
			if (absents.size() != 0)
				cleanUpVersions(line, absents);
			return bos.toByteArray();
		} catch (Exception e) {
			throw new AppException(MF.DUMP, line, e.toString());
		}
	}

	private void cleanUpVersions(String line, ArrayList<String> absents) throws AppException{
		provider().beginTransaction(false);
		Versions versions = provider().getVersionsFromStorage(line);
		versions.delRawVersions(absents);
		versions.serialize();
		provider().putInStorage(line, "", "Versions", 
				versions.version(), versions.bytes(), versions.creation());
		provider().commit(false);
	}
	
	private byte[] dumpLineS(String line, String ver, String cols, String types)
			throws AppException {
		try {
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			ZipOutputStream zos = new ZipOutputStream(bos);
			
			Dumper dumper = new Dumper(zos, line, ver, cols, types);
			provider().dumpLineS(dumper);
			
			zos.close();
			ByteArrayOutputStream bos2 = new ByteArrayOutputStream();
			bos2.write(dumper.minVersion.getBytes("UTF-8"));
			bos2.write(0);
			bos.writeTo(bos2);

			// Thread.sleep(3000);

			return bos2.toByteArray();
		} catch (Exception e) {
			throw new AppException(MF.DUMP, line, e.toString());
		}
	}

	private static long normVer(String ver){
		if (ver == null || ver.length() == 0)
			ver = "20120101000000000";
		String verx = ver.length() > 17 ? ver.substring(0, 17) : (ver + "20120101000000000"
				.substring(ver.length(), 17));
		if ("20120101000000000".compareTo(verx) > 0) verx = "20120101000000000";
		try {
			return sdf.parse(verx).getTime();
		} catch (Exception e) {
			return 0;
		}
	}
	
	public static class Dumper {
		public ZipOutputStream zos;
		public String line;
		TimeZone tz;
		long verl;
		String[] filterKeys = { "**" };
		String minVersion = "21000101000000000";
		long dinf;
		Filter fc;
		Filter ft;
		String ver;
		
		private Dumper(ZipOutputStream zos, String line, String ver, String cols, String types){
			this.tz = HTServlet.appCfg.timezone();
			this.zos = zos;
			this.line = line;
			this.ver = ver;
			fc = new Filter(cols);
			ft = new Filter(types);
			verl = normVer(ver);
			try {
				dinf = sdf.parse("20120101000000000").getTime();
			} catch (java.text.ParseException e) {	}
		}
		
		void cell(String tn, String cn, long version, String mime, byte[] bytes) throws AppException {
			if ("HTML".equals(tn)) return;
			String ext = "json";
			if ("PHOTO".equals(tn)) {
				ext = HTServlet.extOfMime(mime);
				if (ext == null)
					return;
			} else {
//				if (!"HTML".equals(tn)) {
					try {
						Cell c = Cell.buildCell(tn, line, cn, version, bytes);
						StringBuffer sb = new StringBuffer();
						c.toJSON(sb, filterKeys, verl, null, true);
						bytes = sb.toString().getBytes("UTF-8");
					} catch(Exception ex) {
						log.log(Level.SEVERE, "Dump Cell impossible : " + 
							tn + " - " + line + " - " + cn, ex);
					}
//				}
			}
			ZipEntry entry = new ZipEntry(cn + "_" + tn + "." + ext);
			entry.setTime(version + tz.getOffset(version));
			entry.setSize(bytes.length);
			try {
				zos.putNextEntry(entry);
				zos.write(bytes, 0, bytes.length);
				zos.closeEntry();			
			} catch (IOException e) {
				throw new AppException(e, MF.DUMPZIP, line);
			}
		}
	}
}
