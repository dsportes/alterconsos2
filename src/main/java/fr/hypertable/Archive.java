package fr.hypertable;

import com.Ostermiller.util.Base64;

import fr.hypertable.AppTransaction.StatusPhase;

public class Archive {

	private String mime;
	private byte[] bytes;
	private String line;
	private String cellType;
	private String column;
	private long version;

	public String getB64() {
		String b64 = Base64.encodeToString(bytes);
		String prefix2 = "data:" + mime + ";base64,";
		return prefix2 + b64;
	}

	public byte[] getBytes() {
		return bytes;
	}

	public long getVersion() {
		return version;
	}

	public String getMime() {
		return mime;
	}

	public void setMime(String mime) {
		this.mime = mime;
	}

	public void setBytes(byte[] bytes) {
		this.bytes = bytes;
	}

	public String getLine() {
		return line;
	}

	public String getCellType() {
		return cellType;
	}

	public String getColumn() {
		return column;
	}

	public Archive(String line, String column, String cellType,
			String mime, byte[] bytes, long version) throws AppException {
		this.line = line;
		this.cellType = cellType;
		this.column = column;
		this.mime = mime;
		this.bytes = bytes;
		this.version = version;
	}

	public void putArchiveInStorage() throws AppException {
		long version = Versions.get(this.line).setVersion(cellType, column);
		AppTransaction.tr().provider().putArchiveInStorage(this, version, false);
	}

	public static class GetArchive extends Operation {

		String line;
		String column;
		String cellType;
		String opt;

		@Override public String mainLine() {
			return line;
		}

		@Override public StatusPhase phaseFaible() throws AppException {
			String opt = arg().getS("opt");
			cellType = arg().getS("t");
			column = arg().getS("c");
			line = arg().getS("l");
			if (line == null || line.length() == 0) line = "0";

			if (authChecker.accessLevel(line, column, cellType) == 0) {
				resultat.mime = "text/plain";
				resultat.bytes = "Autorisation insuffisante".getBytes(AppTransaction.utf8);
				return StatusPhase.brut;
			}

			Archive arch = AppTransaction.tr().provider().getStorageArchive(line, column, cellType, false);

			if (!arch.getMime().equals("text/plain") && "b64".equals(opt)) {
				resultat.content = arch.getB64();
			} else {
				resultat.bytes = arch.getBytes();
			}
			resultat.mime = arch.getMime();
			resultat.version = arch.getVersion();
			return StatusPhase.brut;
		}

		@Override public void phaseForte() throws AppException {}
	}
}
