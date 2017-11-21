package fr.alterconsos.cell;

import fr.hypertable.AppException;

public interface IGrp {

	public void addedDir(int dir)  throws AppException ;
	
	public void removedDir(int dir) throws AppException ;
	
	public void setup(String initiales, String nom) throws AppException ;
	
	public void supprGrp(int date);
	
}
