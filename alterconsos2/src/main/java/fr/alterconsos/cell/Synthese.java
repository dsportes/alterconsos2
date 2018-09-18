package fr.alterconsos.cell;

import java.text.SimpleDateFormat;
import java.util.Date;

import fr.alterconsos.cell.GAPC.GContact;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.HTServlet;
import fr.hypertable.IAuthChecker;
import fr.hypertable.Operation;
import fr.hypertable.AppTransaction.StatusPhase;

public class Synthese extends Operation {
	
	@Override public String mainLine() {
		return null;
	}
		
	@Override public StatusPhase phaseFaible() throws AppException {
		IAuthChecker ac = AppTransaction.tr().authChecker;
		int authType = ac.getAuthType();
		int grp = ac.getAuthGrp();
		int usr = ac.getAuthUsr();
		
		GAPC gapc = authType == 2 ? GAP.get(grp) : GAC.get(grp);
		GContact c1 = gapc.contact(1);
		int aj = HTServlet.appCfg.aujourdhui();
		boolean obs = c1 != null && aj > c1.bienvenueJ();
		String subject = !obs && c1.bienvenueS() != null ? c1.bienvenueS() : null;
		String text = !obs && c1.bienvenueT() != null ? c1.bienvenueT() : null;
		
		SimpleDateFormat sdfjhs = HTServlet.appCfg.sdfjhs();
		Synthese2 s2 = new Synthese2(authType, grp, usr, sdfjhs.format(new Date()));
		resultat.content = s2.getSynthese(subject, text, true, true);
		resultat.mime = "text/html";
		resultat.brut = true;
		return StatusPhase.brut;
	}
		
	@Override public void phaseForte() throws AppException {}

}
