package fr.hypertable;

import static com.google.appengine.api.taskqueue.TaskOptions.Builder.withUrl;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
//import java.io.IOException;
//import java.io.ObjectStreamException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.LinkedList;
import java.util.Locale;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import com.google.appengine.api.datastore.Blob;
import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.EntityNotFoundException;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Transaction;
import com.google.appengine.api.datastore.TransactionOptions;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
//import com.google.appengine.api.memcache.MemcacheService;
//import com.google.appengine.api.memcache.MemcacheServiceFactory;
import com.google.appengine.api.taskqueue.Queue;
import com.google.appengine.api.taskqueue.QueueFactory;
import com.google.appengine.api.taskqueue.TaskOptions.Method;

import fr.hypertable.AppTransactionAdmin.Dumper;

public class AppDS implements IProvider {
	public static final Logger log = HTServlet.appCfg.log();

	private static final SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmmssSSS", Locale.FRANCE);

	private static IAppConfig appCfg = null;;
	
	public static void startup(IAppConfig appCfg) throws AppException {
		if (AppDS.appCfg != null) return;
		sdf.setTimeZone(appCfg.timezone());
		AppDS.appCfg = appCfg;
	}
	
	@Override public String tmOperation(String op, String taskid, String url, String periode) 
			throws AppException { 
		return "Pas d'implémentation pour le provider DataStore";
	}

	@Override public boolean isToStop(String taskid) { return false; }
	
//	private boolean hasCache = false;
	@Override public void init(boolean hasCache){
//		this.hasCache = hasCache;
	}

	@Override public void close() {}

	@Override public void setOperation(String operation){
		
	}
	
//	public static class MemCache extends CachedCell {		
//		/**
//		 * 
//		 */
//		private static final long serialVersionUID = 655560324095210883L;
//
//		private void writeObject(java.io.ObjectOutputStream out) throws IOException {
//			out.writeLong(version);
//			int len = bytes == null ? 0 : bytes.length;
//			out.writeInt(len);
//			out.write(bytes, 0, len);
//			out.flush();
//			out.close();
//		}
//
//		private void readObject(java.io.ObjectInputStream in) throws IOException, ClassNotFoundException {
//			version = in.readLong();
//			int l = in.readInt();
//			bytes = new byte[l];
//			int pos = 0;
//			int len = l;
//			while (len != 0) {
//				int lx = in.read(bytes, pos, len);
//				pos = pos + lx;
//				len = len - lx;
//			}
//			in.close();
//		}
//
//		@SuppressWarnings("unused") private void readObjectNoData() throws ObjectStreamException {}
//
//	}
//
//	private MemcacheService cache;
//
//	@Override public MemCache getFromMemCache(String key) {
//		if (!hasCache) return null;
//		try {
//		if (cache == null) cache = MemcacheServiceFactory.getMemcacheService();
//			MemCache mc = (MemCache) cache.get(key);
//			return mc;
//		} catch (Exception e) {
//			log.log(Level.WARNING, "Ignoré GET Cell- Clé=" + key, e);
//			return null;
//		}
//	}
//
//	@Override public void putInMemCache(String cacheKey, long version, byte[] bytes) {
//		if (!hasCache) return;
//		MemCache mc = new MemCache();
//		mc.version = version;
//		mc.bytes = bytes;
//		try {
//			if (cache == null) cache = MemcacheServiceFactory.getMemcacheService();
//			cache.put(cacheKey, mc);
//		} catch (Exception e) {
//			log.log(Level.WARNING, "Ignoré PUT Cell- Clé=" + cacheKey + " Taille=" + mc.bytes.length, e);
//		}
//	}

	@Override public byte[] getDocument(String k){
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("DOC", k);
		try {
			Entity entity = datastore.get(key);
			// long version = (Long) entity.getProperty("version");
			Long gz = (Long) entity.getProperty("gzip");
			byte[] bytes = ((Blob) entity.getProperty("bytes")).getBytes();
			if (gz != null) {
				 GZIPInputStream gzis = new GZIPInputStream(new ByteArrayInputStream(bytes));
				 ByteArrayOutputStream bos = new ByteArrayOutputStream();
				 byte[] b = new byte[8192];
				 int l;
				 while((l = gzis.read(b)) >= 0)
					bos.write(b, 0, l);
				 gzis.close();
				 bytes = bos.toByteArray();
			}
			return bytes;
		} catch (Exception e) {
			return null;
		}
	}

	@Override public boolean getOnOff() {
		DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("ADMIN", "admin");
		try {
			Entity admin = ds.get(key);
			String x = (String) admin.getProperty("onoff");
			return x == null || x.equals("ON");
		} catch (EntityNotFoundException e) {
			return true;
		}
	}

	private DatastoreService datastore;
	private Transaction transaction = null;

	private DatastoreService ds() {
		if (datastore == null) datastore = DatastoreServiceFactory.getDatastoreService();
		return datastore;
	}

	@Override public void beginTransaction(boolean multi) {
		if (multi)
			transaction = ds().beginTransaction(TransactionOptions.Builder.withXG(true));
		else
			transaction = ds().beginTransaction();
	}
	
	@Override public void rollBack() {
		try {
			if (transaction != null) transaction.rollback();
		} catch (Exception ex2) {
			log.log(Level.SEVERE, "Rollback failed", ex2);
		}
		transaction = null;
	}
	
	@Override public void commit(boolean hasQueuedTask) {
		transaction.commit();
		transaction = null;
	}

	public int purgeDocument(long version) throws AppException {
		FilterPredicate propertyFilter = new FilterPredicate("version", FilterOperator.LESS_THAN_OR_EQUAL, version);
		Query q = new Query("DOC").setFilter(propertyFilter);
		PreparedQuery pq = this.ds().prepare(q);
		int n = 0;
		for (Entity result : pq.asIterable()) {
			ds().delete(result.getKey());
			n++;
		}
		return n;
	}
	
	@Override public void putDocument(long version, String k, byte[] bytes) throws AppException{
		try {
			boolean gz = bytes.length > 500000;
			if (gz) {
				ByteArrayOutputStream out = new ByteArrayOutputStream();
			    GZIPOutputStream gzip = new GZIPOutputStream(out);
			    gzip.write(bytes);
			    gzip.close();
			    bytes = out.toByteArray();
			}
			// log.log(Level.WARNING, "PUT -DOC : id:" + k + " size:" + bytes.length);
			beginTransaction(false);
			Key key = KeyFactory.createKey("DOC", k);
			Entity entity = new Entity(key);
			entity.setProperty("version", version);
			if (gz)
				entity.setProperty("gzip", 1);
			entity.setProperty("bytes", new Blob(bytes));
			ds().put(entity);
			commit(true);
		} catch (Exception e) {
			try {
				if (transaction != null) transaction.rollback();
			} catch (Exception ex2) {
				log.log(Level.SEVERE, "Rollback failed", ex2);
			}
			throw new AppException(MF.PUTDOC, e.getMessage(), k);
		}
	}
	
	private static Key getStorageKey(String line, String column, String cellType) {
		Key rootKey = KeyFactory.createKey("Versions", line);
		if ("Versions".equals(cellType)) return rootKey;
		return KeyFactory.createKey(rootKey, cellType, column);
	}
	
	@Override public void purgeCellFromStorage(String line, String column, String cellType) {
		Key key = getStorageKey(line, column, cellType);
		ds().delete(transaction, key);
	}

	@Override public String onOff(boolean on) throws AppException {
		try {
			beginTransaction(false);
			Key key = KeyFactory.createKey("ADMIN", "admin");
			Entity admin;
			try {
				admin = ds().get(key);
			} catch(EntityNotFoundException e){
				admin = new Entity("ADMIN", "admin");
			}
			String p = on ? "ON" : "OFF";
			admin.setProperty("onoff", p);
			ds().put(admin);
			commit(true);
			HTServlet.onoff = on;
			return "OK - Serveur " + (on ? "ON" : "OFF");
		} catch (Exception e) {
			try {
				if (transaction != null) rollBack();
			} catch (Exception ex2) {
				log.log(Level.SEVERE, "Rollback failed", ex2);
			}
			throw new AppException(MF.ADMINC, e.toString());
		}

	}
	
	@Override public void delLine(String line){
		Key rootKey = KeyFactory.createKey("Versions", line);
		Query q = new Query();
		q.setAncestor(rootKey);
		PreparedQuery pq = this.ds().prepare(q);
		for (Entity result : pq.asIterable())
			ds().delete(result.getKey());
	}

	@Override public void dumpLineS(Dumper d) throws AppException {
		Key rootKey = KeyFactory.createKey("Versions", d.line);
		Query q = new Query();
		q.setAncestor(rootKey);
		PreparedQuery pq = this.ds().prepare(q);
		boolean versionsFaites = false;
		for (Entity result : pq.asIterable()) {
			Key k = result.getKey();
			String cn = k.getName();
			String tn = k.getKind();
			if (!d.fc.ok(cn) || !d.ft.ok(tn)) 
				continue;
			if ("Versions".equals(tn)){
				if (versionsFaites) 
					continue;
				else
					versionsFaites = true;
			}
			long version = 0;
			if (result.hasProperty("version")) 
				version = (Long) result.getProperty("version");
			String v = sdf.format(new Date(version));
			if ("20120101000000000".compareTo(v) > 0) {
				v = "20120101000000000";
				version = d.dinf;
			}
			if (d.ver != null && d.ver.compareTo(v) > 0) 
				continue;
			if (d.minVersion.compareTo(v) > 0) 
				d.minVersion = v;
			byte[] bytes = null;
			if (result.hasProperty("bytes"))
				bytes = ((Blob) result.getProperty("bytes")).getBytes();
			String mime = null;
			if (result.hasProperty("mime")) 
				mime = (String) result.getProperty("mime");
			d.cell(tn, cn, version, mime, bytes);
		}
	}

	@Override public void listLinesS(String ver, LinkedList<String> lst, Filter f) {
		Query q = new Query("Versions");
		if (ver == null)
			q.setKeysOnly();
		PreparedQuery pq = ds().prepare(q);
		for (Entity result : pq.asIterable()) {
			Key k = result.getKey();
			if (k.getParent() != null)
				continue;
			String ln = k.getName();
			if (!f.ok(ln)) continue;
			if (ver == null)
				lst.add(ln);
			else {
				long version = 0;
				if (result.hasProperty("version")) {
					version = (Long) result.getProperty("version");
					String v = sdf.format(new Date(version));
					if (ver == null || ver.compareTo(v) < 0) {
						lst.add(ln);
					}
				}
			}
		}
	}

	@Override public void listDocs(long minVersion, LinkedList<String> lst, Filter f){
		Query q = new Query("DOC");
		PreparedQuery pq = ds().prepare(q);
		for (Entity result : pq.asIterable()) {
			Key k = result.getKey();
			if (k.getParent() != null)
				continue;
			String ln = k.getName();
			if (!f.ok(ln.replace('_', '.'))) continue;
			long version = 0;
			if (result.hasProperty("version")) {
				version = (Long) result.getProperty("version");
				if (version >= minVersion) {
					lst.add(ln);
				}
			}
		}		
	}

	@Override public Archive getStorageArchive(String line, String column, String cellType, boolean nullIfNot)
			throws AppException {
		Key key = getStorageKey(line, column, cellType);
		Entity entity = null;
		long version = 0;
		String mime;
		byte[] bytes;
		try {
			entity = ds().get(key);
			if (entity.hasProperty("version")) 
				version = (Long) entity.getProperty("version");
			mime = (String) entity.getProperty("mime");
			if (mime == null) // Existe mais est une CEll, pas une Archive
				throw new EntityNotFoundException(key);
			bytes = ((Blob) entity.getProperty("bytes")).getBytes();
			return new Archive(line, column, cellType, mime, bytes, version);
		} catch (EntityNotFoundException ex) {
			if (nullIfNot)
				return null;
			if (!"PHOTO".equals(cellType)) {
				mime = "text/plain";
				String m = "Aucune archive nommée " + line + "/" + cellType + ":" + column;
				bytes = m.getBytes(AppTransaction.utf8);
				return new Archive(line, column, cellType, mime, bytes, version);
			}
		}
		mime = "image/jpeg";
		bytes = HTServlet.defaultImage();
		return new Archive(line, column, cellType, mime, bytes, version);
	}

	@Override public void putArchiveInStorage(Archive a, long version, boolean creation) throws AppException {
		Key key = getStorageKey(a.getLine(), a.getColumn(), a.getCellType());
		Entity entity = null;
		if (creation)
			entity = new Entity(key);
		else {
			try {
				entity = ds().get(key);
			} catch (EntityNotFoundException ex) {
				entity = new Entity(key);
			}
		}
		entity.setProperty("bytes", new Blob(a.getBytes()));
		entity.setProperty("mime", a.getMime());
		entity.setProperty("version", version);
		ds().put(entity);
	}

	@Override public Versions getVersionsFromStorage(String line) throws AppException {
		Key key = KeyFactory.createKey("Versions", line);
		Entity entity = null;
		try {
			entity = ds().get(key);
			long version = (Long) entity.getProperty("version");
			byte[] bytes = ((Blob) entity.getProperty("bytes")).getBytes();
			return (Versions) new Versions().init(line, "", version, bytes);
		} catch (EntityNotFoundException ex) {
			return null;
		}
	}

	@Override public CachedCell getCellFromStorage(String line, String column, String cellType)
			throws AppException {
		Key key = getStorageKey(line, column, cellType);
		try {
			Entity entity = ds().get(key);
			CachedCell cc = new CachedCell();
			cc.version = (Long) entity.getProperty("version");
			cc.bytes = ((Blob) entity.getProperty("bytes")).getBytes();
			return cc;
		} catch (EntityNotFoundException ex) {
			return null;
		}
	}

	@Override public void putInStorage(String line, String column, String cellType, 
			long version, byte[] bytes, boolean creation) throws AppException {
		Key key = getStorageKey(line, column, cellType);
		Entity entity;
		try {
			entity = ds().get(key);
		} catch (EntityNotFoundException ex) {
			entity = new Entity(key);
		}
		entity.setProperty("version", version);
		entity.setProperty("bytes", new Blob(bytes));
		ds().put(entity);
	}

	@Override public String enQueue(String url, byte[] body){
		AppTransaction.tr().queingTask();
        Queue queue = QueueFactory.getDefaultQueue();
        queue.add(withUrl("/task/" + url).payload(body).method(Method.POST));
        return "";
	}

	@Override public String enQueueCron(String url, String nextStart) { return ""; }
	
	@Override public boolean removeTaskFromDB(String taskid) throws AppException { 
		return true;
	}

}
