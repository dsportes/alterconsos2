package fr.hypertable;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.reflect.AccessibleObject;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Type;
import java.nio.charset.Charset;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Locale;
import java.util.Map.Entry;
import java.util.Set;
import java.util.TimeZone;

import org.json.simple.AcJSON;
import org.json.simple.AcJSONArray;
import org.json.simple.AcJSONObject;

import com.Ostermiller.util.Base64;

import fr.hypertable.Cell.CellNode;

public class CellDescr {

	public static final Charset utf8 = Charset.forName("UTF-8");

	private static final SimpleDateFormat sdf1 = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss",
			Locale.FRANCE);
	private static final TimeZone timezone = TimeZone.getTimeZone("Europe/Paris");

	static {
		sdf1.setTimeZone(timezone);
	}

	private static final Class<?> cellNodeClass = Cell.CellNode.class;

	private static final HashMap<Class<?>, CellDescr> descriptors = new HashMap<Class<?>, CellDescr>();

	public static CellDescr getCellDescr(Class<?> clazz) {
		return descriptors.get(clazz);
	}

	private static final HashMap<String, CellDescr> descriptors2 = new HashMap<String, CellDescr>();

	public static CellDescr getCellDescr(String name) {
		return descriptors2.get(name);
	}

	private static Field[] getAllField(Class<?> clazz, Class<?> rootClazz) {
		ArrayList<Field> af = new ArrayList<Field>();
		Class<?> c = clazz;
		while (true) {
			if (c == Object.class) break;
			Field[] fs = c.getDeclaredFields();
			if (fs != null)
				for (Field f : fs)
					if (f.getAnnotation(HT.class) != null || f.getName().equals("version")
							|| f.getName().equals("model")) af.add(f);
			if (c == rootClazz) break;
			c = (Class<?>) c.getGenericSuperclass();
			if (c == null && rootClazz != null) {
				String m = "CellDescr : class [" + clazz.getSimpleName() + "] not extending "
						+ rootClazz.getSimpleName();
				throw new IllegalArgumentException(m);
			}
		}
		Field[] fx = af.toArray(new Field[af.size()]);
		AccessibleObject.setAccessible(fx, true);
		return fx;
	}

	private Class<?> clazz;

	public Class<?> getCellClass() {
		return clazz;
	}
	
	private Class<?> rootClazz;

	private String name;

	public String getName() {
		return name;
	}

	private Constructor<?> constructor;

	public Cell newCell() {
		try {
			Object[] args = new Object[0];
			return (Cell) constructor.newInstance(args);
		} catch (Exception ex) {
			return null;
		}
	}

	private ArrayList<NodeDescr> nodeDescrs = new ArrayList<NodeDescr>();

	public void populateArrays(Cell.CellNode cellNode) {
		if (cellNode == null) return;
		NodeDescr nd = getNodeDescr(cellNode.getClass());
		if (nd != null) nd.populateArrays(cellNode);
	}

	public Cell.CellNode newCellNode(Cell cell, String nodeType) throws AppException {
		if (nodeType == null || cell == null)
			throw new AppException(MF.REFLECT,
					"cellNodeFactory() invoked without nodeType or cell parameter");
		NodeDescr nd = getNodeDescr(nodeType);
		if (nd == null)
			throw new AppException(MF.REFLECT, "newCellNode() invoked with unknown nodeType ["
					+ nodeType + "] cell class :[" + cell.getClass().getName() + "]");
		Cell.CellNode cn = nd.newCellNode(cell);
		if (cn == null)
			throw new AppException(MF.REFLECT, "newCellNode() invoked on [" + nodeType
					+ "] cell class :[" + cell.getClass().getName() + "], instantiation failed");
		nd.populateArrays(cn);
		return cn;
	}

	private NodeDescr getNodeDescr(String nodeType) {
		for (NodeDescr nd : nodeDescrs) {
			if (nd.name.equals(nodeType)) return nd;
		}
		return null;
	}

	public String singleKey(Class<?> clazz) {
		NodeDescr nd = getNodeDescr(clazz);
		return nd == null ? null : nd.singleKey;
	}

	private NodeDescr getNodeDescr(Class<?> clazz) {
		for (NodeDescr nd : nodeDescrs) {
			if (nd.clazz == clazz) return nd;
		}
		return null;
	}

	private String ed(String msg) {
		return "CellDescr : class:[" + clazz.getName() + "], " + msg;
	}

	private NodeDescr addNodeDescr(Class<?> clazz) {
		NodeDescr nd = new NodeDescr();
		for (NodeDescr n : nodeDescrs) {
			if (n.clazz == clazz) nd = n;
		}
		nd.name = clazz.getSimpleName();
		nd.clazz = clazz;

		try {
			nd.constructor = clazz.getConstructor(CellDescr.this.clazz);
			nd.constructor.setAccessible(true);
		} catch (Exception ex) {
			String m = "CellDescr : class [" + clazz.getSimpleName() + "] constructor not found";
			throw new IllegalArgumentException(m);
		}

		HTCN annot = clazz.getAnnotation(HTCN.class);
		if (annot == null) {
			String m = "CellDescr : class [" + clazz.getSimpleName() + "] HTCN annotation missing";
			throw new IllegalArgumentException(m);
		}

		int id = annot.id();
		if (id <= 0 || id >= 99) {
			String m = "CellDescr : class [" + clazz.getSimpleName() + "] HTCN(" + id
					+ ") - id must be between 1 and 99";
			throw new IllegalArgumentException(m);
		}
		nd.id = (byte) id;

		nd.persist = annot.persist();
		if (getNodeDescr(nd.id) != null) {
			String m = "CellDescr : class [" + clazz.getSimpleName() + "] duplicated HTCN(" + nd.id
					+ ")";
			throw new IllegalArgumentException(m);
		}

		char c = annot.single();
		if (c == '\u0000')
			nd.singleKey = null;
		else nd.singleKey = "" + c;

		int mod = annot.model();
		if (mod < 0 || mod > 9999) {
			String m = "CellDescr : class [" + clazz.getSimpleName() + "] HTCN(" + mod
					+ ") - model must be between 0 (default) and 9999";
			throw new IllegalArgumentException(m);
		}
		nd.model = mod;

		Field[] af = getAllField(clazz, rootClazz);
		if (af.length < 2) err(4, 0, null, null);
		int nbf = 0;
		for (Field field : af) {
			if (field.getName().equals("version"))
				nd.versionField = field;
			else if (field.getName().equals("model")) {
				NodeDescr.FieldDescr fd = nd.new FieldDescr();
				fd.id = 99;
				fd.persist = true;
				fd.name = field.getName();
				fd.type = 1;
				fd.field = field;
				nd.fieldDescrs[fd.id] = fd;
				nbf++;
			} else {
				NodeDescr.FieldDescr fd = nd.addFieldDescr(field);
				if (fd != null) {
					nd.fieldDescrs[fd.id] = fd;
					nbf++;
				}
			}
		}
		nd.fieldIds = new int[nbf];
		nd.allFields = new NodeDescr.FieldDescr[nbf];
		nbf = 0;
		for (int i = 0; i < nd.fieldDescrs.length; i++) {
			NodeDescr.FieldDescr fd = nd.fieldDescrs[i];
			if (fd != null) {
				nd.fieldIds[nbf] = fd.id;
				nd.allFields[nbf] = fd;
				nbf++;
			}
		}

		nodeDescrs.add(nd);
		return nd;
	}

	private void err(int id, int code, Field f, Field f2) {
		String m = "Invalid Cell Description : ";
		switch (id) {
		case 1: {
			m = m + "incorrect value code (1-98) -" + ed(f, code);
			break;
		}
		case 2: {
			m = m + "code allocated twice: 1)" + ed(f, code) + " 2)" + ed(f2, code);
			break;
		}
		case 3: {
			m = m + "field class not managed -" + ed(f, code);
			break;
		}
		case 4: {
			m = m + "no one field to manage has been found in the class ["
					+ this.clazz.getSimpleName() + "]";
			break;
		}
		default:
			m = m + " some error in " + ed(f, code);
		}
		throw new IllegalArgumentException(m);
	}

	private String ed(Field f, int code) {
		return " Class:[" + f.getDeclaringClass().getSimpleName() + "], Field:[" + f.getName()
				+ "], code:[" + code + "] ";
	}

	private NodeDescr getNodeDescr(int id) {
		for (NodeDescr nd : nodeDescrs) {
			if (nd.id == id) return nd;
		}
		return null;
	}

	/**
	 * Remplit les cellNodes d'une cell depuis la serialisation contenue dans
	 * bytes. Les cellNodes ont toutes leurs arrays vides ou pleines (mais
	 * prêtes) et sont insérées dans l'arbre.<br>
	 * N'est pas compilé, c'est une simple restauration.
	 * 
	 * @param target
	 * @param bytes
	 * @throws AppException
	 */
	public void read(Cell target, byte[] bytes) throws AppException {
		if (target == null || bytes == null || bytes.length == 0) return;
		try {
			ByteArrayInputStream bis = new ByteArrayInputStream(bytes);
			DataInputStream in = new DataInputStream(bis);
			while (true) {
				int token = in.readShort();
				if (token == 0) return;
				int code = token % 1000;
				NodeDescr nd = getNodeDescr(code);
				Cell.CellNode cn = nd == null ? null : nd.newCellNode(target);
				read(in, cn, nd);
				if (cn != null) {
					String singleKey = nd == null ? null : nd.singleKey;
					if (singleKey != null) {
						target.tree().put(singleKey, cn);
					} else {
						String[] keys = cn.keys();
						if (keys != null && keys.length != 0) for (String k : keys)
							if (k != null) target.tree().put(k, cn);
					}
				}
			}
		} catch (Exception e) {
			throw new AppException(e, MF.REFLECT, this.getClass().getSimpleName());
		}

	}

	public ArrayList<IW> read(Object owner, byte[] bytes) throws AppException {
		ArrayList<IW> res = new ArrayList<IW>();
		if (bytes == null || bytes.length == 0) return res;
		try {
			ByteArrayInputStream bis = new ByteArrayInputStream(bytes);
			DataInputStream in = new DataInputStream(bis);
			while (true) {
				int token = in.readShort();
				if (token == 0) return res;
				int code = token % 1000;
				NodeDescr nd = getNodeDescr(code);
				IW cn = nd == null ? null : nd.newICellNode(owner);
				read(in, cn, nd);
				if (cn != null) 
					res.add(cn);
			}
		} catch (Exception e) {
			throw new AppException(e, MF.REFLECT, this.getClass().getSimpleName());
		}

	}

	/**
	 * Retourne la sérialisation d'une cell et de ses cellNodes.
	 * 
	 * @param target
	 * @return
	 * @throws AppException
	 */
	public byte[] serialize(Cell target) throws AppException {
		if (target == null) return new byte[0];
		try {
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			DataOutputStream out = new DataOutputStream(bos);
			Set<Cell.CellNode> a = target.allNodes();
			for (Cell.CellNode cn : a) {
				CellDescr.NodeDescr nd = getNodeDescr(cn.getClass());
				if (nd != null) nd.serialize(out, cn);
			}
			out.writeShort(0);
			return bos.toByteArray();
		} catch (Exception e) {
			throw new AppException(e, MF.REFLECT, this.getClass().getSimpleName());
		}
	}

	public byte[] serialize(Collection<IW> a) throws AppException {
		if (a == null || a.isEmpty()) return new byte[0];
		try {
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			DataOutputStream out = new DataOutputStream(bos);
			for (IW cn : a) {
				CellDescr.NodeDescr nd = getNodeDescr(cn.getClass());
				if (nd != null) nd.serialize(out, cn);
			}
			out.writeShort(0);
			return bos.toByteArray();
		} catch (Exception e) {
			throw new AppException(e, MF.REFLECT, this.getClass().getSimpleName());
		}
	}

	public void serial(AcJSONObject json, Serial serial) throws IOException {
		serial.count1 = 0;
		serial.count2 = 0;
		serial.version = 0;
		serial.bytes = new byte[0];
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		DataOutputStream out = new DataOutputStream(bos);
		@SuppressWarnings({ "rawtypes", "unchecked" }) Set<Entry> entries = json.entrySet();
		for (@SuppressWarnings("rawtypes") Entry entry : entries) {
			String nodeType = (String) entry.getKey();
			NodeDescr nd = getNodeDescr(nodeType);
			if (nd == null) continue;
			long v = 0;
			if (nd.singleKey != null) {
				try {
					AcJSONObject node = (AcJSONObject) entry.getValue();
					if (node != null && (v = nd.serialNode(out, node)) != 0) {
						if (v > serial.version) serial.version = v;
						serial.count1++;
						serial.count2++;
					}
				} catch (Exception e) {}
			} else {
				try {
					AcJSONArray nodes = (AcJSONArray) entry.getValue();
					boolean hasNodes = false;
					for (Object obj : nodes) {
						AcJSONObject node = (AcJSONObject) obj;
						v = 0;
						if (node != null && (v = nd.serialNode(out, node)) != 0) {
							hasNodes = true;
							if (v > serial.version) serial.version = v;
							serial.count2++;
						}
					}
					if (hasNodes) serial.count1++;
				} catch (Exception e) {}
			}
		}
		if (serial.count2 != 0) try {
			out.writeShort(0);
		} catch (IOException e) {}
		out.flush();
		serial.bytes = bos.toByteArray();
	}


	/**
	 * Enregistrement du descriptif de la cell et de ses cellNodes.
	 * 
	 * @param clazz
	 */
	public CellDescr(Class<?> clazz) {
		this.clazz = clazz;
		this.name = clazz.getSimpleName();
		if (Cell.class.isAssignableFrom(clazz))
			this.rootClazz = Cell.CellNode.class;
		
		CellDescr cd = getCellDescr(clazz);
		if (cd != null) {
			String m = "Duplicated cell class";
			throw new IllegalArgumentException(ed(m));
		}
		cd = getCellDescr(this.name);
		if (cd != null) {
			String m = "Duplicated cell class simple name";
			throw new IllegalArgumentException(ed(m));
		}

		descriptors.put(this.clazz, this);
		descriptors2.put(this.name, this);

		try {
			constructor = clazz.getConstructor();
			constructor.setAccessible(true);
		} catch (Exception ex) {
			String m = "CellDescr : class [" + clazz.getSimpleName() + "] constructor not found";
			throw new IllegalArgumentException(m);
		}

		Field field;
		int mod = 0;
		try {
			field = clazz.getDeclaredField("cellDescr");
			mod = field.getModifiers();
			if (Modifier.isStatic(mod) && Modifier.isFinal(mod) && Modifier.isPublic(mod)) {
				if (field.getGenericType() != CellDescr.class) {
					String m = "Static field cellDescr must be static public final for the class ["
							+ this.name + "]";
					throw new IllegalArgumentException(m);
				}
			}
		} catch (Exception e) {
			String m = "Static field cellDescr must be static public final for the class ["
					+ this.name + "]";
			throw new IllegalArgumentException(m);
		}

		Method met = null;
		try {
			met = clazz.getDeclaredMethod("cellDescr", new Class<?>[0]);
			met.setAccessible(true);
		} catch (Exception x) {
			String m = "CellDescr : class [" + clazz.getSimpleName() + "] "
					+ "must have a public method returning cellDresr";
			throw new IllegalArgumentException(m);
		}
		Class<?> cx = met.getReturnType();
		if (cx != CellDescr.class) {
			String m = "CellDescr : class [" + clazz.getSimpleName() + "] "
					+ "must have a public method returning cellDresr";
			throw new IllegalArgumentException(m);
		}
		mod = met.getModifiers();
		if (!(!Modifier.isStatic(mod) && Modifier.isPublic(mod))) {
			String m = "CellDescr : class [" + clazz.getSimpleName() + "] "
					+ "must have a public method returning cellDresr";
			throw new IllegalArgumentException(m);
		}

		Class<?>[] classes = clazz.getDeclaredClasses();
		// Class<?>[] classes = clazz.getClasses(); && c != cellNodeClass && c
		// != cellIndexClass
		for (Class<?> c : classes) {
			boolean b1 = cellNodeClass.isAssignableFrom(c);
			if (c.getAnnotations().length != 0 && (rootClazz == null || b1)) {
				addNodeDescr(c);
			}
		}
	}

	private void read(DataInputStream in, IW target, NodeDescr nd) throws IOException,
			IllegalArgumentException, IllegalAccessException, InstantiationException,
			InvocationTargetException {
		long version = in.readLong();
		if (nd != null) {
			nd.versionField.set(target, version);
			nd.populateArrays(target);
		}
		while (true) {
			int token = in.readShort();
			if (token == 0) return;
			int type = token / 1000;
			int code = token % 1000;
			NodeDescr.FieldDescr fd = (nd == null) ? null : nd.getFieldDescr(code);
			// Field field = (fd == null || type != fd.type) ? null : fd.field;
			Field field = null;
			int type2 = 0;
			if (fd != null) {
				type2 = fd.type;
				if ((type == fd.type) || (type == 1 && (type2 == 2 || type2 == 3))
						|| (type == 2 && type2 == 3)) field = fd.field;
			}
			read(in, target, field, type, type2);
		}
	}

	private void read(DataInputStream in, IW target, Field field, int type, int type2)
			throws IOException, IllegalArgumentException, IllegalAccessException,
			InstantiationException, InvocationTargetException {
		boolean skip = field == null;
		switch (type) {
		case 1: { // short
			short x = in.readShort();
			if (!skip) {
				if (type2 == 1)
					field.setShort(target, x);
				else if (type2 == 2)
					field.setInt(target, x);
				else field.setLong(target, x);
			}
			break;
		}
		case 2: { // int
			int x = in.readInt();
			if (!skip) {
				if (type2 == 2)
					field.setInt(target, x);
				else field.setLong(target, x);
			}
			break;
		}
		case 3: { // long
			long x = in.readLong();
			if (!skip) {
				field.setLong(target, x);
			}
			break;
		}
		case 4: { // double
			double x = in.readDouble();
			if (!skip) field.setDouble(target, x);
			break;
		}
		case 5: { // String
			String x = new String(readBytes(in), utf8);
			if (!skip) field.set(target, x);
			break;
		}
		case 6: { // byte[]
			byte[] x = readBytes(in);
			if (!skip) field.set(target, x);
			break;
		}
		case 7: { // ArrayShort
			ArrayShort a = !skip ? (ArrayShort) field.get(target) : new ArrayShort();
			read(in, a);
			break;
		}
		case 8: { // ArrayInt
			ArrayInt a = !skip ? (ArrayInt) field.get(target) : new ArrayInt();
			read(in, a);
			break;
		}
		case 9: { // ArrayLong
			ArrayLong a = !skip ? (ArrayLong) field.get(target) : new ArrayLong();
			read(in, a);
			break;
		}
		case 10: { // ArrayDouble
			ArrayDouble a = !skip ? (ArrayDouble) field.get(target) : new ArrayDouble();
			read(in, a);
			break;
		}
		case 11: { // ArrayString
			ArrayString a = !skip ? (ArrayString) field.get(target) : new ArrayString();
			read(in, a);
			break;
		}
		}
	}

	private void read(DataInputStream in, ArrayShort a) throws IOException {
		int lx = in.readUnsignedByte();
		boolean var = (lx / 128) == 1;
		int l = lx % 128;
		if (l == 126) {
			l = in.readUnsignedShort();
		} else if (l == 127) {
			l = in.readInt();
		}
		for (int i = 0; i < l; i++) {
			short x = 0;
			if (!var)
				x = in.readShort();
			else {
				byte t = in.readByte();
				if (t == 1)
					x = in.readByte();
				else if (t == 2)
					x = in.readShort();
				else if (t == 4)
					in.readInt();
				else in.readLong();
			}
			a.add(x);
		}
	}

	private void read(DataInputStream in, ArrayInt a) throws IOException {
		int lx = in.readUnsignedByte();
		boolean var = (lx / 128) == 1;
		int l = lx % 128;
		if (l == 126) {
			l = in.readUnsignedShort();
		} else if (l == 127) {
			l = in.readInt();
		}
		for (int i = 0; i < l; i++) {
			int x = 0;
			if (!var)
				x = in.readInt();
			else {
				byte t = in.readByte();
				if (t == 1)
					x = in.readByte();
				else if (t == 2)
					x = in.readShort();
				else if (t == 4)
					x = in.readInt();
				else in.readLong();
			}
			a.add(x);
		}
	}

	private void read(DataInputStream in, ArrayLong a) throws IOException {
		int lx = in.readUnsignedByte();
		boolean var = (lx / 128) == 1;
		int l = lx % 128;
		if (l == 126) {
			l = in.readUnsignedShort();
		} else if (l == 127) {
			l = in.readInt();
		}
		for (int i = 0; i < l; i++) {
			long x = 0;
			if (!var)
				x = in.readInt();
			else {
				byte t = in.readByte();
				if (t == 1)
					x = in.readByte();
				else if (t == 2)
					x = in.readShort();
				else if (t == 4)
					x = in.readInt();
				else x = in.readLong();
			}
			a.add(x);
		}
	}

	private void read(DataInputStream in, ArrayDouble a) throws IOException {
		int l = in.readUnsignedByte();
		if (l == 254) {
			l = in.readUnsignedShort();
		} else if (l == 255) {
			l = in.readInt();
		}
		for (int i = 0; i < l; i++)
			a.add(in.readDouble());
	}

	private void read(DataInputStream in, ArrayString a) throws IOException {
		int l = in.readUnsignedByte();
		if (l == 254) {
			l = in.readUnsignedShort();
		} else if (l == 255) {
			l = in.readInt();
		}
		for (int i = 0; i < l; i++)
			a.add(new String(readBytes(in), utf8));
	}

	private byte[] readBytes(DataInputStream in) throws IOException {
		int l = in.readUnsignedByte();
		byte[] b;
		if (l == 254) {
			l = in.readUnsignedShort();
		} else if (l == 255) {
			l = in.readInt();
		}
		b = new byte[l];
		in.read(b, 0, l);
		return b;
	}

	public StringBuffer toJSON(StringBuffer sb, Cell target, String[] filterKeys,
			long filterVersion, String filterArg, boolean isAdmin) throws IllegalArgumentException,
			IllegalAccessException {
		if (sb == null) sb = new StringBuffer();
		if (target == null) return sb;
		AppTransaction tr = AppTransaction.tr(); 

		// CellNodes
		HashMap<String, ArrayList<String>> allCns = new HashMap<String, ArrayList<String>>();
		HashMap<String, HashSet<CellNode>> allCno = new HashMap<String, HashSet<CellNode>>();

		if (filterKeys == null) filterKeys = new String[0];

		for (String filter : filterKeys) {
			if (filter == null || filter.length() < 2) continue;
			boolean incr = filter.charAt(1) != '*';
			boolean eq = filter.charAt(0) != '*';
			String filterKey1 = filter.substring(2);

			Collection<CellNode> nodes;
			if (!eq)
				nodes = target.tree().subMap(filterKey1, filterKey1 + '\uFFFF').values();
			else {
				CellNode y = target.tree().get(filterKey1);
				nodes = new LinkedList<CellNode>();
				if (y != null) nodes.add(y);
			}

			for (CellNode cnx : nodes) {
				if (incr && cnx.version() <= filterVersion) continue;
				String name = cnx.getClass().getSimpleName();

				HashSet<CellNode> ao = allCno.get(name);
				if (ao != null && ao.contains(cnx)) continue;
				NodeDescr nd = getNodeDescr(cnx.getClass());
				String s = nd.toJSON(cnx, isAdmin, cnx.jsonFields(tr, filterArg));
				if (s == null || s.length() == 0) continue;
				ArrayList<String> as = allCns.get(name);
				if (as == null) {
					as = new ArrayList<String>();
					allCns.put(name, as);
				}
				if (ao == null) {
					ao = new HashSet<CellNode>();
					allCno.put(name, ao);
				}
				as.add(s);
				ao.add(cnx);
			}
		}

		boolean first = true;
		sb.append("{");
		for (String name : allCns.keySet()) {
			ArrayList<String> as = allCns.get(name);
			if (first) {
				first = false;
			} else sb.append(",\n\n");
			boolean first3 = true;

			NodeDescr nd = getNodeDescr(name);
			boolean single = nd != null && nd.singleKey != null;

			if (single && as.size() != 0) {
				sb.append("\"");
				AcJSON.escape(name, sb);
				sb.append("\":");
				String js = as.get(0);
				sb.append(js);
			} else {
				sb.append("\"");
				AcJSON.escape(name, sb);
				sb.append("\":[");

				for (String js : as) {
					if (first3) {
						first3 = false;
					} else sb.append(",\n");
					sb.append(js);
				}

				sb.append("]");
			}
		}
		sb.append("}\n");
		return sb;
	}

	public StringBuffer toJSON(StringBuffer sb, Collection<IW> nodes) throws IllegalArgumentException,
			IllegalAccessException {
		if (sb == null) sb = new StringBuffer();
		if (nodes == null || nodes.isEmpty()) {
			sb.append("{}");
			return sb;
		}
		HashMap<String, ArrayList<String>> allCns = new HashMap<String, ArrayList<String>>();
			for (IW cnx : nodes) {
				String name = cnx.getClass().getSimpleName();
				NodeDescr nd = getNodeDescr(cnx.getClass());
				String s = nd.toJSON(cnx, true, null);
				ArrayList<String> as = allCns.get(name);
				if (as == null) {
					as = new ArrayList<String>();
					allCns.put(name, as);
				}
				as.add(s);
		}

		boolean first = true;
		sb.append("{");
		for (String name : allCns.keySet()) {
			ArrayList<String> as = allCns.get(name);
			if (first) {
				first = false;
			} else sb.append(",\n");
			boolean first3 = true;

			NodeDescr nd = getNodeDescr(name);
			boolean single = nd != null && nd.singleKey != null;

			if (single && as.size() != 0) {
				sb.append("\"");
				AcJSON.escape(name, sb);
				sb.append("\":");
				String js = as.get(0);
				sb.append(js);
			} else {
				sb.append("\"");
				AcJSON.escape(name, sb);
				sb.append("\":[");

				for (String js : as) {
					if (first3) {
						first3 = false;
					} else sb.append(",\n");
					sb.append(js);
				}

				sb.append("]");
			}
		}
		sb.append("}\n");
		return sb;
	}

	private class NodeDescr {
		private Class<?> clazz;
		private Field versionField;
		private String name;
		private byte id;
		private FieldDescr[] fieldDescrs = new FieldDescr[100];
		private FieldDescr[] allFields;
		private int[] fieldIds;
		private Constructor<?> constructor;
		private boolean persist;
		private String singleKey;
		private int model;

		private Cell.CellNode newCellNode(Cell parent) {
			try {
				Object[] args = new Object[1];
				args[0] = parent;
				return (Cell.CellNode) constructor.newInstance(args);
			} catch (Exception ex) {
				return null;
			}
		}

		private IW newICellNode(Object parent) {
			try {
				Object[] args = new Object[1];
				args[0] = parent;
				return (IW) constructor.newInstance(args);
			} catch (Exception ex) {
				return null;
			}
		}

		private long serialNode(DataOutputStream out, AcJSONObject node) throws IOException {
			if (node == null) return 0;
			boolean first = true;
			long version = node.getL("version", 0L);
			if (version == 0) return 0;
			for (NodeDescr.FieldDescr fd : allFields) {
				if (!fd.persist) continue;
				Object value = node.get(fd.name);
				if (value != null) {
					if (first) first = serialFirst(out, version);
					fd.writeObj(out, value);
				}
			}
			if (!first) {
				out.writeShort(0);
				return version;
			} else return 0;
		}

		private boolean serialFirst(DataOutputStream out, long version) throws IOException {
			int token = 12000 + id;
			out.writeShort(token);
			out.writeLong(version);
			return false;
		}

		private FieldDescr getFieldDescr(int code) {
			if (code >= 1 && code <= 99) return fieldDescrs[code];
			return null;
		}

		private FieldDescr addFieldDescr(Field field) {
			String name = field.getName();
			HT annot = field.getAnnotation(HT.class);
			if (annot == null) return null;
			FieldDescr fd = new FieldDescr();
			fd.id = annot.id();
			if (fd.id <= 0 || fd.id >= 99) err(1, fd.id, field, null);
			FieldDescr fd2 = fieldDescrs[fd.id];
			if (fd2 != null) err(2, fd.id, field, fd2.field);
			fd.persist = annot.persist();
			fd.hidden = annot.hidden();
			fd.name = name;
			fd.field = field;
			Type type = field.getGenericType();
			if (type == short.class)
				fd.type = 1;
			else if (type == int.class)
				fd.type = 2;
			else if (type == long.class)
				fd.type = 3;
			else if (type == double.class)
				fd.type = 4;
			else if (type == String.class)
				fd.type = 5;
			else if (type == byte[].class)
				fd.type = 6;
			else if (type == ArrayShort.class)
				fd.type = 7;
			else if (type == ArrayInt.class)
				fd.type = 8;
			else if (type == ArrayLong.class)
				fd.type = 9;
			else if (type == ArrayDouble.class)
				fd.type = 10;
			else if (type == ArrayString.class)
				fd.type = 11;
			else err(3, fd.id, field, null);
			return fd;
		}

		private void populateArrays(IW cellNode) {
			try {
				for (FieldDescr fd : allFields) {
					if (fd.type >= 7 && fd.type <= 11) {
						Object obj = fd.field.get(cellNode);
						if (obj != null) continue;
					}
					switch (fd.type) {
					case 7: { // ArrayShort
						fd.field.set(cellNode, new ArrayShort().setW(cellNode));
						break;
					}
					case 8: { // ArrayInt
						fd.field.set(cellNode, new ArrayInt().setW(cellNode));
						break;
					}
					case 9: { // ArrayLong
						fd.field.set(cellNode, new ArrayLong().setW(cellNode));
						break;
					}
					case 10: { // ArrayDouble
						fd.field.set(cellNode, new ArrayDouble().setW(cellNode));
						break;
					}
					case 11: { // ArrayString
						fd.field.set(cellNode, new ArrayString().setW(cellNode));
						break;
					}
					}
				}
			} catch (Exception ex) {
				throw new IllegalArgumentException(ex);
			}
		}

		private void serialize(DataOutputStream out, Object target) throws IOException,
				IllegalArgumentException, IllegalAccessException {
			if (!persist) return;
			int token = 12000 + id;
			out.writeShort(token);
			out.writeLong(versionField.getLong(target));
			for (NodeDescr.FieldDescr fd : allFields) {
				if (!fd.persist) continue;
				fd.write(out, target);
			}
			out.writeShort(0);
		}

		private String toJSON(Object target, boolean admin, int[] fields)
				throws IllegalArgumentException, IllegalAccessException {
			if (target == null) return "";
			int[] fieldsIds = fields;
			if (fieldsIds == null) fieldsIds = fieldIds;
			if (fieldsIds.length == 0) return "";

			StringBuffer sb = new StringBuffer();

			boolean first2 = true;

			long l = versionField.getLong(target);
			sb.append("{\"version\":");
			sb.append(l);
			sb.append(", \"versionDH\":\"");
			sb.append(sdf1.format(new Date(l)));
			sb.append("\"");

			for (int j = 0; j < fieldsIds.length; j++) {
				int fid = fieldsIds[j];
				FieldDescr fd = getFieldDescr(fid);
				if (fd == null) continue;

				short val1 = 0;
				int val2 = 0;
				long val3 = 0;
				double val4 = 0;
				Object value = null;
				ArrayObject<?> a = null;
				boolean hasVal = false;

				if (fd.type >= 7) {
					a = (ArrayObject<?>) fd.field.get(target);
					if (a != null && a.size() != 0) hasVal = true;
				} else {
					switch (fd.type) {
					case 1: { // short
						val1 = fd.field.getShort(target);
						hasVal = val1 != 0;
						break;
					}
					case 2: { // int
						val2 = fd.field.getInt(target);
						hasVal = val2 != 0;
						break;
					}
					case 3: { // long
						val3 = fd.field.getLong(target);
						hasVal = val3 != 0;
						break;
					}
					case 4: { // double
						val4 = fd.field.getDouble(target);
						hasVal = val4 != 0;
						break;
					}
					case 5: { // String
						value = fd.field.get(target);
						hasVal = value != null && !"".equals(value);
						break;
					}
					case 6: { // byte[]
						value = fd.field.get(target);
						hasVal = value != null && ((byte[]) value).length != 0;
						break;
					}
					}
				}

				if (!hasVal) continue;

				sb.append(", \"");
				AcJSON.escape(fd.name, sb);
				sb.append("\":");

				if (fd.hidden && !admin) {
					sb.append("true");
					continue;
				}

				switch (fd.type) {
				case 1: { // short
					sb.append(val1);
					break;
				}
				case 2: { // int
					sb.append(val2);
					break;
				}
				case 3: { // long
					sb.append(val3);
					if (fd.name.startsWith("version") && l > 1000) {
						sb.append(", \"").append(fd.name).append("DH\":\"");
						sb.append(sdf1.format(new Date(val3)));
						sb.append("\"");
					}
					break;
				}
				case 4: { // double
					sb.append(val4);
					break;
				}
				case 5: { // String
					String s = (String) fd.field.get(target);
					sb.append("\"");
					AcJSON.escape(s, sb);
					sb.append("\"");
					break;
				}
				case 6: { // byte[]
					byte[] b = (byte[]) fd.field.get(target);
					sb.append("\"");
					AcJSON.escape(Base64.encodeToString(b), sb);
					sb.append("\"");
					break;
				}
				case 7: { // ArrayShort
					sb.append("\n[");
					first2 = true;
					for (Object x : a) {
						if (first2)
							first2 = false;
						else sb.append(", ");
						sb.append("" + (Short) x);
					}
					sb.append("]\n");
					first2 = true;
					break;
				}
				case 8: { // ArrayInt
					sb.append("\n[");
					first2 = true;
					for (Object x : a) {
						if (first2)
							first2 = false;
						else sb.append(", ");
						sb.append("" + (Integer) x);
					}
					sb.append("]\n");
					first2 = true;
					break;
				}
				case 9: { // ArrayLong
					sb.append("\n[");
					first2 = true;
					for (Object x : a) {
						if (first2)
							first2 = false;
						else sb.append(", ");
						sb.append("" + (Long) x);
					}
					sb.append("]\n");
					first2 = true;
					break;
				}
				case 10: { // ArrayDouble
					sb.append("\n[");
					first2 = true;
					for (Object x : a) {
						if (first2)
							first2 = false;
						else sb.append(", ");
						sb.append("" + (Double) x);
					}
					sb.append("]\n");
					first2 = true;
					break;
				}
				case 11: { // ArrayString
					sb.append("\n[");
					first2 = true;
					for (Object x : a) {
						String s = (String) x;
						if (s == null) s = "";
						if (first2)
							first2 = false;
						else sb.append(", ");
						sb.append("\"");
						AcJSON.escape(s, sb);
						sb.append("\"");
					}
					sb.append("]\n");
					first2 = true;
					break;
				}
				}
			}
			sb.append("}");
			return sb.toString();
		}

		private class FieldDescr {
			private int id;
			private boolean persist;
			private boolean hidden;
			private String name;
			private int type;
			private Field field;

			private void writeObj(DataOutputStream out, Object value) {
				try {
					int token = (type * 1000) + id;
					if (id == 99) {
						if (model != 0) {
							out.writeShort(token);
							out.writeShort(model);
							return;
						}
					}
					switch (type) {
					case 1:
					case 2:
					case 3: { // short int long
						long x = (Long) value;
						if (x != 0) {
							if (x >= Short.MIN_VALUE && x <= Short.MAX_VALUE) {
								out.writeShort(1000 + id);
								out.writeShort((short) x);
							} else if (x >= Integer.MIN_VALUE && x <= Integer.MAX_VALUE) {
								out.writeShort(2000 + id);
								out.writeInt((int) x);
							} else {
								out.writeShort(3000 + id);
								out.writeLong(x);
							}
						}
						break;
					}
					case 4: { // double
						double x = value.getClass() == Long.class ? new Double((Long) value)
								: (Double) value;
						if (x != 0) {
							out.writeShort(token);
							out.writeDouble(x);
						}
						break;
					}
					case 5: { // String
						CellDescr.write(out, token, (String) value);
						break;
					}
					case 6: { // byte[]
						String x = (String) value;
						byte[] b = Base64.decodeToBytes(x);
						CellDescr.write(out, token, b);
						break;
					}
					case 7:
					case 8:
					case 9: { // ArrayShort
						AcJSONArray a = (AcJSONArray) value;
						int l = writeVar(out, token, a);
						for (int i = 0; i < l; i++)
							CellDescr.write(out, (Long) a.get(i));
						break;
					}
					case 10: { // ArrayDouble
						AcJSONArray a = (AcJSONArray) value;
						int l = writeVar(out, token, a);
						for (int i = 0; i < l; i++) {
							Object val = a.get(i);
							Double x = val.getClass() == Long.class ? new Double((Long) val)
									: (Double) val;
							out.writeDouble(x);
						}
						break;
					}
					case 11: { // ArrayString
						AcJSONArray a = (AcJSONArray) value;
						int l = writeVar(out, token, a);
						for (int i = 0; i < l; i++)
							CellDescr.write(out, (String) a.get(i));
						break;
					}
					}
				} catch (Exception e) {}

			}

			private void write(DataOutputStream out, Object target)
					throws IllegalArgumentException, IllegalAccessException, IOException {
				int token = (type * 1000) + id;
				if (id == 99) {
					if (model != 0) {
						out.writeShort(token);
						out.writeShort(model);
						return;
					}
				}
				switch (type) {
				case 1: { // short
					short x = field.getShort(target);
					if (x != 0) {
						out.writeShort(1000 + id);
						out.writeShort(x);
					}
					break;
				}
				case 2: { // int
					int x = field.getInt(target);
					if (x != 0) {
						if (x >= Short.MIN_VALUE && x <= Short.MAX_VALUE) {
							out.writeShort(1000 + id);
							out.writeShort(x);
						} else {
							out.writeShort(2000 + id);
							out.writeInt(x);
						}
					}
					break;
				}
				case 3: { // long
					long x = field.getLong(target);
					if (x != 0) {
						if (x >= Short.MIN_VALUE && x <= Short.MAX_VALUE) {
							out.writeShort(1000 + id);
							out.writeShort((short) x);
						} else if (x >= Integer.MIN_VALUE && x <= Integer.MAX_VALUE) {
							out.writeShort(2000 + id);
							out.writeInt((int) x);
						} else {
							out.writeShort(3000 + id);
							out.writeLong(x);
						}
					}
					break;
				}
				case 4: { // double
					double x = field.getDouble(target);
					if (x != 0) {
						out.writeShort(token);
						out.writeDouble(x);
					}
					break;
				}
				case 5: { // String
					CellDescr.write(out, token, (String) field.get(target));
					break;
				}
				case 6: { // byte[]
					CellDescr.write(out, token, (byte[]) field.get(target));
					break;
				}
				case 7: { // ArrayShort
					ArrayShort a = (ArrayShort) field.get(target);
					int l = writeVar(out, token, a);
					for (int i = 0; i < l; i++)
						CellDescr.write(out, a.getZ(i));
					break;
				}
				case 8: { // ArrayInt
					ArrayInt a = (ArrayInt) field.get(target);
					int l = writeVar(out, token, a);
					for (int i = 0; i < l; i++)
						CellDescr.write(out, a.getZ(i));
					break;
				}
				case 9: { // ArrayLong
					ArrayLong a = (ArrayLong) field.get(target);
					int l = writeVar(out, token, a);
					for (int i = 0; i < l; i++)
						CellDescr.write(out, a.getZ(i));
					break;
				}
				case 10: { // ArrayDouble
					ArrayDouble a = (ArrayDouble) field.get(target);
					int l = CellDescr.write(out, token, a);
					for (int i = 0; i < l; i++)
						out.writeDouble(a.getZ(i));
					break;
				}
				case 11: { // ArrayString
					@SuppressWarnings("rawtypes") ArrayObject a = (ArrayObject) field.get(target);
					int l = CellDescr.write(out, token, a);
					for (int i = 0; i < l; i++)
						CellDescr.write(out, (String) a.get(i));
					break;
				}
				}
			}

		}
	}

	public static void write(DataOutputStream out, short value) throws IOException {
		if (value >= Byte.MIN_VALUE && value <= Byte.MAX_VALUE) {
			out.writeByte(1);
			out.writeByte((byte) value);
		} else {
			out.writeByte(2);
			out.writeShort(value);
		}
	}

	public static void write(DataOutputStream out, int value) throws IOException {
		if (value >= Byte.MIN_VALUE && value <= Byte.MAX_VALUE) {
			out.writeByte(1);
			out.writeByte((byte) value);
		} else if (value >= Short.MIN_VALUE && value <= Short.MAX_VALUE) {
			out.writeByte(2);
			out.writeShort((short) value);
		} else {
			out.writeByte(4);
			out.writeInt(value);
		}
	}

	public static void write(DataOutputStream out, long value) throws IOException {
		if (value >= Byte.MIN_VALUE && value <= Byte.MAX_VALUE) {
			out.writeByte(1);
			out.writeByte((byte) value);
		} else if (value >= Short.MIN_VALUE && value <= Short.MAX_VALUE) {
			out.writeByte(2);
			out.writeShort((short) value);
		} else if (value >= Integer.MIN_VALUE && value <= Integer.MAX_VALUE) {
			out.writeByte(4);
			out.writeInt((int) value);
		} else {
			out.writeByte(8);
			out.writeLong(value);
		}
	}

	public static void write(DataOutputStream out, int token, String s) throws IOException {
		if (s != null && s.length() != 0) {
			byte[] b = s.getBytes(utf8);
			write(out, token, b);
		}
	}

	public static void write(DataOutputStream out, int token, byte[] b) throws IOException {
		if (b != null && b.length != 0) {
			out.writeShort(token);
			if (b.length < 254) {
				out.writeByte(b.length);
			} else if (b.length < 65535) {
				out.writeByte(254);
				out.writeShort(b.length);
			} else {
				out.writeByte(255);
				out.writeInt(b.length);
			}
			out.write(b);
		}
	}

	public static int write(DataOutputStream out, int token, Collection<?> a) throws IOException {
		if (a != null && a.size() != 0) {
			out.writeShort(token);
			if (a.size() < 126) {
				out.writeByte(a.size());
			} else if (a.size() < 65535) {
				out.writeByte(126);
				out.writeShort(a.size());
			} else {
				out.writeByte(127);
				out.writeInt(a.size());
			}
			return a.size();
		} else return 0;
	}

	public static int writeVar(DataOutputStream out, int token, Collection<?> a) throws IOException {
		if (a != null && a.size() != 0) {
			out.writeShort(token);
			if (a.size() < 126) {
				out.writeByte(a.size() + 128);
			} else if (a.size() < 65535) {
				out.writeByte(254);
				out.writeShort(a.size());
			} else {
				out.writeByte(255);
				out.writeInt(a.size());
			}
			return a.size();
		} else return 0;
	}

	public static void write(DataOutputStream out, String s) throws IOException {
		if (s == null || s.length() == 0) {
			out.writeByte(0);
		} else {
			byte[] b = s.getBytes(utf8);
			if (b.length < 254) {
				out.writeByte(b.length);
			} else if (b.length < 65535) {
				out.writeByte(254);
				out.writeShort(b.length);
			} else {
				out.writeByte(255);
				out.writeInt(b.length);
			}
			out.write(b);
		}
	}

}
