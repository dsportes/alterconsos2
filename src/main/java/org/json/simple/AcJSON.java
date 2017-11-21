package org.json.simple;

import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.List;
import java.util.Map;

import org.json.simple.parser.ContainerFactory;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

public class AcJSON implements ContainerFactory {
	public static final AcJSON factory = new AcJSON();

	@SuppressWarnings("rawtypes")
	public static Map parseObject(String s, ContainerFactory factory) {
		try{
			return (Map)new JSONParser().parse(new StringReader(s), factory);
		}
		catch(IOException e){
			return factory.createObjectContainer();
		} catch (ParseException e) {
			return factory.createObjectContainer();
		}
	}
	
	public static AcJSONObject parseObjectEx(Reader in) throws ParseException {
		try{
			JSONParser parser = new JSONParser();
			return (AcJSONObject)parser.parse(in, factory);
		}
		catch(IOException e){
			return new AcJSONObject();
		}
	}

	public static AcJSONObject parseObject(Reader in) {
		try{
			JSONParser parser = new JSONParser();
			return (AcJSONObject)parser.parse(in, factory);
		}
		catch(IOException e){
			return new AcJSONObject();
		} catch (ParseException e) {
			return new AcJSONObject();
		}
	}

	public static AcJSONObject parseObjectEx(String s) throws ParseException {
		StringReader in=new StringReader(s);
		return (AcJSONObject)parseObject(in);
	}

	public static AcJSONObject parseObject(String s) {
		return (AcJSONObject)parseObject(new StringReader(s));
	}

	public static AcJSONArray parseArray(Reader in) throws ParseException {
		try{
			JSONParser parser = new JSONParser();
			return (AcJSONArray)parser.parse(in, factory);
		}
		catch(IOException e){
			return new AcJSONArray();
		}
	}
	
	public static AcJSONArray parseArray(String s) throws ParseException {
		StringReader in=new StringReader(s);
		return (AcJSONArray)parseArray(in);
	}

	public static String JSON2String(Object value) {
		try {
			StringWriter out = new StringWriter();
			JSONValue.writeJSONString(value, out);
			return out.toString();
		} catch (IOException e){
			return "";
		}
	}
	
	@SuppressWarnings("rawtypes")
	@Override
	public Map createObjectContainer() {
		return new AcJSONObject();
	}

	@SuppressWarnings("rawtypes")
	@Override
	public List creatArrayContainer() {
		return new AcJSONArray();
	}

	public static StringBuffer escape(String s, StringBuffer sb){
		JSONValue.escape(s, sb);
		return sb;
	}
}
