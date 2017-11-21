package fr.hypertable;

public abstract class Task {

	public abstract void start(byte[] args, String[] uri) throws AppException ;
	
	public abstract byte[] getArgs();

	public abstract String getName();

	public void enQueue(int dir){
		String url = this.getClass().getSimpleName() + "/" + dir;
		try {
			AppTransaction.tr().provider().enQueue(url, getArgs());
		} catch (AppException e) {	}
	}
}
