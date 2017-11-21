package fr.hypertable;

import fr.alterconsos.cell.Directory;

public interface IAuthChecker {

	/**
	 * L'objectif est FIXER le niveau d'authentification atteient, ET NON de
	 * s'assurer qu'il convient (c'est le rôle des opérations).<br>
	 * Le retour false indique une tentative de prétendre à un niveau
	 * d'authentification alors que la session cliente ne l'a pas. AuthId va
	 * représenter le "username".<b> AuthType indique le niveau / type
	 * d'authentification : 0 : aucune authentification 1 : admin, la plus
	 * élevée autres libres : cadre 1, cadre 2, utilisateur courant ...
	 */
	public boolean verifierAuth() throws AppException;

	public void setInternalTask(String dirId) throws AppException;

	public int getAuthType();

	public int getAuthGrp();

	public int getAuthUsr();

	public int getAuthDir();

	public String getAuthDiag();

	public int getAuthInfo();

	public int getAuthPower();
	
	public int[] getDirs();

	public String toSHA1(String pwd, int authType, int authGrp);
	
	public boolean isMyDir(int dir);
	
	public Directory[] myDirs();
	
	/**
	 * Droit d'acces d'une cellule 0 : aucun 1 : restreint
	 * 
	 * 9 : full
	 * 
	 * @param line
	 * @param column
	 * @return
	 */
	public int accessLevel(String line, String column, String type);

	public static final int ADMINGEN = -1;
	public static final int ADMINLOC = -2;
	public static final int TASK = -3;

}
