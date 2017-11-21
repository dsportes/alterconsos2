package fr.hypertable;

import org.json.simple.AcJSONArray;

public class ArrayString extends ArrayObject<String> {

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	public ArrayString setW(Cell.CellNode value) {
		super.setW(value);
		return this;
	}

	public String getZ(int index) {
		String l = super.get(index);
		return l == null ? "" : l;
	}

	@SuppressWarnings("unchecked") public void copy(AcJSONArray a) {
		if (a != null) {
			if (!a.containsAll(this) || !this.containsAll(a)) {
				this.clear();
				for (int i = 0; i < a.size(); i++) {
					String s = a.getS(i, null);
					this.add(s);
				}
			}
		}
	}

}
