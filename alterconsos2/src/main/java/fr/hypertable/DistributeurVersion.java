package fr.hypertable;

import java.util.Date;

public class DistributeurVersion {
	private static long derniereVersion = 0;

	public static synchronized long prochaine(long version) {
		long now = new Date().getTime();
		if (now <= derniereVersion)
			derniereVersion++;
		else 
			derniereVersion = now;
		if (version > derniereVersion) 
			derniereVersion = version + 1;
		return derniereVersion;
	}

}
