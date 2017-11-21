package fr.hypertable;

import org.json.simple.AcJSONArray;

public class ArrayDouble extends ArrayObject<Double> {

	private static final long serialVersionUID = 1L;

	public ArrayDouble setColumn(Cell.CellNode value) {
		super.setW(value);
		return this;
	}

	public double getZ(int index) {
		Double l = super.get(index);
		return l == null ? 0 : l;
	}

	@SuppressWarnings("unchecked") public void copy(AcJSONArray a) {
		if (a != null) {
			if (!a.containsAll(this) || !this.containsAll(a)) {
				this.clear();
				for (int i = 0; i < a.size(); i++) {
					double s = a.getD(i, -1);
					this.add(s);
				}
			}
		}
	}

}
