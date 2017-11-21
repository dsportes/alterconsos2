package fr.alterconsos.cell;

import fr.hypertable.Cell;
import fr.hypertable.HT;

public abstract class Livr extends Cell {

	private static final int[] hex0 = {
		0xfffe, 0xfffd, 0xfffb, 0xfff7,
		0xffef, 0xffdf, 0xffbf, 0xff7f,
		0xfeff, 0xfdff, 0xfbff, 0xf7ff
	};

	public enum Flag {QMAX, FRUSTRATION, PAQUETSAC, PARITE, DISTRIB, EXCESTR, PERTETR, PAQUETSC, PAQUETSD, NONCHARGE};
	
	public static final int[] p2 = {1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048};
	
	public static int setFlag(int flags, Flag f, boolean v){
		int i = f.ordinal();
		if (v)
			return flags | p2[i];
		else
			return flags & hex0[i];
	}

	public static boolean hasFlag(int flags, Flag f){
		int i = f.ordinal();
		int fx = flags & p2[i];
		return fx != 0;
	}

	int gapx = 0;
	int gacx = 0;
	String nomGap;
	String nomGac;

	public int gap() {
		return gapx;
	}

	public int gac() {
		return gacx;
	}

	public class Gac extends Noyau2 {
		@HT(id = 48) public int regltFait;

		public int regltFait() {
			return regltFait;
		}

		public void regltFait(int value) {
			if (w(this.regltFait, value)) this.regltFait = value;
		}

		@HT(id = 49) public int panierAtt;

		public int panierAtt() {
			return panierAtt;
		}

		public void panierAtt(int value) {
			if (w(this.panierAtt, value)) this.panierAtt = value;
		}

		@HT(id = 52) public int dbj;

		public int dbj() {
			return dbj;
		}

		public void dbj(int value) {
			if (w(this.dbj, value)) this.dbj = value;
		}
		
		@HT(id = 53) public int crj;

		public int crj() {
			return crj;
		}

		public void crj(int value) {
			if (w(this.crj, value)) this.crj = value;
		}

		@HT(id = 54) public int nbac;

		public int nbac() {
			return nbac;
		}

		public void nbac(int value) {
			if (w(this.nbac, value)) this.nbac = value;
		}

		@HT(id = 64) public int remiseCheque;
		
		public int remiseCheque() {
			return remiseCheque;
		}

		public void remiseCheque(int value) {
			if (w(this.remiseCheque, value)) this.remiseCheque = value;
		}

	}
	
	public class Ac extends Noyau {
		@HT(id = 2) public int ac;

		@HT(id = 42) public int payePar;

		public int payePar() {
			return payePar;
		}

		public void payePar(int value) {
			if (w(this.payePar, value)) this.payePar = value;
		}

		@HT(id = 43) public int payePour;

		public int payePour() {
			return payePour;
		}

		public void payePour(int value) {
			if (w(this.payePour, value)) this.payePour = value;
		}
		@HT(id = 40) public int cheque;

		public int cheque() {
			return cheque;
		}

		public void cheque(int value) {
			if (w(this.cheque, value)) this.cheque = value;
		}

		@HT(id = 41) public int suppl;

		public int suppl() {
			return suppl;
		}

		public void suppl(int value) {
			if (w(this.suppl, value)) this.suppl = value;
		}
		
		@HT(id = 48) public int regltFait;

		public int regltFait() {
			return regltFait;
		}

		public void regltFait(int value) {
			if (w(this.regltFait, value)) this.regltFait = value;
		}

		@HT(id = 49) public int panierAtt;

		public int panierAtt() {
			return panierAtt;
		}

		public void panierAtt(int value) {
			if (w(this.panierAtt, value)) this.panierAtt = value;
		}

		@HT(id = 50) public int db;

		public int db() {
			return db;
		}

		public void db(int value) {
			if (w(this.db, value)) this.db = value;
		}

		@HT(id = 51) public int cr;

		public int cr() {
			return cr;
		}

		public void cr(int value) {
			if (w(this.cr, value)) this.cr = value;
		}

	}

	public class Ap extends Noyau2 {
		@HT(id = 3) public int ap;

		public boolean is1() {
			return ap == 1;
		}

		public boolean isPaiementDirect() {
			return ap == 1 || ap >= 100;
		}

		public boolean isPaiementGAP() {
			return ap > 1 && ap < 100;
		}

		@HT(id = 47) public int prixPG;

		public int prixPG() {
			return prixPG;
		}

		public void prixPG(int value) {
			if (w(this.prixPG, value)) this.prixPG = value;
		}
		
		@HT(id = 48) public int regltFait;

		public int regltFait() {
			return regltFait;
		}

		public void regltFait(int value) {
			if (w(this.regltFait, value)) this.regltFait = value;
		}

		@HT(id = 49) public int panierAtt;

		public int panierAtt() {
			return panierAtt;
		}

		public void panierAtt(int value) {
			if (w(this.panierAtt, value)) this.panierAtt = value;
		}

		@HT(id = 61) public String descr;

		public String descr() {
			return descr;
		}

		public void descr(String value) {
			if (w(this.descr, value))
				this.descr = value != null && value.length() != 0 ? value : null;
		}

		@HT(id = 64) public int remiseCheque;
		
		public int remiseCheque() {
			return remiseCheque;
		}

		public void remiseCheque(int value) {
			if (w(this.remiseCheque, value)) this.remiseCheque = value;
		}

	}
	
	public class Noyau2 extends Noyau1 {
		@HT(id = 40) public int cheque;

		public int cheque() {
			return cheque;
		}

		public void cheque(int value) {
			if (w(this.cheque, value)) this.cheque = value;
		}

		@HT(id = 41) public int suppl;

		public int suppl() {
			return suppl;
		}

		public void suppl(int value) {
			if (w(this.suppl, value)) this.suppl = value;
		}

		@HT(id = 50) public int db;

		public int db() {
			return db;
		}

		public void db(int value) {
			if (w(this.db, value)) this.db = value;
		}

		@HT(id = 51) public int cr;

		public int cr() {
			return cr;
		}

		public void cr(int value) {
			if (w(this.cr, value)) this.cr = value;
		}
				
	}

	public class Noyau1 extends Noyau {
		@HT(id = 16) public int poidsC;

		public int poidsC() {
			return poidsC;
		}

		public void poidsC(int value) {
			if (w(this.poidsC, value)) this.poidsC = value;
		}

		@HT(id = 17) public int poidsD;

		public int poidsD() {
			return poidsD;
		}

		public void poidsD(int value) {
			if (w(this.poidsD, value)) this.poidsD = value;
		}

		@HT(id = 20) public int prixC;

		public int prixC() {
			return prixC;
		}

		public void prixC(int value) {
			if (w(this.prixC, value)) this.prixC = value;
		}

		@HT(id = 21) public int prixD;

		public int prixD() {
			return prixD;
		}

		public void prixD(int value) {
			if (w(this.prixD, value)) this.prixD = value;
		}

	}

	public class Noyau extends CellNode {
		@HT(id = 14) public int poids;

		public int poids() {
			return poids;
		}

		public void poids(int value) {
			if (w(this.poids, value)) this.poids = value;
		}

		@HT(id = 18) public int prix;

		public int prix() {
			return prix;
		}

		public void prix(int value) {
			if (w(this.prix, value)) this.prix = value;
		}

		@HT(id = 30) public int nblg;

		public int nblg() {
			return nblg;
		}

		public void nblg(int value) {
			if (w(this.nblg, value)) this.nblg = value;
		}

		@HT(id = 31) public int flags;

		public boolean distribEnCours(){
			return ((flags >> 3) & 1 ) != 0;
		}
		
		public int flags() {
			return flags;
		}

		public void flags(int value) {
			if (w(this.flags, value)) this.flags = value;
		}

		public void setFlags(Flag f, boolean value){
			int nv = setFlag(flags, f, value);
			if (w(this.flags, nv)) this.flags = nv;
		}

		public void unionAcApPrFlags(int value){
			int nv = (this.flags & 0xfff8) | (value & 0x7);
			if (w(this.flags, nv)) this.flags = nv;
		}

	}

}
