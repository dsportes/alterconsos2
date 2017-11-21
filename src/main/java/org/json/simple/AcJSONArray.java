package org.json.simple;

public class AcJSONArray extends JSONArray {
	
	public AcJSONArray(){
		super();
	}

	public AcJSONObject getO(int arg){
		Object v = get(arg);
		if (v == null)
			return new AcJSONObject();
		try { return (AcJSONObject)v;} catch (Exception e) { return new AcJSONObject(); }
	}

	public AcJSONArray getA(int arg){
		Object v = get(arg);
		if (v == null)
			return new AcJSONArray();
		try { return (AcJSONArray)v;} catch (Exception e) { return new AcJSONArray(); }
	}

	public String getS(int arg){ return getS(arg, "");}

	public String getS(int arg, String def){
		Object v = get(arg);
		if (v == null)
			return def;
		try { return (String)v;} catch (Exception e) { return def; }
	}

	public long getL(int arg){ return getL(arg, 0);}

	public long getL(int arg, long def){
		Object v = get(arg);
		if (v == null)
			return def;
		try { return (Long)v;} catch (Exception e) { return def; }
	}

	public double getD(int arg){ return getD(arg, 0);}

	public double getD(int arg, double def){
		Object v = get(arg);
		if (v == null)
			return def;
		try { return (Long)v;} catch (Exception e) { return def; }
	}

	public int getI(int arg){ return getI(arg, 0);}

	public int getI(int arg, int def){
		Object v = get(arg);
		if (v == null)
			return def;
		try { return ((Long)v).intValue();} catch (Exception e) { return def; }
	}
	
	public boolean getB(int arg){
		Object v = get(arg);
		if (v == null)
			return false ;
		try { return (Boolean)v;} catch (Exception e) { return false; }
	}

	/**
	 * 
	 */
	private static final long serialVersionUID = -194073442048181324L;

}
