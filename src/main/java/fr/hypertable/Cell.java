package fr.hypertable;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

public abstract class Cell {

	/******************* Static ************************************/

	/**
	 * En phase forte de traitement, retourne la cellule préalablement mémorisée
	 * en cache de transaction en phase faible. La cellule est en read only. Si
	 * elle n'est pas trouvée, c'est un BUG : la logique applicative DOIT aller
	 * chercher en phase faible les cellules des lignes non verrouillées par un
	 * début de transaction avant de les utiliser en phase forte.<br>
	 * Typiquement les énumérations sont toujours préalablement chargées.
	 * 
	 * @param tr
	 * @param line
	 * @param column
	 * @param cellType
	 * @return
	 * @throws AppException
	 */
	public static Cell getWeak(String line, String column, String cellType) throws AppException {
		if (cellType == null || line == null || column == null || cellType.length() == 0
				|| line.length() == 0 || column.length() == 0) throw new AppException(MF.GETCELL);
		CellDescr cd = CellDescr.getCellDescr(cellType);
		if (cd == null) throw new AppException(MF.NOTCOL, cellType);

		String cacheKey = Cell.getCacheKey(line, column, cellType);
		AppTransaction tr = AppTransaction.tr();
		Cell cell = tr.getFromTransactionCache(cacheKey);
		if (cell != null) return cell;
		throw new AppException(MF.GETCELLRO, cellType);
	}

	public static Cell get(String line, String column, String cellType) throws AppException {
		return Cell.get(line, column, cellType, 0);
	}

	/**
	 * La cellule est cherchée succssivement dans les mémoires caches, de
	 * transaction, locale, MemCache puis Datastore et enfin créée.<br>
	 * En phase forte la cellule ne peut se trouver qu'en cache de transaction:
	 * dans les autres cas elle est clonée pour être en écriture.<b> Une cellule
	 * Versions en phase forte n'est cherchée qu'en cache de transaction (si
	 * elle est en écriture donc résultant d'une recherche antérieure), et en
	 * DataStore.<br>
	 * En phase faible elle peut être obtenue auusi de MemCache.
	 * 
	 * @param tr
	 * @param line
	 * @param column
	 * @param cellType
	 * @param vmin
	 *            : ne pas chercher la cellule si elle n'est pas disponible plus
	 *            récente que vmin
	 * @return
	 * @throws AppException
	 */
	public static Cell get(String line, String column, String cellType, long vmin)
			throws AppException {
		AppTransaction tr = AppTransaction.tr();
		if (cellType == null || line == null || column == null || cellType.length() == 0
				|| line.length() == 0 || column.length() == 0) throw new AppException(MF.GETCELL);
		CellDescr cd = CellDescr.getCellDescr(cellType);
		if (cd == null) throw new AppException(MF.NOTCOL, cellType);

		Versions versions = Versions.get(line);
		long vlast = versions.getVersion(cellType, column);
		if (!tr.phaseForte() && (vmin > 0 && vlast > 0 && vmin >= vlast)) return null;
		// pas plus récent à obtenir et déjà connu

		String cacheKey = Cell.getCacheKey(line, column, cellType);
		Cell cell = tr.getFromTransactionCache(cacheKey);

		if (!tr.phaseForte()) {
			// Phase Faible
			if (cell != null) return cell;

			if (vlast != -1) {
				cell = tr.getFromLocaleCache(cacheKey);
				// cell = null; // pour tester MEMCACHE et la forcer à rechercher
				if (cell != null && cell.version() >= vlast) {
					tr.putIntoTransactionCache(cacheKey, cell);
					return cell;
				}

//				CachedCell mc = tr.provider().getFromMemCache(cacheKey);
//				if (mc != null && mc.version >= vlast) {
//					cell = Cell.newCell(cellType).init(line, column, mc.version, mc.bytes);
//					cell.putInLocalCache();
//					tr.putIntoTransactionCache(cacheKey, cell);
//					return cell;
//				}
			}

			cell = getCellFromStorage(line, column, cellType);
			if (cell != null) {
				cell.putInLocalCache();
				// cell.putInMemCache();
				tr.putIntoTransactionCache(cacheKey, cell);
				return cell;
			}

			cell = Cell.newCell(cellType).init(line, column, -1, null);
			tr.putIntoTransactionCache(cacheKey, cell);
			return cell;
		}

		// Phase Forte
		if (cell != null) {
			if (!cell.isReadOnly()) return cell;
			// cloner en RW
			if (vlast != -1 && cell.version() >= vlast) return cell.cloneAndCache(); 
		}

		cell = tr.getFromLocaleCache(cacheKey);
		if (cell != null) {
			// cloner en RW
			if (vlast != -1 && cell.version() >= vlast) return cell.cloneAndCache();
		}

//		CachedCell mc = tr.provider().getFromMemCache(cacheKey);
//		if (mc != null && mc.version >= vlast) {
//			cell = Cell.newCell(cellType).init(line, column, mc.version, mc.bytes);
//			cell.putInLocalCache();
//			return cell.cloneAndCache(); // cloner en RW
//		}

		cell = getCellFromStorage(line, column, cellType);
		if (cell != null) {
			cell.putInLocalCache();
			// cell.putInMemCache();
			return cell.cloneAndCache(); // cloner en RW
		}

		cell = Cell.newCell(cellType).init(line, column, -1, null);
		cell.transaction = tr;
		tr.putIntoTransactionCache(cacheKey, cell);
		return cell;
	}

	private static Cell getCellFromStorage(String line, String column, String cellType)
			throws AppException {
		CachedCell cc = AppTransaction.tr().provider().getCellFromStorage(line, column, cellType);
		if (cc == null) return null;
		return Cell.newCell(cellType).init(line, column, cc.version, cc.bytes);
	}

	static Cell buildCell(String cellType, String line, String column, long version, byte[] bytes)
			throws AppException {
		return Cell.newCell(cellType).init(line, column, version, bytes);
	}

	private static String getCacheKey(String line, String column, String cellType) {
		return cellType + ":" + line + ':' + column;
	}

	/******************* Object ************************************/

	boolean isVersions() {
		return false;
	}
	
	private long lastTransactionId;

	public boolean changedByCurrentTr(AppTransaction transaction){
		return (transaction.transactionId() == lastTransactionId);
	}
	
	/**
	 * Vérification du droit d'écriture dans la cellule.<br>
	 * Marque que l'entête de la cellule a changé
	 */
	public void w(CellNode cn) {
		if (fake) return;
		if (isReadOnly())
			throw new IllegalAccessError("Cell [" + this.getClass().getSimpleName()
					+ "] is read only");
		if (changed) {
			cn.changed = true;
			cn.version = version;
			return;
		}

		if (!isVersions()) {
			try {
				Versions vz = Versions.get(line());
				Cell cz = (Cell) vz;
				if (!cz.changed) {
					lastTransactionId = transaction.transactionId();
					version = transaction.allocatedVersion(cz.version);
					cz.version = version;
					cz.changed = true;
				} else {
					version = transaction.version(line);
				}
				vz.setVersion(cellType, column);
			} catch (AppException e) {}
		} else version = transaction.allocatedVersion(version);
		changed = true;
		cn.changed = true;
		cn.version = version;
	}
	
	private boolean creation;
	public boolean creation() { return creation; }
	
	Cell init(String line, String column, long version, byte[] bytes) throws AppException {
		this.cellType = cellDescr().getName();
		this.line = line;
		this.column = column;
		setIds();
		this.version = version;
		this.creation = version == -1;
		this.bytes = bytes;
		this.transaction = null;
		this.setRWForDeserialize(true);
		if (bytes != null && bytes.length != 0) cellDescr().read(this, this.bytes);
		this.compile();
		this.setRWForDeserialize(false);
		changed = false;
		return this;
	}

	/**
	 * Calcul local des identifiants fonctionnels invariants depuis les seules
	 * données line et column;
	 * 
	 * @throws AppException
	 */
	public void setIds() throws AppException {}

	/**
	 * Clone dédouble la cellule avec pour objectif d'en avoir une copie
	 * autorisée en écriture. Donc stockage en cache de transaction en rw
	 * 
	 * @throws AppException
	 */
	protected Cell cloneAndCache() throws AppException {
		AppTransaction tr = AppTransaction.tr();
		if (bytes == null) serialize();
		Cell cell2 = Cell.newCell(cellType).init(line, column, version, bytes);
		cell2.transaction = tr;
		tr.putIntoTransactionCache(getCacheKey(), cell2);
		return cell2;
	}

	/**
	 * Stockage en cache de transaction en rw
	 */
	protected Cell noCloneAndCache() {
		try {
			AppTransaction tr = AppTransaction.tr();
			this.transaction = tr;
			tr.putIntoTransactionCache(getCacheKey(), this);
			return this;
		} catch (Exception ex) {
			return this;
		}
	}

	public String getCacheKey() {
		return getCacheKey(line, column, cellType);
	}

	private void putInLocalCache() throws AppException {
		AppTransaction tr = AppTransaction.tr();
		String cacheKey = getCacheKey();
		Cell c = tr.getFromLocaleCache(cacheKey);
		if (c == null || c.version < version) {
			transaction = null;
			changed = false;
			tr.putInLocaleCache(cacheKey, this);
		}
	}

//	private void putInMemCache() {
//		AppTransaction.tr().provider().putInMemCache(getCacheKey(), version, bytes);
//	}

	/**
	 * Stocke la cellule (déjà sérialisée) dans les caches locales et MemCache.<br>
	 * Uniquement employé par AppTransaction en phase après commit.
	 * 
	 * @param tr
	 * @throws AppException 
	 */
	void putInCaches() throws AppException {
		putInLocalCache();
		// putInMemCache();
	}

	/**
	 * Méthode appelée après une désérilisation.<br>
	 * Elle permet de calculer les champs virtuels non persistents et le cas
	 * échéant de calculer et d'ajouter des cellNodes de totalisation par
	 * exemple.
	 */
	protected void compile() throws AppException {}

	/**************************** Variables d'instance ******************/

	long version = 0;

	/*
	 * Transaction détenant l'exclusivité sur la cellule qu'elle soit modifiée
	 * ou non, elle peut l'être Non null en phase FORTE seulement. En phase
	 * faible plusieurs transactions concurrentes peuvent détenir une référence
	 * sur la cellule (la partager sans pouvoir écrire), en conséquence
	 * "transaction" est nullS
	 */
	protected AppTransaction transaction = null;

	public long version() {
		return version;
	};

	public boolean isEmpty() {
		return version <= 0;
	}

	public boolean isReadOnly() {
		return !fake && transaction == null;
	}

	private boolean fake = false;

	public void setRWForDeserialize(boolean fake) {
		this.fake = fake;
	}

	private boolean changed = false;

	public boolean hasChanged() {
		return changed;
	}

	private TreeMap<String, CellNode> tree = new TreeMap<String, CellNode>();

	public TreeMap<String, CellNode> tree() {
		return tree;
	}

	public CellNode nodeByKey(String key) {
		String k = key != null ? key : "";
		return tree.get(k);
	}

	public List<CellNode> nodesByKey(String key) {
		ArrayList<CellNode> lst = new ArrayList<CellNode>();
		for (CellNode o : nodes(key)) {
			lst.add(o);
		}
		return lst;
	}

	public Collection<CellNode> nodes(String key) {
		String k = key != null ? key : "";
		return tree().subMap(k + '\u0000', k + '\uFFFF').values();
	}

	public Collection<CellNode> nodes() {
		return tree().values();
	}

	private String line;

	public String line() {
		return line;
	}

	private String column;

	public String column() {
		return column;
	}

	private String cellType;

	public String cellType() {
		return cellType;
	}

	private byte[] bytes;

	public byte[] bytes() {
		return bytes;
	}

	/******************* Internal Management ************************************/

	public abstract CellDescr cellDescr();

	private static Cell newCell(String cellType) throws AppException {
		if (cellType == null)
			throw new AppException(MF.REFLECT, "Cell.factory() invoked without cellType parameter");
		CellDescr cd = CellDescr.getCellDescr(cellType);
		if (cd == null)
			throw new AppException(MF.REFLECT, "Cell.factory() invoked for [" + cellType
					+ ", without descriptor as Cell class");
		Cell cell = (Cell) cd.newCell();
		if (cell == null)
			throw new AppException(MF.REFLECT, "Cell.factory() invoked on [" + cellType
					+ ", instantiation failed");
		return cell;
	}

	public CellNode newCellNode(String nodeType) throws AppException {
		return cellDescr().newCellNode(this, nodeType);
	}

	public Set<CellNode> allNodes() {
		HashSet<CellNode> allNodes = new HashSet<CellNode>();
		Set<Map.Entry<String, CellNode>> s = tree.entrySet();
		for (Map.Entry<String, CellNode> me : s)
			allNodes.add(me.getValue());
		return allNodes;
	}

	public void serialize() throws AppException {
		this.bytes = this.cellDescr().serialize(this);
	}

	public StringBuffer toJSON(StringBuffer sb, String[] filterKeys, long filterVersion,
			String filterArg, boolean isAdmin) throws AppException {
		try {
			return cellDescr().toJSON(sb, this, filterKeys, filterVersion, filterArg, isAdmin);
		} catch (Exception e) {
			throw new AppException(e, MF.REFLECT, this.getClass().getSimpleName());
		}
	}

//	public int[] indexOf(String key) {
//		Index d = (Index) nodeByKey(key);
//		if (d == null) return new int[0];
//		int[] a = new int[d.indexes.size()];
//		for (int i = 0; i < d.indexes.size(); i++)
//			a[i] = d.indexes.getZ(i);
//		return a;
//	}
//
//	public void removeIndex(String key, int index) throws AppException {
//		Index d = (Index) nodeByKey(key);
//		if (d != null) d.indexes.remove(new Integer(index));
//	}
//
//	public void addIndex(Cell owner, String indexName, String key, int index) throws AppException {
//		Index d = (Index) nodeByKey(key);
//		if (d == null) {
//			d = (Index) (owner.cellDescr().newCellNode(owner, indexName));
//			d.insert();
//			d.indexes = new ArrayInt();
//		}
//		Integer ix = new Integer(index);
//		if (!d.indexes.contains(ix)) d.indexes.add(ix);
//	}

	public void addDir(int dir) throws AppException {
		DirIndex d = (DirIndex) nodeByKey("D");
		if (d == null) {
			d = (DirIndex) (this.cellDescr().newCellNode(this, "DirIndex"));
			d.insert();
			d.indexes = new ArrayInt();
		}
		if (!d.indexes.contains(dir)) 
			d.indexes.add(new Integer(dir));
	}

	public void removeDir(int dir) throws AppException {
		DirIndex d = (DirIndex) nodeByKey("D");
		if (d != null) 
			d.indexes.remove(new Integer(dir));
	}

	public int[] getDirs(){
		DirIndex d = (DirIndex) nodeByKey("D");
		if (d == null)
			return new int[0];
		int[] x = new int[d.indexes.size()];
		for (int i = 0; i < d.indexes.size(); i++)
			x[i] = d.indexes.get(i);
		return x;
	}
	
	public class DirIndex extends CellNode {
		@HT(id = 1) protected ArrayInt indexes;

		public ArrayInt indexes() {
			return indexes;
		}
	}

	public abstract class CellNode implements IW{

		private boolean changed = false;

		public boolean hasChanged() {
			return changed;
		}

		public String[] keys() {
			return null;
		}

		public Cell cell() {
			return Cell.this;
		}

		long version;

		public long version() {
			return version;
		}

		public boolean isEmpty() {
			return version <= 0;
		}

		private short model;

		public short model() {
			return model;
		}

		/**
		 * Retourne la liste des numéro de champs à sortir en JSON<br>
		 * Par convention, null les retourne TOU<br>
		 * Par convention int[0] (array vide) SAUTE le cellNode
		 * 
		 * @return
		 */
		public int[] jsonFields(AppTransaction tr, String filterArg) {
			return null;
		}

		@Override
		public void w() {
			Cell.this.w(this);
		}

		public boolean same(Collection<Integer> dest, Collection<Integer> src) {
			Integer[] a1 = src.toArray(new Integer[src.size()]);
			Integer[] a2 = dest.toArray(new Integer[dest.size()]);
			Arrays.sort(a1);
			Arrays.sort(a2);
			return Arrays.equals(a1, a2);
		}
		
		public boolean copyIf(ArrayInt dest, Collection<Integer> src) {
			if (src == null || src.size() == 0) {
				if (dest.size() != 0) {
					dest.clear();
					w();
					return true;
				}
				return false;
			}
			Integer[] a1 = src.toArray(new Integer[src.size()]);
			Integer[] a2 = dest.toArray(new Integer[dest.size()]);
			Arrays.sort(a1);
			Arrays.sort(a2);
			if (!Arrays.equals(a1, a2)) {
				dest.clear();
				dest.addAll(src);
				w();
				return true;
			}
			return false;
		}

		public void copyIf(ArrayInt dest, Integer[] src) {
			if (src == null || src.length == 0) {
				if (dest.size() != 0) {
					dest.clear();
					w();
				}
				return;
			}
			Integer[] a2 = dest.toArray(new Integer[dest.size()]);
			Arrays.sort(src);
			Arrays.sort(a2);
			if (!Arrays.equals(src, a2)) {
				dest.clear();
				for (int i : src)
					dest.add(i);
				w();
			}
		}

		public boolean w(String field, String value) {
			boolean b1 = (field == null || field.length() == 0);
			boolean b2 = (value == null || value.length() == 0);
			if ((b1 && b2) || (!b1 && !b2 && field.equals(value))) return false;
			w();
			return true;
		}

		public boolean w(short field, short value) {
			if (field == value) return false;
			w();
			return true;
		}

		public boolean w(int field, int value) {
			if (field == value) return false;
			w();
			return true;
		}

		public boolean w(long field, long value) {
			if (field == value) return false;
			w();
			return true;
		}

		public boolean w(double field, double value) {
			if (field == value) return false;
			w();
			return true;
		}

		/**
		 * Insère un CellNode nouvellement créé (ou qu'on vient d'enlever).
		 * 
		 * @return
		 */
		public CellNode insert() {
			if (isReadOnly())
				throw new IllegalAccessError("Cell [" + this.getClass().getSimpleName()
						+ "] is read only");
			cellDescr().populateArrays(this);
			String singleKey = cellDescr().singleKey(this.getClass());
			if (singleKey != null) {
				tree.put(singleKey, this);
			} else {
				String[] keys = keys();
				if (keys != null && keys.length != 0) for (String k : keys)
					if (k != null) tree.put(k, this);
			}
			w();
			return this;
		}

		public CellNode remove() {
			String singleKey = cellDescr().singleKey(this.getClass());
			if (singleKey != null) {
				tree.remove(singleKey);
			} else {
				String[] keys = keys();
				if (keys != null && keys.length != 0) for (String k : keys)
					if (k != null) tree.remove(k);
			}
			w();
			return this;
		}

	}

}
