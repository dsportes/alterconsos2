package fr.hypertable;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class Versions extends Cell {
	public static final CellDescr cellDescr = new CellDescr(Versions.class);

	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	final boolean isVersions() {
		return true;
	}

	public static Versions get(String line) throws AppException {
		AppTransaction tr = AppTransaction.tr();
		String cacheKey = "Versions:" + line;
		Versions versions = (Versions) tr.getFromTransactionCache(cacheKey);

		if (!tr.phaseForte()) {
			// Phase faible
			if (versions != null) return versions;

//			CachedCell mc = tr.provider().getFromMemCache(cacheKey);
//			if (mc != null) {
//				versions = (Versions) new Versions().init(line, "", mc.version, mc.bytes);
//				tr.putIntoTransactionCache(cacheKey, versions);
//				return versions;
//			}

			versions = tr.provider().getVersionsFromStorage(line);
			if (versions != null) {
				versions.putInCaches();
				tr.putIntoTransactionCache(cacheKey, versions);
				return versions;
			}

			versions = (Versions) new Versions().init(line, "", -1, null);
			tr.putIntoTransactionCache(cacheKey, versions);
			return versions;
		}

		// Phase forte
		if (versions != null) {
			if (!versions.isReadOnly()) return versions;
		}

		versions = tr.provider().getVersionsFromStorage(line);
		if (versions != null) { return versions.cloneAndCacheV(true); }

		versions = (Versions) new Versions().init(line, "", -1, null);
		return versions.cloneAndCacheV(false);
	}

	public String getCacheKey() {
		return "Versions:" + line();
	}

	protected Versions cloneAndCacheV(boolean clone) throws AppException {
		AppTransaction tr = AppTransaction.tr();
		Versions versions;
		if (clone)
			// besoin de cloner, elle est en read-only
			versions = (Versions) super.cloneAndCache();
		else 
			versions = (Versions) super.noCloneAndCache();
		tr.addRwLine(versions);
		return versions;
	}

	public static class Ver {
		public Ver(String t, String c, long v) {
			type = t;
			column = c;
			version = v;
		}

		public String type;
		public String column;
		public long version;
	}

	public static void serial(List<Ver> verList, Serial serial) throws IOException {
		serial.version = 0;
		serial.bytes = new byte[0];
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		DataOutputStream out = new DataOutputStream(bos);
		for (Ver ver : verList) {
			if (ver.version > serial.version) serial.version = ver.version;
			out.writeShort(12001);
			out.writeLong(ver.version);
			out.writeShort(5001);
			CellDescr.write(out, ver.type);
			out.writeShort(5002);
			CellDescr.write(out, ver.column);
			out.writeShort(0);
		}
		if (verList.size() != 0) out.writeShort(0);
		out.flush();
		serial.bytes = bos.toByteArray();
	}

	public static String keyOf(String type, String column){
		return "V" + type + ":" + column;
	}
	
	@HTCN(id = 1) public class Version extends CellNode {

		@HT(id = 1) public String type;

		@HT(id = 2) public String column;

		@Override public String[] keys() {
			String[] keys = { keyOf(type, column) };
			return keys;
		}

	}

	CellNode rawVersion(String column, String type) {
		Version v = new Version();
		v.column = column;
		v.type = type;
		return v;
	}

	public long getVersion(String type, String column) {
		Version v = (Version) tree().get("V" + type + ":" + column);
		return v == null ? -1 : v.version();
	}
	
	void setRawVersion(String type, String column, long version) {
		String key = "V" + type + ":" + column;
		Version v = (Version) tree().get(key);
		if (v == null) {
			v = new Version();
			v.type = type;
			v.column = column;
			tree().put(key, v);
		}
		v.version = version;
		if (this.version() < version)
			this.version = version;
	}

	public void delRawVersions(ArrayList<String> keys){
		for(String key : keys)
			tree().remove(key);
	}
	
	public long setVersion(String type, String column) {
		String key = "V" + type + ":" + column;
		Version v = (Version) tree().get(key);
		if (v != null) {
			v.w();
		} else {
			v = new Version();
			v.type = type;
			v.column = column;
			v.insert();
		}
		return v.version();
	}

}
