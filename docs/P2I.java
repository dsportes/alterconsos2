package fr.hypertable;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

import fr.alterconsos.AppConfig;
import fr.hypertable.AppTransaction.StatusPhase;

public class P2I  extends Operation {

	@Override public String mainLine() {
		return "D";
	}

	private static final String[] exts = {"jpg", "png", "pdf"} ;
	private static final String[] mimes = {"image/jpeg", "image/png", "application/pdf"} ;	
	
	private static String getMT(String arg){
		for(int i = 0; i < exts.length; i++)
			if (exts[i].equals(arg)) return mimes[i];
		return null;
	}
	
	@Override public StatusPhase phaseFaible() throws AppException {
		Count.t(HTServlet.appCfg.typeOf(this));

		String url = arg().getS("url", "?");
		String format = arg().getS("format", "?");
		String mt = getMT(format);
		if (url.equals("?") || mt == null)
			throw new AppException(MF.P2IARG, url, format);
		
		resultat.content = call_p2i(url, format);
		resultat.mime = mt;
		return StatusPhase.brut;
	}

	@Override public void phaseForte() throws AppException {}

	public static String api_url = "http://api.page2images.com/restfullink";

	public static String call_p2i(String url, String format) throws AppException {
		String apikey = AppConfig.page2images();
		// String url = "http://www.google.com";
		// device : 0 - iPhone4, 1 - iPhone5, 2 - Android, 3 - WinPhone, 4 - iPad, 5 -
		// Android Pad, 6 - Desktop
		// format: jpg png pdf
		String param = "p2i_url=" + url + "&p2i_key=" + apikey + 
				"&p2i_device=6&p2i_fullpage=1&p2i_size=800x0&p2i_imageformat=" + format;
		HttpURLConnection myurlcon = null;
		try {
			myurlcon = (HttpURLConnection) new URL(api_url).openConnection();
			myurlcon.setConnectTimeout(30000);
			myurlcon.setReadTimeout(30000);
			myurlcon.setDoOutput(true);
			myurlcon.setRequestMethod("POST");
			String strlength = new Integer(param.length()).toString();
			myurlcon.setRequestProperty("Content-length", strlength);
			myurlcon.connect();
			DataOutputStream out = new DataOutputStream(myurlcon.getOutputStream());
			out.writeBytes(param);
			out.flush();
			out.close();
			InputStream in = myurlcon.getInputStream();
			BufferedReader br = new BufferedReader(new InputStreamReader(in));
			StringBuffer data = new StringBuffer();
			String s = "";
			while ((s = br.readLine()) != null) {
				data.append(s);
			}
			in.close();
			myurlcon.disconnect();
			return data.toString();
		} catch (Exception e) {
			throw new AppException(e, MF.EXC);
		}
	}

}
