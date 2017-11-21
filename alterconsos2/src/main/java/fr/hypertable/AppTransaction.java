package fr.hypertable;

import java.nio.charset.Charset;
import java.util.Arrays;
import java.util.Hashtable;
import java.util.LinkedList;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.json.simple.AcJSON;
import org.json.simple.AcJSONObject;
import org.json.simple.parser.ParseException;

import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;

import fr.alterconsos.cell.Directory;

public class AppTransaction {
	public enum StatusPhase { brut, json, transactionSimple, transactionMultiLines }

	public static final Charset utf8 = Charset.forName("UTF-8");
	public static final Logger log = HTServlet.appCfg.log();

	public static final int MAXLOCCACHESIZE = 1000;
	
	private static final Hashtable<Thread, AppTransaction> registry = new Hashtable<Thread, AppTransaction>();
	private void register() { registry.put(Thread.currentThread(), this);}
	void release() { registry.remove(Thread.currentThread());}
	public static AppTransaction tr() { return registry.get(Thread.currentThread()); }

	private static class CacheItem implements Comparable<CacheItem> {
		public long time;
		public String key;
		CacheItem(long t, String k){
			time = t;
			key = k;
		}
		@Override public int compareTo(CacheItem o) {
			if (this.time < o.time)
				return -1;
			if (o.time < this.time)
				return 1;
			return 0;
		}
		
	}
	
	public static class CacheCleaner {

		public static CacheCleaner singleton = new CacheCleaner();

		public synchronized void clean() {
			CacheItem[] ci = new CacheItem[localeCacheStamps.size()];
			int i = 0;
			for(String k : localeCacheStamps.keySet()){
				ci[i++] = new CacheItem(localeCacheStamps.get(k), k);
			}
			Arrays.sort(ci);
			for(int j = 0; j < ci.length / 2; j++) {
				String k = ci[j].key;
				localeCacheStamps.remove(k);
				localeCache.remove(k);				
			}
		}
	}

	/**************************************************/
	private DatastoreService datastore;

	public DatastoreService ds() {
		if (datastore == null) datastore = DatastoreServiceFactory.getDatastoreService();
		return datastore;
	}

	private IProvider provider;
	public IProvider provider(){ return provider; }
	
	private Hashtable<String, Cell> transactionCache = new Hashtable<String, Cell>();

	private Directory myDirWeak = null;
	private Directory myDirStrong = null;

	public Directory myDir() throws AppException {
		if (phaseForte()) {
			if (myDirStrong == null)
				myDirStrong = (Directory) Cell.getWeak("D", "" + this.authChecker.getAuthDir()
						+ ".", "Directory");
			return myDirStrong;
		} else {
			if (myDirWeak == null)
				myDirWeak = (Directory) Cell.get("D", "" + this.authChecker.getAuthDir() + ".",
						"Directory");
			return myDirWeak;
		}
	}

	/*
	 * 0:OK 1:Signature 
	 * 2:Erreur fonctionnelle 
	 * 3,4,5 : BUG en phase 
	 * 3:Avant Commit 
	 * 4:Critique 
	 * 5:Après commit
	 */
	protected int status;

	public int getStatus() {
		return status;
	}

	private Resultat resultat = new Resultat();
	public Resultat getResultat() { return resultat; };

	public IAuthChecker authChecker;

	/*
	 * 0:AVANT commit; 1:INDECISE (pendant commit) 2:APRES commit
	 */
	private int phase;
	public boolean phaseForte() { return phase >= 0 && phase < 2; }

	private AcJSONObject arg;
	public AcJSONObject getArg() { return arg; }

	protected String throwableInfo;
	public String getThrowableInfo() {
		return throwableInfo != null && throwableInfo.length() != 0 ? throwableInfo
				: "Raison inconnue - Status : " + status;
	}
	
	void logException(Throwable t) {
		throwableInfo = t.getMessage();
		if (t instanceof AppException) {
			AppException ex = (AppException) t;
			if (ex.isBug()) {
				status = 3 + (phase == -1 ? 0 : phase);
				log.log(Level.SEVERE, "$" + status + "-" + throwableInfo);
			} else {
				status = 2;
				log.log(Level.FINE, "$" + status + "-" + throwableInfo);
			}
		} else {
			status = 3 + (phase == -1 ? 0 : phase);
			log.log(Level.SEVERE, "$" + status + "-" + throwableInfo, t);
		}
	}
	
	private boolean hasCache;
	
	private static Hashtable<String, Cell> localeCache = new Hashtable<String, Cell>();
	private static Hashtable<String, Long> localeCacheStamps = new Hashtable<String, Long>();

	public Cell getFromLocaleCache(String cacheKey) throws AppException {
		stopOrGo();
		if (!hasCache) return null;
		Cell c = localeCache.get(cacheKey);
		if (c != null)
			localeCacheStamps.put(cacheKey, System.currentTimeMillis());
		return c;
	};

	public void putInLocaleCache(String cacheKey, Cell cell) {
		if (!hasCache) return;
		if (localeCacheStamps.size() > MAXLOCCACHESIZE)
			CacheCleaner.singleton.clean();
		localeCacheStamps.put(cacheKey, System.currentTimeMillis());
		localeCache.put(cacheKey, cell);
	};
	
	public Cell getFromTransactionCache(String cacheKey) {
		if (!hasCache) return null;
		return transactionCache != null ? transactionCache.get(cacheKey) : null;
	};

	public void putIntoTransactionCache(String cacheKey, Cell col) {
		if (!hasCache) return;
		if (!col.isReadOnly()) {
			transactionCache.put(cacheKey, col);
			return;
		}
		Cell c = transactionCache.get(cacheKey);
		if (c == null || c.version() < col.version()) transactionCache.put(cacheKey, col);
	}

	private LinkedList<Cell> bkTrCache = new LinkedList<Cell>();

	private void backupTransactionCache() throws AppException {
		if (!hasCache) return;
		for (Cell c : transactionCache.values())
			bkTrCache.add(c);
	}

	private void restoreTransactionCache() throws AppException {
		if (!hasCache) return;
		transactionCache.clear();
		for (Cell c : bkTrCache)
			transactionCache.put(c.getCacheKey(), c);
	}

	private void getAllCells() {
		toutesCellules = transactionCache.values().toArray(new Cell[transactionCache.size()]);
	}

	private String opName;
	public String getOpName() { return opName; }

	private boolean hasQueuedTasks = false;
	void queingTask() { hasQueuedTasks = true; }
	
	private Operation operation;

	private byte[] uploadFile;
	public byte[] uploadFile(){	return uploadFile; }

	private int er = 0;
	
	/*
	 * status = 200 - OK résultat JSON par getResultat() 
	 * status = 400 - Erreur fonctionnelle identifiée (AppException) - Texte descriptif 
	 * status = 401 - Non autorisé - Pas d'explication 
	 * status = 500 - Erreur technique ou BUG inattendu - Texte descriptif (dont stacktrace)
	 */
	
	private long transactionId;
	long transactionId(){ return transactionId; }
	private String taskid = null;
	private boolean isCron;
	private String[] taskuri = null;
	
	private void stopOrGo() throws AppException {
		if (provider.isToStop(taskid))
			throw new AppException(MF.STOPPED);
	}

	IAppConfig appCfg;
	
	private AppTransaction(boolean hasCache){
		appCfg = HTServlet.appCfg;
		retries = appCfg.maxRetries();
		transactionId = DistributeurVersion.prochaine(0);
		this.hasCache = hasCache;
		provider = appCfg.newProvider();
		phase = -1;
		authChecker = appCfg.authChecker();
		register();
	}

	protected AppTransaction(String body, boolean hasCache) {
		this(hasCache);
		String bsrv = appCfg.build();
		try {
			arg = AcJSON.parseObjectEx(body);
			String build = arg.getS("build", null);
			if (build != null && !build.equals(bsrv)) {
				status = 9;
				throwableInfo = bsrv;
				return;
			}
		} catch (ParseException e) {
			throwableInfo = new AppException(MF.JSON, e.toString()).getMessage();
			status = 3;
			log.log(Level.SEVERE, "$" + status + "-" + throwableInfo);
			release();
			return;
		}
		try {
			if (!authChecker.verifierAuth()) {
				throwableInfo = authChecker.getAuthDiag();
				log.log(Level.INFO, throwableInfo);
				status = 1;
				return;
			}
			return;
		} catch (AppException ex) {
			status = 1;
			logException(ex);
			return;
		}
	}

	// Task / Cron (en admin systeme)
	AppTransaction(String[] uri, byte[] args, String taskid, boolean isCron) {
		this(true);
		// try { Thread.sleep(60000);} catch (InterruptedException e) {}
		this.taskid = taskid;
		this.isCron = isCron;
		this.taskuri = uri;
		try {
			authChecker.setInternalTask(uri.length > 1 ? uri[1] : "0");
			String taskClass = uri[0];
			appCfg.task(taskClass).start(args, uri);
		} catch (AppException ex) {
			status = 1;
			logException(ex);
		}
	}
	
	// Requêtes normales
	AppTransaction(String body, byte[] uploadFile) throws AppException {
		this(body, true);
		if (status != 0) return;
		this.uploadFile = uploadFile;
		
		try {
			long w = arg.getI("attente");
			if (w != 0) try {
				Thread.sleep(w);
			} catch (InterruptedException e) {}

			er = arg.getI("erreur");
			if (er % 10 == 1) throw new AppException(MF.TEST, er);

			opName = arg.getS("op", null);

			if (opName == null) { // GET d'une photo
				provider().setOperation("getPhoto");
				operation = new Archive.GetArchive();
				// operation.setTr(this);
				operation.phaseFaible();
				resultat.brut = true;
				status = 0;
				return;
			}
			
			provider().setOperation(opName);
			
			if ("1".equals(opName)) {
				if (er % 10 == 2) throw new AppException(MF.TEST, er);
				new SyncEntites().sync();
				status = 0;
				return;
			}

			operation = appCfg.operation(opName);
			statusFaible = operation.phaseFaible();
			if (statusFaible == StatusPhase.brut) {
				resultat.brut = true;
				status = 0;
				return;
			}
			boolean multi = statusFaible == StatusPhase.transactionMultiLines;

			// Impossible en phase de traitement fort d'aller chercher
			// par getWeak des cellules
			// sans les avoir mis en transactionCache avant
			// Sauvegarde de la cache pour restitution éventuelle en cas de
			// retry
			version = 0;
			backupTransactionCache();

			/*
			 * phase : 
			 * -1: Faible (hors transaction) 
			 * 0:AVANT commit; 
			 * 1:INDECISE (pendant commit) 
			 * 2:APRES commit
			 */

			/*
			 * Transaction forte Debut de transaction DataStore
			 */
			while (retries > 0) {
				if (retries < appCfg.maxRetries()) try {
					Thread.sleep(500);
				} catch (InterruptedException e) {}
				try {
					stopOrGo();
					begin(operation.mainLine(), multi);
					operation.phaseForte();
					stopOrGo();
					endPhase(true);
					// Une exception dans le commit ne garantit pas que la transaction
					// n'ait pas EFFECTIVEMENT été committée (Pb APRES commit réel)
					// Le test "dejaSigne" le dira au prochain tour
					break;
				} catch (AppException ex) {
					logException(ex);
					provider().rollBack();
					release();
					return;
				} catch (Throwable t) {
					// BUGS, problèmes techniques et blocages DB non distinguables
					logException(t);
					provider().rollBack();
					--retries;
					if (retries == 0) {
						status = 3 + (phase == -1 ? 0 : phase);
						log.log(Level.SEVERE, "$" + status + "-" + throwableInfo);
						release();
						return;
					} else {
						phase = -1;
						version = 0;
						restoreTransactionCache();
					}
				}
			}

			if (er % 10 == 5) throw new AppException(MF.TEST, er);
			resultat.setVersion(version);
			if (!resultat.brut)
				new SyncEntites().sync();
			status = 0;
		} catch (Throwable t) {
			logException(t);
		}
	}

	private void begin(String mainLine, boolean multi) throws AppException {
		phase = 0;
		throwableInfo = null;
		statusFaible = multi ? StatusPhase.transactionMultiLines : StatusPhase.transactionSimple;
		provider().beginTransaction(multi);
		Versions v = Versions.get(mainLine);
		rwLines = new Hashtable<String, Versions>();
		addRwLine(v);
		if (er % 10 == 3) throw new AppException(MF.TEST, er);
	}

	public void startPhaseFaible() {
		provider().rollBack();
		transactionCache.clear();
		phase = -1;
	}

	public void startPhaseForte(String mainline, boolean multi) throws AppException {
		begin(mainline, multi);
	}
	
	public void endPhase(boolean commit) throws AppException{
		stopOrGo();
		if (taskid != null) {
			provider().removeTaskFromDB(taskid);
			if (isCron){
				String uri = "";
				for(String s : taskuri) uri += s + "/";
				provider().enQueueCron(uri.substring(0, uri.length() - 1), null);
			}
		}
		if (commit && phaseForte())
			myCommit();
		else {
			provider().rollBack();
			phase = -1;
		}
		transactionCache.clear();
	}

	private void myCommit() throws AppException{
		// Ecritures dans DataStore
		getAllCells();
		for (Cell cell : toutesCellules)
			if (cell.hasChanged()) {
			// Ecriture en Storage
				cell.serialize();
				provider().putInStorage(cell.line(), cell.column(), cell.cellType(), 
						cell.version(), cell.bytes(), cell.creation());
			}
		phase = 1;
		provider().commit(hasQueuedTasks);
		if (er % 10 == 4) throw new AppException(MF.TEST, er);
		phase = 2;
		for (Cell cell : toutesCellules)
			if (cell.hasChanged())
			// Ecriture MemCache et LocalCache
				cell.putInCaches();
	}
	
	private StatusPhase statusFaible = null;

	private Hashtable<String, Versions> rwLines = new Hashtable<String, Versions>();

	private long version; // version déjà allouée à la transaction pour une line déjà ouverte

	long allocatedVersion(long min) {
		if (version == 0 || version <= min) 
			version = DistributeurVersion.prochaine(min);
		return version;
	}

	public long version(String line) {
		Versions vx = rwLines.get(line);
		return vx != null ? vx.version() : 0;
	}

	void addRwLine(Versions versions) throws AppException {
		String opName = operation != null ?  operation.getClass().getSimpleName() : "Unknown Operation";
		if (versions == null) return;
		if (statusFaible != StatusPhase.transactionMultiLines
				&& statusFaible != StatusPhase.transactionSimple)
			throw new AppException(MF.LINE1,opName);
		Versions vx = rwLines.get(versions.line());
		if (vx != null) return;
		if (rwLines.size() == 4) {
			String lines = "";
			for (Versions v : rwLines.values())
				lines = lines + " " + v.line();
			throw new AppException(MF.LINE1, opName, lines,	versions.line());
		}
		rwLines.put(versions.line(), versions);
	}

	private Cell[] toutesCellules;
	private int retries;
	
	public class Resultat extends Hashtable<String, String> {

		public String mime;
		public String content;
		public byte[] bytes;
		public boolean brut = false;
		public String encoding = "UTF-8";

		private static final long serialVersionUID = 1L;

		public long version = 0;

		public void setObj(String key, AcJSONObject val) {
			this.put(key, val.toJSONString());
		}

		public void setObj(String key, String val) {
			this.put(key, val);
		}

		public void setVersion(long version) {
			this.version = version;
		}

		public String toString() {
			long time = System.currentTimeMillis();
			if (version == 0) version = time;
			StringBuffer sb = new StringBuffer();
			sb.append("{\"version\":").append(version);
			sb.append(", \"build\":").append(appCfg.build());
			sb.append(", \"srvtime\":").append(time);
			int x = authChecker.getAuthUsr();
			sb.append(", \"au\":").append(x);
			x = authChecker.getAuthPower();
			sb.append(", \"al\":").append(x);
			if (size() == 0) {
				sb.append("}");
				return sb.toString();
			}
			for (String k : keySet()) {
				sb.append(", \"");
				AcJSON.escape(k, sb);
				sb.append("\"");
				sb.append(":");
				sb.append(get(k));
			}
			sb.append("}");
			return sb.toString();
		}
	}

}
