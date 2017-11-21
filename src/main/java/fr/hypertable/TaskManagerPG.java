package fr.hypertable;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

public class TaskManagerPG implements Runnable {
	
	private static final int lapse = 60; // lapse entre 2 scan en secondes
	private static final SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmm", Locale.FRANCE);
	private static final SimpleDateFormat sdfm = new SimpleDateFormat("yyyyMMddHHmmSSS", Locale.FRANCE);
	private static final int[] retriesInMin = {1, 10, 60, 180};
	private static final String maxNext = "210001010000";
	private static final TimeZone gmt = TimeZone.getTimeZone("GMT");
	
	private static IAppConfig appCfg;
	private static TaskManagerPG tm;
	public static TaskManagerPG getTM() { return tm; }

	private static final String periodes = "AMHJ";
	private static final int[] lperiodes = {9, 7, 6, 5};
	private static final int[] nbj = {31,28,31,30,31,30,31,31,30,31,30,31};
	private static final int[] nbjb = {31,29,31,30,31,30,31,31,30,31,30,31};
	static class Periode {
		String periode;
		String postfix;
		String diag;
		int type;
		int mo = 1;
		int jo = 1;
		int js = 1;
		int hh = 0;
		int mm = 0;
		
		Periode(String periode){
			this.periode = periode;
			if (periode == null || periode.length() < 1) {
				diag = "la période est vide";
				return;
			}
			type = periodes.indexOf(periode.charAt(0));
			if (type == -1) {
				diag = "la période doit être A M H ou J";
				return;
			}
			int lg = lperiodes[type];
			if (lg != periode.length()){
				diag = "la période doit avoir " + lg + " caractères";
				return;
			}
			postfix = periode.substring(1);
			try {
				switch (type){
				case 0 : { // A 
					mo = Integer.parseInt(postfix.substring(0,2));
					jo = Integer.parseInt(postfix.substring(2,4));
					hh = Integer.parseInt(postfix.substring(4,6));
					mm = Integer.parseInt(postfix.substring(6));
					break;
				}
				case 1 : { // M 
					jo = Integer.parseInt(postfix.substring(0,2));
					hh = Integer.parseInt(postfix.substring(2,4));
					mm = Integer.parseInt(postfix.substring(4));
					break;
				}
				case 2 : { // H 
					js = Integer.parseInt(postfix.substring(0,1));
					hh = Integer.parseInt(postfix.substring(1,3));
					mm = Integer.parseInt(postfix.substring(3));
					break;
				}
				case 3 : { // J 
					hh = Integer.parseInt(postfix.substring(0,2));
					mm = Integer.parseInt(postfix.substring(2));				
					break;
				}
				}
				if (mo < 1 || mo > 12) {
					diag = "valeur du mois incorrecte";
					return;
				}
				if (jo < 1 || jo > nbjb[mo - 1]) {
					diag = "valeur du jour incorrecte";
					return;
				}
				if (js < 1 || js > 7) {
					diag = "valeur du jour de semaine incorrecte";
					return;
				}
				if (hh < 0 || hh > 23) {
					diag = "valeur des heures incorrecte";
					return;
				}
				if (mm < 0 || mm > 59) {
					diag = "valeur des minutes incorrecte";
					return;
				}
			} catch (Exception x) {
				diag = "valeur incorrecte de mois, jour, jour de semaine, heure ou minute";
				return;
			}
			diag = null;
		}
		public String toString(){
			return periode + " " + (diag != null ? diag : nextStart());
		}
		public String nextStart() {
			if (diag != null) return maxNext;
			GregorianCalendar cal = new GregorianCalendar(gmt);
			// cal.set(2016, 11, 31, 0, 0, 0); // Pour tester
			int yc = cal.get(Calendar.YEAR);
			int moc = cal.get(Calendar.MONTH);
			int wc = cal.get(Calendar.DAY_OF_WEEK) - 1;
			int jc = cal.get(Calendar.DAY_OF_MONTH);
			int hc = cal.get(Calendar.HOUR_OF_DAY);
			int mc = cal.get(Calendar.MINUTE);
			String c1 = sdf.format(cal.getTime());
			String c2;
			switch (type){
			case 0 : { // A 
				// essai même année
				int nj = yc % 4 == 0 ? nbjb[mo - 1] : nbj[mo - 1];
				int jx = jo > nj ? nj : jo;
				cal.clear();
				cal.set(yc, mo - 1, jx, hh, mm, 0);
				c2 = sdf.format(cal.getTime());
				if (c2.compareTo(c1) > 0)
					return c2;
				// année suivante
				yc++;
				nj = yc % 4 == 0 ? nbjb[mo - 1] : nbj[mo - 1];
				jx = jo > nj ? nj : jo;
				cal.clear();
				cal.set(yc, mo - 1, jx, hh, mm, 0);
				return sdf.format(cal.getTime());
			}
			case 1 : { // M
				// essai même mois
				int nj = yc % 4 == 0 ? nbjb[moc] : nbj[moc];
				int jx = jo > nj ? nj : jo;
				cal.clear();
				cal.set(yc, moc, jx, hh, mm, 0);
				c2 = sdf.format(cal.getTime());
				if (c2.compareTo(c1) > 0)
					return c2;
				// mois suivant
				moc++;
				if (moc == 12) {
					yc++;
					moc = 0;
				}
				nj = yc % 4 == 0 ? nbjb[moc] : nbj[moc];
				jx = jo > nj ? nj : jo;
				cal.clear();
				cal.set(yc, moc, jx, hh, mm, 0);
				return sdf.format(cal.getTime());
			}
			case 2 : { // H 
				if (wc == 0)
					wc = 7;
				int d = 0;
				if (wc == js){
					if (hc > hh || (hc == hh && mc > mm))
						d = 7; // semaine prochaine
				} else if (wc > js)
					d = js + 7 - wc;
				else if (wc < js)
					d = js - wc;
				
				int jx = jc + d;
				int nj = yc % 4 == 0 ? nbjb[moc] : nbj[moc];
				if (jx > nj) {
					moc++;
					jx = jx - nj;
				}
				if (moc == 12){
					yc++;
					moc = 0;
				}
				cal.clear();
				cal.set(yc, moc, jx, hh, mm, 0);
				return sdf.format(cal.getTime());
			}
			case 3 : { // J
				jc++;
				int nj = yc % 4 == 0 ? nbjb[moc] : nbj[moc];
				if (jc > nj) {
					moc++;
					jc = 1;
				}
				if (moc == 12){
					yc++;
					moc = 0;
				}
				cal.clear();
				cal.set(yc, moc, jc, hh, mm, 0);
				return sdf.format(cal.getTime());
			}
			}
			return maxNext;
		}
	}
	
	static class Cron {
		String url;
		String periode;
		String taskid;
		String nextStart;
		
		public String toString() {
			return new StringBuffer().append(url).append("\t")
			.append(periode).append("\t")
			.append(taskid == null ? "-" : taskid).append("\t")
			.append(nextStart == null ? "-" : nextStart).append("\n")
			.toString();
		}
	}
		
	public static String nows() {
		return sdf.format(new Date());
	}		

	public enum TmState {stopped, running, pausing};
		
	private Task runningTask(String taskid){
		for(int i = 0; i < workers.length; i++){
			Worker w = workers[i];
			if (w.task != null && w.task.taskid.equals(taskid)) return w.task;
		}
		return null;
	}

	private boolean hasRunningTasks(){
		for(int i = 0; i < workers.length; i++)
			if (workers[i].task != null) return true;
		return false;
	}

	private void waitAllStopped() {
		while (true) {
			if (!hasRunningTasks()) return;
			try { Thread.sleep(3000); } catch (InterruptedException e) {}
		}
	}

	private void waitTaskStopped(String taskid) {
		while (true) {
			if (runningTask(taskid) == null) return;
			try { Thread.sleep(3000); } catch (InterruptedException e) {}
		}
	}
	
	void wakeup() {
		tmQueue.add(new TmEvent());
	}

	String tmOperation(AppPG provider, String op, String taskid, String url, String periode) throws AppException {
		if ("tmstop".equals(op)) return doStop();
		if ("tmpause".equals(op)) return doPause();
		if ("tmrestart".equals(op)) return doRestart();
		if ("tmkilltask".equals(op)) return killTask(taskid);
		if ("tmremovetask".equals(op)) return removeTask(provider, taskid);
		if ("tmruntask".equals(op)) return runTask(provider, taskid);
		if ("tmlisttasks".equals(op)) return listTasks(provider);
		if ("tmsetcron".equals(op)) return setCron(provider, url, periode);
		if ("tmlistcrons".equals(op)) return listCrons(provider);
		if ("tmstartcron".equals(op)) return startCron(provider, url);
		if ("tmreschedcrons".equals(op)) return reschedCrons(provider);
		return "L'opération " + op + " n'est pas implémentée par le provider PG";
	}
	
	private String doStop() {
		if (state == TmState.stopped) return "OK : TM déjà arrêté";
		if (state == TmState.running)
			for(int i = 0; i < workers.length; i++) 
				workers[i].isToStop = true;
		state = TmState.stopped;
		waitAllStopped();
		return "OK : TM arrêté, aucune tâche en exécution";
	}
	
	private String doPause() {
		if (state == TmState.stopped) return "KO : TM arrêté";
		if (state == TmState.running)
			for(int i = 0; i < workers.length; i++) 
				workers[i].isToStop = true;
		state = TmState.pausing;
		waitAllStopped();
		return "OK : TM en pause, aucune tâche en exécution";
	}
	
	private String doRestart() {
		if (state == TmState.stopped) return "KO : TM arrêté";
		if (state == TmState.running) {
			wakeup();
			return "OK : TM déjà activé";
		}
		state = TmState.running;
		wakeup();
		return "OK : TM activé";
	}
	
	private String killTask(String taskid){
		for(int i = 0; i < workers.length; i++){
			Worker w = workers[i];
			if (w.task != null && w.task.taskid.equals(taskid)){
				w.isToStop = true;
				waitTaskStopped(taskid);
				wakeup();
				return "OK : la tâche " + taskid + " est arrêté";
			}
		}
		return "OK : la tâche " + taskid + " n'était pas en exécution";
	}
	
	private String removeTask(AppPG provider, String taskid) throws AppException {
		Task t = runningTask(taskid);
		if (t != null)
			killTask(taskid);
		if (provider.removeTaskFromDB(taskid)) {
			wakeup();
			return "OK : tâche " + taskid + " supprimée"; 
		} else {
			wakeup();
			return "OK : tâche " + taskid + " inconnue";
		}
	}
	
	private String runTask(AppPG provider, String taskid) throws AppException{
		if (provider.runTask(taskid, nows())) {
			wakeup();
			return "OK : tâche " + taskid + " inscrite pour lancement immédiat"; 
		} else {
			wakeup();
			return "OK : tâche " + taskid + " inconnue";
		}
	}

	boolean isToStop(String taskid) { 
		for(int i = 0; i < workers.length; i++) {
			Worker w = workers[i];
			if (w.task != null && w.task.taskid.equals(taskid))
				return w.isToStop;
		}
		return false; 
	}
	
	private String listTasks(AppPG provider) throws AppException {
		ArrayList<TaskManagerPG.Task> lst = null;
		lst = provider.getTasks(null, 1000);
		StringBuffer sb = new StringBuffer();
		sb.append("\n");
		for(Task t : lst) sb.append(t.toString());
		wakeup();
		return sb.toString();
	}
		
	private String setCron(AppPG provider, String url, String periode) throws AppException{
		if (periode == null || periode.length() == 0){
			if (provider.removeCronFromDB(url)) {
				wakeup();
				return "OK : cron " + url + " supprimé";
			} else {
				wakeup();
				return "OK : cron " + url + " n'existait pas";
			}
		}
		Periode p = new Periode(periode);
		if (p.diag != null) {
			wakeup();
			return "OK : cron " + url + " : période (" + periode + ") mal formée : " + p.diag;
		}
		provider.removeCronFromDB(url);
		provider.insertCron(url, periode);
		wakeup();
		return "OK : cron " + url + " enregistré avec la période " + periode;
	}

	private String listCrons(AppPG provider) throws AppException{
		ArrayList<Cron> lst = provider.getCrons();
		StringBuffer sb = new StringBuffer();
		sb.append("\n");
		for(Cron c : lst)
			sb.append(c.toString());
		wakeup();
		return sb.toString();
	}

	private String startCron(AppPG provider, String url) throws AppException{
		String next = sdf.format(new Date());
		String n = provider.enQueueCron(url, next);
		if (n != null) {
			wakeup();
			return "OK : cron " + url + " mis en queue pour " + n;
		} else {
			wakeup();
			return "KO : cron " + url + " inconnu";
		}
	}
	
	private String reschedCrons(AppPG provider) {
		int i = 0;
		int j = 0;
		try {
			ArrayList<Cron> lst = provider.getCrons();
			for(Cron c : lst) {
				i++;
				String ns = new Periode(c.periode).nextStart();
				if (!ns.equals(c.nextStart)) {
					j++;
					provider.enQueueCron(c.url, null);
				}
			}
			return "OK : " + i + "crons, " + j + " rescheduled";
		} catch (AppException ex) {
			long nowl = new Date().getTime();
			if (nowl - lastErrMsg > 600000) {
				lastErrMsg = nowl;
				AppPG.log.severe(ex.getMessage());
			}
			return "KO : " + ex.getMessage();
		}
	}

	private Worker[] workers;
	
	private TmState state = TmState.stopped;
	
	static void createTM(IAppConfig appCfg){
		TaskManagerPG.appCfg = appCfg;
		sdf.setTimeZone(gmt);
		sdfm.setTimeZone(gmt);
		tm = new TaskManagerPG(appCfg.providerWorkers());
		Thread t = new Thread(tm);
		t.setName("TM-Main");
		t.start();
		tm.startWorkers();
	}

	AppPG provider;
	
	private TaskManagerPG(int nbWorkers){
		provider = (AppPG) appCfg.newProvider();
		workers = new Worker[nbWorkers];
		for(int i = 0; i < nbWorkers; i++)
			workers[i] = new Worker();
	}

	private void startWorkers(){
		state = TmState.running;
		for(int i = 0; i < workers.length; i++){
			Thread tw = new Thread(workers[i]);
			tw.setName("TM-Worker-" + i);
			tw.start();
		}
	}

	private static class TmEvent {	}
	
	private BlockingQueue<TmEvent> tmQueue =  new ArrayBlockingQueue<TmEvent>(1000) ;

	public void run() {
		while (state != TmState.stopped) {
			try {
				tmQueue.poll(lapse, TimeUnit.SECONDS);
				if (state == TmState.stopped)
					break;
				if (state == TmState.running)
					doTheJob();
			} catch (InterruptedException e) {}
		}		
	}
	
	private long lastErrMsg = 0;
	private long lastReschedCron = 0;
	
	private void doTheJob() {
		Date now = new Date();
		long nowl = now.getTime();
		String next = sdf.format(now);
		
		if (nowl - lastReschedCron > 600000) {
			lastReschedCron = nowl;
			reschedCrons(provider);
		}
		
		ArrayList<TaskManagerPG.Task> lst = null;
		try {
			lst = provider.getTasks(next, workers.length);
		} catch (AppException ex){
			if (nowl - lastErrMsg > 600000) {
				lastErrMsg = nowl;
				AppPG.log.severe(ex.getMessage());
			}
			return;
		}
		
		boolean freeWorkers = false;
		for(Task t : lst) {
			if (runningTask(t.taskid) != null)
				continue; // ignore celle déjà en exécution
			freeWorkers = false;
			for(int i = 0; i < workers.length; i++) {
				Worker w = workers[i];
				if (w.task == null) {
					w.task = t;
					w.workerQueue.add(new WorkerEvent(t));
					freeWorkers = true;
					break;
				}
			}
			if (!freeWorkers)
				break;
		}
	}
		
	static class DistributeurId {
		private static long derniereId = 0;
	
		static synchronized String get() {
			long now = new Date().getTime();
			if (now <= derniereId) {
				derniereId++;
				return sdfm.format(new Date(derniereId));
			} else 
				derniereId = now;
			return sdfm.format(now);
		}
	}
	
	static class Task {
		String taskid;
		String url;
		boolean isCron;
		byte[] arg1;
		String nextStart;
		int retry;
		
		public String toString(){
			return new StringBuffer()
			.append(taskid).append("\t").append(url).append("\t")
			.append(isCron ? "C" : "T").append("\t")
			.append(arg1 != null ? arg1.length : 0).append("\t")
			.append(retry).append("\t")
			.append(nextStart).append("\n")
			.toString();
		}
	}
	
	private static class WorkerEvent {
		Task task;
		private WorkerEvent(Task t){ task = t; }
	}
	
	private class Worker implements Runnable {
		Task task;
		boolean isToStop = false;
		private BlockingQueue<WorkerEvent> workerQueue =  new ArrayBlockingQueue<WorkerEvent>(10);
		AppPG myProvider = (AppPG)appCfg.newProvider();
		
		public void run() {
			while (state != TmState.stopped) {
				try {
					WorkerEvent event = workerQueue.poll(10, TimeUnit.SECONDS);
					if (state == TmState.stopped) break;
					if (event != null) {
						task = event.task;
						isToStop = false;
						if (state == TmState.running)
							runTask();
						else 
							try {
								onerror();
							} catch (AppException e) { }
					}
				} catch (InterruptedException e) {}
			}
		}
		
		private void runTask(){
			AppTransaction appTransaction = null;
			try {
				byte[] args = task.isCron ? null : task.arg1;
				String[] x = task.url.split("/");
				appTransaction = new AppTransaction(x, args, task.taskid, task.isCron);
				if (appTransaction.getStatus() != 0) 
					onerror();
				if (appTransaction != null && appTransaction.provider() != null)
					appTransaction.provider().close();
				appTransaction = null;
				task = null;
			} catch (Throwable tx) {
				try {
					onerror();
				} catch (AppException e) {	}
				if (appTransaction != null && appTransaction.provider() != null)
					appTransaction.provider().close();
				appTransaction = null;
				task = null;
			}
		}
		
		private void onerror() throws AppException{
			int r = task.retry;
			String next;
			if (r >= retriesInMin.length) {
				next = maxNext;
				task.retry = 99;
			} else {
				long l = (long)retriesInMin[task.retry] * 60000;
				next = sdf.format(new Date(new Date().getTime() + l));
				task.retry++;
			}
			myProvider.retryTask(task.taskid, next, task.retry);
		}

	}
	
	public static void main(String[] args){
		sdf.setTimeZone(gmt);
		GregorianCalendar cal = new GregorianCalendar(gmt);
		cal.set(2016, 1, 8, 0, 0, 0);
		System.out.println(cal.get(Calendar.DAY_OF_WEEK));
		System.out.println(sdf.format(cal.getTime()));
		
		System.out.println(new Periode(null));
		System.out.println(new Periode(""));
		System.out.println(new Periode("A"));
		System.out.println(new Periode("A1234567"));
		System.out.println(new Periode("M12345"));
		System.out.println(new Periode("H1234"));
		System.out.println(new Periode("J123"));
		System.out.println(new Periode("X"));

		System.out.println(new Periode("A13312359"));
		System.out.println(new Periode("A02302359"));
		System.out.println(new Periode("A02292459"));
		System.out.println(new Periode("A02292360"));
		System.out.println(new Periode("A02292359"));

		System.out.println(new Periode("M292359"));

		System.out.println(new Periode("H22359"));
		System.out.println(new Periode("H32359"));
		System.out.println(new Periode("H42359"));

		System.out.println(new Periode("J0859"));

	}
}
