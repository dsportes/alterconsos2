package fr.alterconsos.cell;

import java.io.UnsupportedEncodingException;
import java.util.HashSet;

import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.DirectoryG;
import fr.hypertable.HTCN;
import fr.hypertable.IAuthChecker;
import fr.hypertable.MF;
import fr.hypertable.AppTransaction.StatusPhase;

public class Directory extends fr.hypertable.DirectoryG {
	public static final CellDescr cellDescr = new CellDescr(Directory.class);
	
	public static Entry entryG(int type, int code) {
		try {
			Directory[] dirs = AppTransaction.tr().authChecker.myDirs();
			for(Directory dir : dirs){
				Entry e = (Entry)dir.entry(type, code);
				if (e != null)
					return e;
			}
			return null;
		} catch(Exception e) {
			return null;
		}
	}
		
	public static HashSet<Integer> codesOfG(HashSet<Integer> hs, int type){
		if (hs == null)
			hs = new HashSet<Integer>();
		try {
			Directory[] dirs = AppTransaction.tr().authChecker.myDirs();
			for(Directory dir : dirs) {
				for(CellNode cn : dir.nodesByKey("C."+ type + "."))
					hs.add(((Entry)cn).code);
			}
			return hs;
		} catch(Exception e) {
			return hs;
		}
	}

	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	@Override  public boolean isValidType(int type) {
		return type >= 0 && type <= 2;
	}

	@Override  protected boolean isMultiDir(int type) {
		return type != 0;
	}
	
	@Override protected IGrp getGrpCell(int type, int code) throws AppException{
		return type == 1 ? GAC.get(code) : GAP.get(code);
	}

//	@Override public void compile() throws AppException {
//		super.compile();
//	}
	
	@Override protected DirectoryG.Entry resetGrpPwd(int type, int code) throws AppException{
		DirectoryG.Entry e = super.resetGrpPwd(type, code);
		GAPC gapc = type == 1 ? GAC.get(code) : GAP.get(code);
		gapc.checkIf1(e);
		return e;
	}
	
	@HTCN(id = 9, single = 'R') public class Recomp extends DirectoryG.Recomp {}

	@HTCN(id = 2) public class Next extends DirectoryG.Next {}

	@HTCN(id = 1) public class Entry extends DirectoryG.Entry {}

	public static class Op extends DirectoryG.Op {
		@Override public StatusPhase phaseFaible() throws AppException {
			int op = Integer.parseInt(getOpName());
			if (op == 86) {
				if (authChecker.getAuthType() != IAuthChecker.ADMINLOC)
					throw new AppException(MF.ADMINL);
				String filter = arg().getS("filter", "");
				DirectoryG dir = (DirectoryG) Cell.get("D", "" + authChecker.getAuthDir() + ".", "Directory");
				StringBuffer sb = new StringBuffer();
				for(CellNode cn : dir.nodesByKey("C.1.")){
					DirectoryG.Entry e = (DirectoryG.Entry)cn;
					GAC g = GAC.get(e.code);
					g.searchEmails(sb, filter);
				}
				for(CellNode cn : dir.nodesByKey("C.2.")){
					DirectoryG.Entry e = (DirectoryG.Entry)cn;
					GAP g = GAP.get(e.code);
					g.searchEmails(sb, filter);
				}
				resultat.mime = "text/plain";
				try {
					resultat.bytes = sb.toString().getBytes("UTF-8");
				} catch (UnsupportedEncodingException e) {	}
				return StatusPhase.brut;
			} else
				return super.phaseFaible();
		}
	}

}
