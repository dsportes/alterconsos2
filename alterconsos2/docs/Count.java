package fr.hypertable;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Random;
import java.util.logging.Logger;

public class Count {
	public static final long delta = 10 * 60 * 1000;
	
	public static final Logger log = Logger.getLogger("fr.hypertable");
	
	public static enum Type {LCR, LCF, LCW, MCR, MCF, MCW, DSR, DSW, DIR, GRP, CAT, CAL, LIV, ETC };
	
	public static void t(Type type){
		singleton.trace(type);
	}
	
	private static Count singleton = new Count();
	
	private synchronized void trace(Type type){
		if (type == null)
			return;
		cpts[type.ordinal()]++;
		long now = System.currentTimeMillis();
		if (now - last < delta) 
			return;
		StringBuffer sb = new StringBuffer();
		sb.append("Traces de l'instance ").append(instance).append(" à ")
		.append(sdf1.format(new Date(now))).append(" : ");
		for(Type t : Type.values()){
			int x = cpts[t.ordinal()];
			if (x != 0)
				sb.append(t.name()).append("[").append(x).append("]  " );
		}
		log.info(sb.toString());
		last = now;
	}
	
	long last;
	int instance;
	SimpleDateFormat sdf1;
	int[] cpts = new int[Type.values().length];
	
	private Count(){
		last = System.currentTimeMillis();
		sdf1 = HTServlet.appCfg.sdf1();
		instance = new Random().nextInt(999999);
		if (instance == 0)
			instance = 999999;
	}
}
