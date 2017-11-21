package fr.hypertable;

import org.json.simple.AcJSONArray;

public class ArrayShort extends ArrayObject<Short> {

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	public ArrayShort setW(Cell.CellNode value) {
		super.setW(value);
		return this;
	}

	public short getZ(int index) {
		Short l = super.get(index);
		return l == null ? 0 : l;
	}

	@SuppressWarnings("unchecked") public void copy(AcJSONArray a) {
		if (a != null) {
			if (!a.containsAll(this) || !this.containsAll(a)) {
				this.clear();
				for (int i = 0; i < a.size(); i++) {
					int s = a.getI(i, -1);
					if (s > 0 && s < 250) this.add((short) s);
				}
			}
		}
	}
}
