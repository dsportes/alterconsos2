package fr.hypertable;

import java.util.ArrayList;
import java.util.Collection;

public abstract class ArrayObject<E> extends ArrayList<E> {

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	private IW w;

	public ArrayObject<E> setW(IW value) {
		if (this.w == null) this.w = value;
		return this;
	}

	public E set(int index, E element) {
		if (w != null) w.w();
		if (index >= size()) {
			int n = index - size() + 1;
			for (int i = 0; i < n; i++)
				add(null);
		}
		return super.set(index, element);
	}

	@Override public boolean add(E e) {
		if (w != null) w.w();
		return super.add(e);
	}

	public void add(int index, E e) {
		if (w != null) w.w();
		super.add(index, e);
	}

	public E remove(int index) {
		if (w != null) w.w();
		return super.remove(index);
	}

	public boolean remove(Object e) {
		if (w != null) w.w();
		return super.remove(e);
	}

	public void clear() {
		if (w != null) 
			w.w();
		super.clear();
	}

	@SuppressWarnings({ "rawtypes", "unchecked" }) public boolean addAll(Collection c) {
		if (w != null) w.w();
		return super.addAll(c);
	}

	@SuppressWarnings({ "rawtypes", "unchecked" }) public boolean addAll(int index, Collection c) {
		if (w != null) w.w();
		return super.addAll(index, c);
	}

	protected void removeRange(int fromIndex, int toIndex) {
		if (w != null) w.w();
		super.removeRange(fromIndex, toIndex);
	}

	@SuppressWarnings({ "rawtypes" }) public boolean removeAll(Collection c) {
		if (w != null) w.w();
		return super.removeAll(c);
	}

	@SuppressWarnings({ "rawtypes" }) public boolean retainAll(Collection c) {
		if (w != null) w.w();
		return super.retainAll(c);
	}

	public ArrayObject(int len) {
		super(len);
	}

	public ArrayObject() {
		super();
	}
}
