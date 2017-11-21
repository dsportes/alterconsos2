package fr.hypertable;

import java.util.ArrayList;

public class Filter extends ArrayList<String> {
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	Filter(String s) {
		if (s == null || s.length() == 0 || "0".equals(s)) return;
		String[] x = s.split(" ");
		for (String y : x) {
			y.trim();
			if (y.length() != 0) this.add(y);
		}
	}
	
	boolean ok(String s) {
		if (this.size() == 0 || s == null || s.length() == 0) return true;
		for (String x : this)
			if (s.startsWith(x)) return true;
		return false;
	}
}
