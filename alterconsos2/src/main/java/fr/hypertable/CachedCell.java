package fr.hypertable;

import java.io.Serializable;

public class CachedCell implements Serializable {

	/**
	 * 
	 */
	private static final long serialVersionUID = 655560324095210883L;

	public long version;
	public byte[] bytes;

}
