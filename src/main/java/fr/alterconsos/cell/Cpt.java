package fr.alterconsos.cell;

public class Cpt {
	
	Calendrier.Livr l;
	int prix;
	int poids;
	int nblg;
	int db;
	int cr;
	int nbac;
	int nbpAtt;
	int nbpReg;
	
	public Cpt(Calendrier.Livr cl, int pr, int po, int n, int d, int c, int ac, int pA, int pR){
		l = cl;
		prix = pr;
		poids = po;
		nblg = n;
		db = d;
		cr = c;
		nbac = ac;
		nbpAtt = pA;
		nbpReg = pR;
	}

	public Cpt(Calendrier.Livr cl){
		l = cl;
	}

	public boolean notzero(){
		return prix != 0 || poids != 0 || nblg != 0 || db != 0 || cr != 0 || nbac != 0 || nbpAtt != 0 || nbpReg != 0;
	}

}
