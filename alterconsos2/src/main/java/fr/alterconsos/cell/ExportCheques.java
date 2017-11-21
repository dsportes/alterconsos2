package fr.alterconsos.cell;

import java.io.ByteArrayOutputStream;

import org.json.simple.AcJSON;
import org.json.simple.AcJSONArray;
import org.json.simple.AcJSONObject;
import org.json.simple.parser.ParseException;

import fr.hypertable.AppException;
import fr.hypertable.MF;
import fr.hypertable.AppTransaction.StatusPhase;
import fr.hypertable.Operation;

public class ExportCheques extends Operation {

	@Override public String mainLine() {
		return null;
	}

	@Override public StatusPhase phaseFaible() throws AppException {
		String[] sheetNames = {"Chèques"};
		int[] cols = {10, 50, 30, 50};
		String s = arg().getS("param");
		AcJSONArray a = null;
		try {
			a = AcJSON.parseArray(s);
		} catch (ParseException e) {
			String x = e.toString();
			throw new AppException(MF.IO, x);
		}
		
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		WB wb = new WB(bos, sheetNames);
		
		wb.nextRow(0);
		int nc = 0;
		wb.write(nc++, "Montant");		
		wb.write(nc++, "Alterconso");
		wb.write(nc++, "Ordre");
		wb.write(nc++, "Commentaire");

		for (int i = 0; i < a.size(); i++) {
			AcJSONObject obj = a.getO(i);
			String ac = obj.getS("ac", "?");
			String ic = obj.getS("ic", "");
			String oc = obj.getS("oc", "?");
			int m = obj.getI("m", 0);
			double d = (double)m / 100;
			wb.nextRow(0);
			nc = 0;
			wb.writeE(nc++, d);
			wb.write(nc++, ac);
			wb.write(nc++, oc);
			wb.write(nc++, ic);
		}
							
		wb.setCols(cols, 0);
		wb.close();
		resultat.mime = "application/vnd.ms-excel";
		resultat.bytes = bos.toByteArray();
		return StatusPhase.brut;
	}

	@Override public void phaseForte() throws AppException {
	}

}
