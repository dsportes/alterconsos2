package org.json.simple;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class AcJSONObject extends JSONObject implements Serializable {
	private static final long serialVersionUID = 6174200672125302538L;

	public String getType(){
		return getS("#TYPE#");
	}
	
	public void putType(String type){
		put("#TYPE#", type);
	}
	
	public int getVersion(){
		return getI("#VERSION#");
	}

	public void putVersion(int version){
		put("#VERSION#", version);
	}
	
	public AcJSONObject(){
		super();
	}
	
	@SuppressWarnings("unchecked")
	public void put(String key, String value){
		super.put(key, value);
	}

	@SuppressWarnings("unchecked")
	public void put(String key, long value){
		super.put(key, value);
	}

	@SuppressWarnings("unchecked")
	public void put(String key, int value){
		super.put(key, value);
	}

	@SuppressWarnings("unchecked")
	public void put(String key, boolean value){
		super.put(key, value);
	}

	@SuppressWarnings("unchecked")
	public void put(String key, AcJSONObject value){
		super.put(key, value);
	}
	
	@SuppressWarnings("unchecked")
	public void put(String key, AcJSONArray value){
		super.put(key, value);
	}

	public AcJSONObject getO(String arg){ return getO(arg, true); }

	public AcJSONObject getO(String arg, boolean empty){
		Object v = get(arg);
		if (v == null)
			return empty ? new AcJSONObject() : null;
		try { return (AcJSONObject)v;} catch (Exception e) { 
			return empty ? new AcJSONObject() : null ;
		}
	}

	public AcJSONArray getA(String arg){ return getA(arg, true);}

	public AcJSONArray getA(String arg, boolean empty){
		Object v = get(arg);
		if (v == null)
			return empty ? new AcJSONArray() : null;
		try { return (AcJSONArray)v;} catch (Exception e) { 
			return empty ? new AcJSONArray() : null; 
		}
	}

	public List<Integer> getLI(String arg, boolean empty, int def){
		Object v = get(arg);
		if (v == null)
			return empty ? new ArrayList<Integer>() : null;
		try {
			List<Integer> lst = new ArrayList<Integer>();
			AcJSONArray a = (AcJSONArray)v;
			for (int i = 0; i < a.size(); i++) {
				int s = a.getI(i, def);
				lst.add(s);
			}
			return lst;
			} catch (Exception e) { 
			return new ArrayList<Integer>(); 
		}
	}

	public String getS(String arg){ return getS(arg, "");}

	public String getS(String arg, String def){
		Object v = get(arg);
		if (v == null){
//			if (!this.containsKey(arg))
				return def;
//			else
//				return null;
		}
		try { return (String)v;} catch (Exception e) { return def; }
	}

	public long getL(String arg){ return getL(arg, 0L); }

	public long getL(String arg, long def){
		Object v = get(arg);
		if (v == null)
			return def;
		try { return (Long)v;} catch (Exception e) { return def; }
	}

	public int getI(String arg){ return getI(arg, 0);}

	public int getI(String arg, int def){
		Object v = get(arg);
		if (v == null)
			return def;
		try { return ((Long)v).intValue();} catch (Exception e) { return def; }
	}

	public boolean getB(String arg){
		Object v = get(arg);
		if (v == null)
			return false ;
		try { return (Boolean)v;} catch (Exception e) { return false; }
	}

	public boolean has(String arg){
		return get(arg) != null;
	}
	
	@SuppressWarnings("unchecked")
	public String[] keys(){
		@SuppressWarnings("rawtypes")
		Set s = this.keySet();
		if (s.isEmpty()) 
			return new String[0];
		else
			return (String[])s.toArray(new String[s.size()]);
	}
	
}
