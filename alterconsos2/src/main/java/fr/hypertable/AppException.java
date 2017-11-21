package fr.hypertable;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.UnsupportedEncodingException;

public class AppException extends Exception {

	private static final long serialVersionUID = 1L;

	private String msg;

	private boolean isBug = false;

	public boolean isBug() {
		return isBug;
	}

	public String getMessage() {
		return msg;
	}

	private void setT(Throwable t) {
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		PrintStream ps = new PrintStream(bos);
		ps.println(t.getMessage());
		t.printStackTrace(ps);
		String m = "";
		try {
			m = bos.toString("UTF-8");
		} catch (UnsupportedEncodingException e) {}
		msg = msg + "\n" + m;
	}

	public AppException(MF mf, Object... arguments) {
		super();
		msg = mf.format(arguments);
		if (msg.startsWith("BUG")) isBug = true;
	}

	public AppException(Throwable t, MF mf, Object... arguments) {
		super();
		msg = mf.format(arguments);
		if (msg.startsWith("BUG")) isBug = true;
		setT(t);
	}

}
