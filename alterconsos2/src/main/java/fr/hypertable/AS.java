package fr.hypertable;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collection;
import java.util.Date;
import java.util.List;

public class AS {

	private static int[][] qabs = new int[100][];
	
	private static int nbsMax = 0;

	private static int nbjMax = 2;

	private static final int nbjn[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
	private static final int nbjb[] = {31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

	static {
		for(int a = 13; a < 99; a++){
			qabs[a - 13] = new int[12];
			for(int m = 0; m < 12; m++){
				qabs[a - 13][m] = nbjMax;
				if (a % 4 == 0)
					nbjMax += nbjb[m];
				else
					nbjMax += nbjn[m];
			}
		}
		nbsMax = nbjMax / 7;
	}

	public static int nbjm(int aa, int mm){
		if (aa < 12 || aa > 99 || mm < 1 || mm > 12)
			return -1;
		return aa % 4 == 0 ? nbjb[mm -1] : nbjn[mm -1];
	}
	
	public static String stackTrace(Throwable t){
		String s = t.toString();
		try {
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			PrintStream ps = new PrintStream(bos);
			t.printStackTrace(ps);
			s = bos.toString("UTF-8");
			bos.close();
			ps.close();
		} catch (Exception e) { }
		return s;
	}
	
	public static int jsCheck(int aammjj){
		if (aammjj < 121230)
			return -1;
		int aa = aammjj / 10000;
		if (aa > 99)
			return -1;
		int mm = (aammjj / 100) % 100;
		if (mm > 12 || mm  == 0)
			return -1;
		int jj = aammjj % 100;
		if (jj == 0 || jj > 31 || jj > nbjm(aa, mm))
			return -1;
		int q = qabs[aa - 13][mm - 1];
		int js = (q + jj - 1) % 7;
		return js == 0 ? 7 : js;
	}
	
	public static int nbj(int aammjj){ // nombre de jours écoulés depuis 121230 (121230 est 0 : c'est un dimanche)
		if (aammjj < 121230)
			return 0;
		int aa = aammjj / 10000;
		if (aa > 99)
			aa = 99;
		int mm = (aammjj / 100) % 100;
		if (mm > 12)
			mm = 12;
		int jj = aammjj % 100;
		int q = qabs[aa - 13][mm - 1];
		return q + jj - 1;
	}
	
	public static Date aammjj2Date(int aammjj){
		int aa = aammjj / 10000;
		if (aa > 99)
			aa = 99;
		int mm = (aammjj / 100) % 100;
		if (mm > 12)
			mm = 12;
		int jj = aammjj % 100;
		Calendar c = Calendar.getInstance();
		c.set(2000 + aa, mm - 1, jj);
		return c.getTime();
	}
	
	public static int nbs(int aammjj){ // nombre de semaines entières écoulées depuis 130101. 
		return (nbj(aammjj) - 1) / 7;
	}
		
	public static int js(int aammjj){
		int js = nbj(aammjj) % 7;
		return js == 0 ? 7 : js;
	}
	
	public static int aammjj(int nbj){
		if (nbj <= 0)
			return 121230;
		if (nbj > nbjMax)
			return 991231;
		for(int a = 0; a < (99 - 13); a++){
			if (nbj < qabs[a + 1][0])
				for(int m = 11; m >= 0; m--){
					int q1 = qabs[a][m];
					if (nbj >= q1) {
						return ((a + 13) * 10000) + ((m + 1) * 100) + (nbj - q1 + 1);
					}
				}
		}
		return 991231;
	}
	
	public static int aammjj(int nbs, int js){
		if (js < 1 || js > 7)
			js = 1;
		if (nbs < 0)
			nbs = 0;
		if (nbs > nbsMax)
			nbs = nbsMax;
		int nbj = (nbs * 7) + js;
		return aammjj(nbj);
	}

	public static final ArrayList<Integer> emptyList = new ArrayList<Integer>(0);

	public static String[] as(String... args) {
		return args;
	}

	public static String escapeHTML(String s){
		if (s == null || s.length() == 0)
			return "";
		StringBuffer sb = new StringBuffer();
		for(int i = 0; i < s.length(); i++){
			char c = s.charAt(i);
			if (c == '<')
				sb.append("&lt;");
			else if (c == '>')
				sb.append("&gt;"); 
			else if (c == '&')
				sb.append("&#38;");
			else if (c == '\n')
				sb.append("<br>");
			else sb.append(c);
		}
		return sb.toString();
	}

	public static void sort(Collection<Integer> src) {
		if (src == null || src.size() == 0) return;
		Integer[] values = src.toArray(new Integer[src.size()]);
		Arrays.sort(values);
		src.clear();
		for (int i : values)
			src.add(i);
	}

	public static Collection<Integer> union(Collection<Integer> src, Collection<Integer> dest) {
		if (src != null && src.size() != 0){
			if (dest == null)
				dest = new ArrayList<Integer>();
			for(int i : src){
				if (!dest.contains(i))
					dest.add(i);
			}
		}
		return dest;
	}

	public static Collection<Integer> union(Collection<Integer> src) {
		Collection<Integer> dest = null;
		return AS.union(src, dest);
	}

	public static void sort(Collection<Integer> src, Collection<Integer> dest) {
		if (dest == null) return;
		if (src == null || src.size() == 0) {
			dest.clear();
			return;
		}
		Integer[] values = src.toArray(new Integer[src.size()]);
		Arrays.sort(values);
		if (dest.equals(values)) return;
		dest.clear();
		for (int i : values)
			dest.add(i);
	}

	public static boolean copyIf(ArrayInt dest, List<Integer> src) {
		Integer[] a1 = src.toArray(new Integer[src.size()]);
		Integer[] a2 = dest.toArray(new Integer[dest.size()]);
		Arrays.sort(a1);
		Arrays.sort(a2);
		if (!Arrays.equals(a1, a2)) {
			dest.clear();
			dest.addAll(src);
			return true;
		}
		return false;
	}

	public static int[] split(String s) {
		if (s == null || s.length() == 0) return new int[0];
		ArrayList<Integer> a = new ArrayList<Integer>();
		int j;
		while ((j = s.indexOf('.')) != -1) {
			String s1 = s.substring(0, j);
			try {
				a.add(Integer.parseInt(s1));
			} catch (Exception e) {
				a.add(0);
			}
			s = (j != s.length()) ? s.substring(j + 1) : "";
		}
		int[] ax = new int[a.size()];
		for (int i = 0; i < a.size(); i++)
			ax[i] = a.get(i);
		return ax;
	}

	public static String shortId(String name) {
		StringBuffer sb = new StringBuffer();
		if (name != null && name.length() != 0) {
			String nuc = name.toUpperCase();
			for (int i = 0; i < nuc.length(); i++) {
				char c = nuc.charAt(i);
				if ((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'))
					sb.append(c);
				else sb.append('Z');
				if (i == 5) break;
			}
		}
		return sb.toString();
	}
	
	public static String toSHA1(String convertme) {
		try {
			MessageDigest md = MessageDigest.getInstance("SHA");
			return toHexString(md.digest(convertme.getBytes("UTF-8")));
		} catch (Exception ex) {
			return null;
		}
	}
	
	public static String toHexString(byte[] buf) {
		char[] hexChar = { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd',
				'e', 'f' };
		StringBuffer strBuf = new StringBuffer(buf.length * 2);
		for (int i = 0; i < buf.length; i++) {
			strBuf.append(hexChar[(buf[i] & 0xf0) >>> 4]);
			strBuf.append(hexChar[buf[i] & 0x0f]);
		}
		return strBuf.toString();
	}

	public static void main(String[] args){
		int d = 130101;
		int n = nbj(d);
		int j = js(d);
		int s = nbs(d);
		System.out.println("nbj=" + n + " j=" + j + " nbs=" + s + " aammjj=" + aammjj(n) + " / " + aammjj(s, j));
		d = 130106;
		n = nbj(d);
		j = js(d);
		s = nbs(d);
		System.out.println("nbj=" + n + " j=" + j + " nbs=" + s + " aammjj=" + aammjj(n) + " / " + aammjj(s, j));
		d = 130107;
		n = nbj(d);
		j = js(d);
		s = nbs(d);
		System.out.println("nbj=" + n + " j=" + j + " nbs=" + s + " aammjj=" + aammjj(n) + " / " + aammjj(s, j));
		d = 130108;
		n = nbj(d);
		j = js(d);
		s = nbs(d);
		System.out.println("nbj=" + n + " j=" + j + " nbs=" + s + " aammjj=" + aammjj(n) + " / " + aammjj(s, j));
		d = 130113;
		n = nbj(d);
		j = js(d);
		s = nbs(d);
		System.out.println("nbj=" + n + " j=" + j + " nbs=" + s + " aammjj=" + aammjj(n) + " / " + aammjj(s, j));
		d = 130114;
		n = nbj(d);
		j = js(d);
		s = nbs(d);
		System.out.println("nbj=" + n + " j=" + j + " nbs=" + s + " aammjj=" + aammjj(n) + " / " + aammjj(s, j));
		d = 140331;
		n = nbj(d);
		j = js(d);
		s = nbs(d);
		System.out.println("nbj=" + n + " j=" + j + " nbs=" + s + " aammjj=" + aammjj(n) + " / " + aammjj(s, j));

		System.out.println("nbj=" + n + " j=" + j + " nbs=" + s + " aammjj=" + aammjj(n) + " / " + aammjj(s - 2, 7));
	}
}
