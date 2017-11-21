package fr.hypertable;

import java.util.List;

import org.json.simple.AcJSONArray;

public class ArrayInt extends ArrayObject<Integer> {

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	public ArrayInt setW(Cell.CellNode value) {
		super.setW(value);
		return this;
	}

	public int getZ(int index) {
		Integer l = super.get(index);
		return l == null ? 0 : l;
	}

	@SuppressWarnings("unchecked") public void copy(AcJSONArray a) {
		if (a != null) {
			if (!a.containsAll(this) || !this.containsAll(a)) {
				this.clear();
				for (int i = 0; i < a.size(); i++) {
					int s = a.getI(i, -1);
					this.add(s);
				}
			}
		}
	}

	public void copy(List<Integer> a) {
		if (a != null) {
			if (!a.containsAll(this) || !this.containsAll(a)) {
				this.clear();
				for (int i = 0; i < a.size(); i++) {
					int s = a.get(i);
					this.add(s);
				}
			}
		}
	}

}
