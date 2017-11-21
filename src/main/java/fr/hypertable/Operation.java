package fr.hypertable;

import org.json.simple.AcJSONObject;

public abstract class Operation {

	private AppTransaction tr = AppTransaction.tr();

	public AppTransaction.Resultat resultat = tr.getResultat();

	public IAuthChecker authChecker = tr.authChecker;

	public abstract String mainLine();

	public AcJSONObject arg() {
		return tr.getArg();
	}

	public String getOpName() {
		return tr.getOpName();
	}

	public abstract AppTransaction.StatusPhase phaseFaible() throws AppException;

	// return StatusPhase.json;

	public abstract void phaseForte() throws AppException;

}
