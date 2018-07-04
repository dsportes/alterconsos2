package fr.hypertable;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedList;
import java.util.Locale;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.sql.DataSource;

import org.postgresql.ds.PGPoolingDataSource;

import fr.hypertable.AppTransactionAdmin.Dumper;

public class AppPG implements IProvider {
	public static final Logger log = HTServlet.appCfg.log();

	private static final SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmmssSSS", Locale.FRANCE);

	private static IAppConfig appCfg = null;;
	private static DataSource dataSource = null;

	public static void startup(IAppConfig appCfg) throws AppException {
		if (AppPG.appCfg == null) {
			sdf.setTimeZone(appCfg.timezone());
			AppPG.appCfg = appCfg;
			try {
				PGPoolingDataSource source = new PGPoolingDataSource();
				source.setUrl(appCfg.dbURL());
				source.setUser(appCfg.username());
				source.setPassword(appCfg.password());
				source.setMaxConnections(appCfg.maxConnections());
				dataSource = source;
			} catch (Exception e){
				String msg1 = "DataSource non trouvée / non initialisable";
				log.log(Level.SEVERE, msg1 + " - " + e.getMessage());
				throw new AppException(e, MF.XSQLDS);
			}
			TaskManagerPG.createTM(appCfg);
		}
	}
	
	private Connection conn;
	private String operationCode = "?";

	private Connection conn() throws AppException{ 
		if (conn == null)
			try {
				conn = dataSource.getConnection();
			} catch (SQLException e){
				throw new AppException(e, MF.XSQL0, operationCode);
			}
		return conn;
	}

	@Override public void init(boolean hasCache) throws AppException{
	}

	@Override public void setOperation(String operation){
		this.operationCode = operation;		
	}
	
	@Override public void close() {
		if (conn != null)
			try {
				rollBack();
				conn.close();
				conn = null;
			} catch (SQLException e) {
				conn = null;
			}		
	}

	void err(PreparedStatement preparedStatement, ResultSet rs) {
		if (preparedStatement != null)
			try { preparedStatement.close(); } catch (SQLException e1) {}
		if (rs != null)
			try { rs.close(); } catch (SQLException e1) {}
		close();
	}

	private static final String sqldelcron = "delete from cron where url = ?";

	boolean removeCronFromDB(String url) throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqldelcron);
			int j = 1;
			preparedStatement.setString(j++, url);
			int n = preparedStatement.executeUpdate();
			preparedStatement.close();
			return n == 1;
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, "deleteCron", sqldelcron);
		}
	}
	
	private static final String sqlinsertcron = "insert into cron "
			+ "(url, periode) values (?,?);";
	
	void insertCron(String url, String periode)
			throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqlinsertcron);
			int j = 1;
			preparedStatement.setString(j++, url);
			preparedStatement.setString(j++, periode);
			preparedStatement.executeUpdate();
			preparedStatement.close();
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, "insertCron", sqlinsertcron);
		}		
	}

	private static final String sqlgetcron = 
			"select c.periode, t.taskid, t.nextstart from cron as c " 
			+ "left outer join task as t on (c.url = t.url) where c.url = ?;";
	
	TaskManagerPG.Cron getCron(String url) throws AppException {
		PreparedStatement preparedStatement = null;
		ResultSet rs = null;
		TaskManagerPG.Cron t = null;
		try {
			preparedStatement = conn().prepareStatement(sqlgetcron);
			preparedStatement.setString(1, url);
			rs = preparedStatement.executeQuery();
			if (rs.next()) {
				t = new TaskManagerPG.Cron();
				int j = 1;
				t.url = url;
				t.periode = rs.getString(j++);
				t.taskid = rs.getString(j++);
				t.nextStart = rs.getString(j++);
			}
			rs.close();
			preparedStatement.close();
			return t;
		} catch(Exception e){
			err(preparedStatement, rs);
			throw new AppException(e, MF.XSQL1, "getCron", sqlgetcron);
		}
	}

	private static final String sqlgetcrons = 
			"select c.url, c.periode, t.taskid, t.nextstart from cron as c " 
			+ "left outer join task as t on (c.url = t.url);";
	
	ArrayList<TaskManagerPG.Cron> getCrons() throws AppException {
		ArrayList<TaskManagerPG.Cron> lst = new ArrayList<TaskManagerPG.Cron>();
		PreparedStatement preparedStatement = null;
		ResultSet rs = null;
		try {
			preparedStatement = conn().prepareStatement(sqlgetcrons);
			rs = preparedStatement.executeQuery();
			while (rs.next()) {
				TaskManagerPG.Cron t = new TaskManagerPG.Cron();
				int j = 1;
				t.url = rs.getString(j++);
				t.periode = rs.getString(j++);
				t.taskid = rs.getString(j++);
				t.nextStart = rs.getString(j++);
				lst.add(t);
			}
			rs.close();
			preparedStatement.close();
			return lst;
		} catch(Exception e){
			err(preparedStatement, rs);
			throw new AppException(e, MF.XSQL1, "getCrons", sqlgetcrons);
		}
	}

	private static final String sqldeltask = "delete from task where taskid = ?";

	@Override public boolean removeTaskFromDB(String taskid) throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqldeltask);
			int j = 1;
			preparedStatement.setString(j++, taskid);
			int n = preparedStatement.executeUpdate();
			preparedStatement.close();
			return n == 1;
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, operationCode, sqldeltask);
		}
	}
	
	private static final String sqlruntask = "update task set nextstart = ? where taskid = ?;";
	
	boolean runTask(String taskid, String nextStart) throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqlruntask);
			int j = 1;
			preparedStatement.setString(j++, nextStart);
			preparedStatement.setString(j++, taskid);
			int n = preparedStatement.executeUpdate();
			preparedStatement.close();
			return n == 1;
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, "runTask", sqlruntask);
		}		
	}

	private static final String sqlretrytask = "update task set nextstart = ?, retry = ? where taskid = ?;";
	
	boolean retryTask(String taskid, String nextStart, int retry) throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqlretrytask);
			int j = 1;
			preparedStatement.setString(j++, nextStart);
			preparedStatement.setInt(j++, retry);
			preparedStatement.setString(j++, taskid);
			int n = preparedStatement.executeUpdate();
			preparedStatement.close();
			return n == 1;
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, "retryTask", sqlretrytask);
		}		
	}

	private static final String sqlinserttask = "insert into task "
			+ "(taskid, url, iscron, arg1, retry, nextstart) values (?,?,?,?,?,?);";
	
	void insertTask(String taskid, String url, boolean isCron, byte[] arg1, String nextStart)
			throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqlinserttask);
			int j = 1;
			preparedStatement.setString(j++, taskid);
			preparedStatement.setString(j++, url);
			preparedStatement.setInt(j++, isCron ? 1 : 0);
			preparedStatement.setBytes(j++, arg1);
			preparedStatement.setInt(j++, 0);
			preparedStatement.setString(j++, nextStart);
			preparedStatement.executeUpdate();
			preparedStatement.close();
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, "insertTask", sqlinserttask);
		}		
	}

	private static final String sqlgettasks = "select taskid, url, iscron, arg1, nextstart, retry "
			+ "from task where nextstart <= ? order by nextstart asc limit ?;";
	
	ArrayList<TaskManagerPG.Task> getTasks(String limit, int nbrows) throws AppException {
		String s = limit == null ? "210001010000" : limit;
		ArrayList<TaskManagerPG.Task> lst = new ArrayList<TaskManagerPG.Task>();
		PreparedStatement preparedStatement = null;
		ResultSet rs = null;
		try {
			preparedStatement = conn().prepareStatement(sqlgettasks);
			preparedStatement.setString(1,  s);
			preparedStatement.setInt(2,  nbrows);
			rs = preparedStatement.executeQuery();
			while (rs.next()) {
				TaskManagerPG.Task t = new TaskManagerPG.Task();
				int j = 1;
				t.taskid = rs.getString(j++);
				t.url = rs.getString(j++);
				t.isCron = rs.getInt(j++) == 1;
				t.arg1 = rs.getBytes(j++);
				t.nextStart = rs.getString(j++);
				t.retry = rs.getInt(j++);
				lst.add(t);
			}
			rs.close();
			preparedStatement.close();
			return lst;
		} catch(Exception e){
			err(preparedStatement, rs);
			throw new AppException(e, MF.XSQL1, "getTasks", sqlgettasks);
		}
	}
	
	private static final String getonoff = "select onoff from onoff where onoff = 1";
	
	@Override public boolean getOnOff() {
		PreparedStatement preparedStatement = null;
		ResultSet rs = null;
		boolean onoff = false;
		try {
			preparedStatement = conn().prepareStatement(getonoff);
			rs = preparedStatement.executeQuery();
			if (rs.next())
				onoff = true;
			rs.close();
			preparedStatement.close();
			return onoff;
		} catch(Exception e){
			err(preparedStatement, rs);
			Object[] x = {"getOnOff", getonoff};
			log.log(Level.SEVERE, MF.XSQL1.format(x));
			return false;
		}
	}

	private static final String selectdoc = "select content from doc where docid = ?;";
	
	@Override public byte[] getDocument(String k) throws AppException {
		PreparedStatement preparedStatement = null;
		ResultSet rs = null;
		byte[] bytes = null;
		try {
			preparedStatement = conn().prepareStatement(selectdoc);
			preparedStatement.setString(1, k);
			rs = preparedStatement.executeQuery();
			if (rs.next())
				bytes = rs.getBytes(1);
			rs.close();
			preparedStatement.close();
			return bytes;
		} catch(Exception e){
			err(preparedStatement, rs);
			throw new AppException(e, MF.XSQL1, "getDoc", selectdoc);
		}
	}

	private static final String sqlputdoc = "insert into doc (docid, version, content) values (?,?,?);";
	
	@Override public void putDocument(long version, String k, byte[] bytes) throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqlputdoc);
			int j = 1;
			preparedStatement.setString(j++, k);
			preparedStatement.setLong(j++, version);
			preparedStatement.setBytes(j++, bytes);
			preparedStatement.executeUpdate();
			preparedStatement.close();
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, operationCode, sqlputdoc);
		}
	}

	private boolean inTransaction = false;
	
	@Override public void beginTransaction(boolean multi) throws AppException {
		if (inTransaction)
			return;
		try {
			conn().setAutoCommit(false);
			inTransaction = true;
		} catch (SQLException e) {
			throw new AppException(e, MF.XSQLB, operationCode);
		}
	}

	@Override public void rollBack() {
		if (inTransaction && conn != null) {
			try {
				conn.rollback();
			} catch (SQLException e) { }
			try {
				conn.setAutoCommit(true);
			} catch (SQLException e) { }
		}
	}

	@Override public void commit(boolean hasQueuedTasks) throws AppException {
		if (inTransaction && conn != null) {
			try {
				conn.commit();
			} catch (SQLException e) {
				throw new AppException(e, MF.XSQLC, operationCode);
			}
			try {
				conn.setAutoCommit(true);
			} catch (SQLException e) { }
			inTransaction = false;
		}
		if (hasQueuedTasks)
			TaskManagerPG.getTM().wakeup();
	}

	private static final String sqlpurgecell = "delete from cell "
			+ "where celltype = ? and lineid = ? and columnid = ?;";

	@Override public void purgeCellFromStorage(String line, String column, String cellType)
			 throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqlpurgecell);
			int j = 1;
			preparedStatement.setString(j++, cellType);
			preparedStatement.setString(j++, line);
			preparedStatement.setString(j++, column);
			preparedStatement.executeUpdate();
			preparedStatement.close();
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, operationCode, sqlpurgecell);
		}
	}

//	@Override public CachedCell getFromMemCache(String cacheKey) {
//		return null;
//	}
//
//	@Override public void putInMemCache(String cacheKey, long version, byte[] bytes) {
//	}

	private static final String sqloff = "delete from onoff;";
	private static final String sqlon = "insert into onoff (onoff) values (1);";
	
	@Override public String onOff(boolean on) throws AppException {
		boolean b = getOnOff();
		if (b && on) return "OK - Serveur ON";
		if (!b && !on) return "OK - Serveur OFF";
		String sql = on ? sqlon : sqloff;
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sql);
			preparedStatement.executeUpdate();
			preparedStatement.close();
			return "OK - Serveur " + (!b ? "ON" : "OFF");
		} catch(Exception e){
			err(preparedStatement, null);
			Object[] x = {"setOnOff", sql};
			log.log(Level.SEVERE, MF.XSQL1.format(x));
			return "ERR - Serveur " + (b ? "ON" : "OFF");
		}			
	}
	
	private static final String sqldelline = "delete from cell where lineid = ?;";

	@Override public void delLine(String line) throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqldelline);
			preparedStatement.setString(1, line);
			preparedStatement.executeUpdate();
			preparedStatement.close();
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, "delLine", sqldelline);
		}
	}


	private static final String sqlgetlines = "select lineid, version from cell "
			+ "where celltype = 'Versions';";
	
	@Override public void listLinesS(String ver, LinkedList<String> lst, Filter f) 
			throws AppException{
		ResultSet rs = null;
		PreparedStatement preparedStatement = null;
		long version;
		String ln;
		try {
			preparedStatement = conn().prepareStatement(sqlgetlines);
			rs = preparedStatement.executeQuery();
			while (rs.next()) {
				int j = 1;
				ln = rs.getString(j++);
				if (!f.ok(ln)) 
					continue;
				if (ver == null)
					lst.add(ln);
				else {
					version = rs.getLong(j++);
					String v = sdf.format(new Date(version));
					if (ver.compareTo(v) < 0)
						lst.add(ln);
				}
			}
			rs.close();
			preparedStatement.close();
		} catch(Exception e){
			err(preparedStatement, rs);
			throw new AppException(e, MF.XSQL1, operationCode, sqlgetlines);
		}
	}

	private static final String sqlgetdocs = "select docid, version from doc;";
	@Override public void listDocs(long minVersion, LinkedList<String> lst, Filter f) throws AppException{
		ResultSet rs = null;
		PreparedStatement preparedStatement = null;
		long version;
		String ln;
		try {
			preparedStatement = conn().prepareStatement(sqlgetdocs);
			rs = preparedStatement.executeQuery();
			while (rs.next()) {
				int j = 1;
				ln = rs.getString(j++);
				if (!f.ok(ln)) 
					continue;
				version = rs.getLong(j++);
				if (version >= minVersion)
					lst.add(ln);
			}
			rs.close();
			preparedStatement.close();
		} catch(Exception e){
			err(preparedStatement, rs);
			throw new AppException(e, MF.XSQL1, operationCode, sqlgetdocs);
		}
		
	}

	private static final String sqlgetcells = "select celltype, columnid, version, mime, content from cell "
			+ "where lineid = ?;";

	@Override public void dumpLineS(Dumper d) throws AppException {
		long version = 0;
		String cn = null;
		String tn = null;
		String mime = null;
		byte[] bytes = null;
		ResultSet rs = null;
		boolean versionsFaites = false;
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqlgetcells);
			preparedStatement.setString(1, d.line);
			rs = preparedStatement.executeQuery();
			while (rs.next()) {
				int j = 1;
				tn = rs.getString(j++);
				cn = rs.getString(j++);
				if (!d.fc.ok(cn) || !d.ft.ok(tn)) 
					continue;
				if ("Versions".equals(tn)){
					if (versionsFaites) 
						continue;
					else
						versionsFaites = true;
				}
				version = rs.getLong(j++);
				mime = rs.getString(j++);
				if (rs.wasNull()) mime = null;
				bytes = rs.getBytes(j++);
				String v = sdf.format(new Date(version));
				if ("20120101000000000".compareTo(v) > 0) {
					v = "20120101000000000";
					version = d.dinf;
				}
				if (d.ver != null && d.ver.compareTo(v) > 0) 
					continue;
				if (d.minVersion.compareTo(v) > 0) 
					d.minVersion = v;
				d.cell(tn, cn, version, mime, bytes);
			}
			rs.close();
			preparedStatement.close();
		} catch(Exception e){
			err(preparedStatement, rs);
			throw new AppException(e, MF.XSQL1, operationCode, sqlgetcells);
		}		
		
	}

	private static final String sqlgetcell = "select version, mime, content from cell "
			+ "where celltype = ? and lineid = ? and columnid = ?;";

	private Archive getCell(String line, String column, String cellType)
			throws AppException {
		long version = 0;
		String mime = null;
		byte[] bytes = null;
		ResultSet rs = null;
		Archive a = null;
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqlgetcell);
			int j = 1;
			preparedStatement.setString(j++, cellType);
			preparedStatement.setString(j++, line);
			preparedStatement.setString(j++, column);
			rs = preparedStatement.executeQuery();
			if (rs.next()) {
				j = 1;
				version = rs.getLong(j++);
				mime = rs.getString(j++);
				if (rs.wasNull()) mime = null;
				bytes = rs.getBytes(j++);
				a = new Archive(line, column, cellType, mime, bytes, version);
			}
			rs.close();
			preparedStatement.close();
			return a;
		} catch(Exception e){
			err(preparedStatement, rs);
			throw new AppException(e, MF.XSQL1, operationCode, sqlgetcell);
		}
	}

	@Override public Archive getStorageArchive(String line, String column, String cellType, boolean nullIfNot)
			throws AppException {
		Archive a = getCell(line, column, cellType);
		if (a != null && a.getMime() != null) 
			return a;
		if (nullIfNot)
			return null;
		if (!"PHOTO".equals(cellType)) {
			String m = "Aucune archive nommée " + line + "/" + cellType + ":" + column;
			return new Archive(line, column, cellType, "text/plain", m.getBytes(AppTransaction.utf8), 0);
		} else {
			return new Archive(line, column, cellType, "image/jpeg", HTServlet.defaultImage(), 0);
		}
	}
	
	private static final String sqlgetversion = "select version from cell "
			+ " where celltype = ? and lineid = ? and columnid = ?;";
	
	private long version(String line, String column, String cellType) throws AppException {
		long version = -1;
		ResultSet rs = null;
		PreparedStatement preparedStatement = null;
		try {
			preparedStatement = conn().prepareStatement(sqlgetversion);
			int j = 1;
			preparedStatement.setString(j++, cellType);
			preparedStatement.setString(j++, line);
			preparedStatement.setString(j++, column);
			rs = preparedStatement.executeQuery();
			if (rs.next())
				version = rs.getLong(1);
			rs.close();
			preparedStatement.close();
			return version;
		} catch(Exception e){
			err(preparedStatement, rs);
			throw new AppException(e, MF.XSQL1, operationCode, sqlgetversion);
		}
	}
	
	private static final String sqlupdate = "update cell set version = ?, mime = ?, content = ?"
			+ " where celltype = ? and lineid = ? and columnid = ?;";
	
	private void update(String line, String column, String cellType,
			long version, String mime, byte[] bytes) throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			int j = 1;
			preparedStatement = conn().prepareStatement(sqlupdate);
			preparedStatement.setLong(j++, version);
			preparedStatement.setString(j++, mime);
			preparedStatement.setBytes(j++, bytes);
			preparedStatement.setString(j++, cellType);
			preparedStatement.setString(j++, line);
			preparedStatement.setString(j++, column);
			preparedStatement.executeUpdate();
			preparedStatement.close();
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, operationCode, sqlupdate);
		}
	}

	private static final String sqlinsert = "insert into cell "
			+ "(version, mime, content, celltype, lineid, columnid) values (?,?,?,?,?,?);";
	
	private void insert(String line, String column, String cellType,
			long version, String mime, byte[] bytes) throws AppException {
		PreparedStatement preparedStatement = null;
		try {
			int j = 1;
			preparedStatement = conn().prepareStatement(sqlinsert);
			preparedStatement.setLong(j++, version);
			preparedStatement.setString(j++, mime);
			preparedStatement.setBytes(j++, bytes);
			preparedStatement.setString(j++, cellType);
			preparedStatement.setString(j++, line);
			preparedStatement.setString(j++, column);
			preparedStatement.executeUpdate();
			preparedStatement.close();
		} catch(Exception e){
			err(preparedStatement, null);
			throw new AppException(e, MF.XSQL1, operationCode, sqlinsert);
		}
	}

	@Override public void putArchiveInStorage(Archive a, long version, boolean creation) throws AppException {
		if (creation)
			insert(a.getLine(), a.getColumn(), a.getCellType(), version, a.getMime(), a.getBytes());
		else  {
			long v = version(a.getLine(), a.getColumn(), a.getCellType());
			if (v == -1)
				insert(a.getLine(), a.getColumn(), a.getCellType(), version, a.getMime(), a.getBytes());
			else
				update(a.getLine(), a.getColumn(), a.getCellType(), version, a.getMime(), a.getBytes());
		}
	}

	@Override public Versions getVersionsFromStorage(String line) throws AppException {
		Archive a = getCell(line, "", "Versions");
		if (a == null) return null;
		return (Versions) new Versions().init(line, "", a.getVersion(), a.getBytes());
	}

	@Override public CachedCell getCellFromStorage(String line, String column, String cellType)
			throws AppException {
		if ("Versions".equals(cellType)) column = "";
		Archive a = getCell(line, column, cellType);
		if (a == null) return null;
		CachedCell c = new CachedCell();
		c.version = a.getVersion();
		c.bytes = a.getBytes();
		return c;
	}
	
	@Override public void putInStorage(String line, String column, String cellType, long version,
			byte[] bytes, boolean creation) throws AppException {
		if ("Versions".equals(cellType)) column = "";
		if (creation)
			insert(line, column, cellType, version, null, bytes);
		else
			update(line, column, cellType, version, null, bytes);
	}

	@Override public String enQueue(String url, byte[] body) throws AppException {
		AppTransaction.tr().queingTask();
		String id = TaskManagerPG.DistributeurId.get();
		String nows = TaskManagerPG.nows();
		insertTask(id, url, false, body, nows);
		return nows;
	}

	@Override public String enQueueCron(String url, String nextStart) throws AppException {
		TaskManagerPG.Cron c = getCron(url);
		if (c != null) {
			if (c.taskid != null)
				removeTaskFromDB(c.taskid);
			String id = TaskManagerPG.DistributeurId.get();
			String next = nextStart != null ? nextStart : new TaskManagerPG.Periode(c.periode).nextStart();
			insertTask(id, url, true, null, next);
			return next;
		}
		return null;
	}

	@Override public String tmOperation(String op, String taskid, String url, String periode) 
			throws AppException { 
		return TaskManagerPG.getTM().tmOperation(this, op, taskid, url, periode);
	}
	
	@Override public boolean isToStop(String taskid) { 
		return taskid == null ? false : TaskManagerPG.getTM().isToStop(taskid); 
	}

	@Override
	public int purgeDocument(long version) throws AppException {
		// TODO Auto-generated method stub
		return 0;
	}

}
