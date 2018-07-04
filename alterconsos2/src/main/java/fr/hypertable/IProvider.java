package fr.hypertable;

import java.util.LinkedList;

import fr.hypertable.AppTransactionAdmin.Dumper;

public interface IProvider {
	public void init(boolean hasCache) throws AppException;
	
	public String tmOperation(String op, String taskid, String url, String periode) throws AppException;
	public boolean isToStop(String taskid);
	
	public void close();
	public void setOperation(String operation);
	
	public boolean getOnOff();
	public byte[] getDocument(String k) throws AppException;
	public void putDocument(long version, String k, byte[] bytes) throws AppException;
	public int purgeDocument(long version) throws AppException;
	
	public void beginTransaction(boolean multi) throws AppException ;
	public void rollBack();
	public void commit(boolean hasQueuedTasks) throws AppException;
	
	public void purgeCellFromStorage(String line, String column, String cellType) throws AppException;
//	public CachedCell getFromMemCache(String cacheKey);
//	public void putInMemCache(String cacheKey, long version, byte[] bytes);
	
	public String onOff(boolean on) throws AppException;
	public void listLinesS(String ver, LinkedList<String> lst, Filter f) throws AppException;
	public void listDocs(long minVersion, LinkedList<String> lst, Filter f) throws AppException;
	public void dumpLineS(Dumper d) throws AppException;
	public void delLine(String line) throws AppException;
	
	public Archive getStorageArchive(String line, String column, String cellType, boolean nullIfNot)
			throws AppException;
	public void putArchiveInStorage(Archive a, long version, boolean creation) throws AppException;
	
	public Versions getVersionsFromStorage(String line) throws AppException;
	
	public CachedCell getCellFromStorage(String line, String column, String cellType)
			throws AppException;
	public void putInStorage(String line, String column, String cellType, 
			long version, byte[] bytes, boolean creation) throws AppException;
	
	public boolean removeTaskFromDB(String taskid) throws AppException;

	public String enQueue(String url, byte[] body) throws AppException;
	
	public String enQueueCron(String url, String nextStart) throws AppException;
	
}
