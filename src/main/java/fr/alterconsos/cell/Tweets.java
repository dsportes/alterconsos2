package fr.alterconsos.cell;

import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedList;

import fr.alterconsos.MFA;
import fr.alterconsos.cell.Calendrier.Livr;
import fr.hypertable.AppException;
import fr.hypertable.AppTransaction;
import fr.hypertable.Cell;
import fr.hypertable.CellDescr;
import fr.hypertable.DirectoryG;
import fr.hypertable.HT;
import fr.hypertable.HTCN;
import fr.hypertable.IAuthChecker;
import fr.hypertable.MF;
import fr.hypertable.Operation;
import fr.hypertable.AppTransaction.StatusPhase;

public class Tweets extends Cell {

	public static final CellDescr cellDescr = new CellDescr(Tweets.class);

	@Override public CellDescr cellDescr() {
		return cellDescr;
	}

	private int gap = 0;

	@Override public void setIds() {
		String[] s = line().split("\\.");
		gap = Integer.parseInt(s[1]);
	}

	public int gap() {
		return gap;
	}

	public static Tweets get(int gap) throws AppException {
		String l = GAP.lineOf(gap);
		Cell c = Cell.get(l, "0.", "Tweets");
		return (Tweets) c;
	}

	// @Override public void compile(AppTransactionS tr) throws AppException {
	// // recup bug
	// super.compile(tr);
	// for(CellNode cn : nodesByKey("T.")){
	// Tweet t = (Tweet)cn;
	// if (t.origineGac() && t.gac() == 0)
	// t.gac = 2;
	// }
	// }

	private Tweet newTweet(int codeLivr) {
		Entete e = (Entete) nodeByKey("E");
		if (e == null) {
			e = new Entete();
			e.numero = 1;
			e.insert();
		} else e.numero((short) (e.numero + 1));
		Tweet t = new Tweet();
		t.numero = e.numero;
		t.codeLivr = codeLivr;
		t.insert();
		return t;
	}

	@HTCN(id = 2) public class Entete extends CellNode {
		@Override public String[] keys() {
			String[] keys = { "E" };
			return keys;
		}

		@HT(id = 1) private short numero;

		public void numero(short value) {
			if (w(numero, value)) numero = value;
		}
	}

	Tweet tweet(int numero) {
		return (Tweet) nodeByKey("T." + numero);
	}

	Tweet[] getTweets(Livr l, int select, int gac) {
		AppTransaction tr = AppTransaction.tr();
		LinkedList<Tweet> lst = new LinkedList<Tweet>();
		for (CellNode cn : nodesByKey("T.")) {
			Tweet t = (Tweet) cn;
			if (t.texte() != null && l.gap() == this.gap() 
					&& l.codeLivr() == t.codeLivr && t.jsonFields(tr, null) == null) {
				t.gap = this.gap();
				switch (select){
				case 0 : {
					lst.add(t);
					continue;
				}
				case 1 : {
					if (!t.origineGac())
						lst.add(t);
					continue;
				}
				case 2 : {
					if (t.origineGac() && t.gac == gac)
						lst.add(t);
					continue;					
				}
				}
			}
		}
		Tweet[] tw = lst.toArray(new Tweet[lst.size()]);
		Arrays.sort(tw, new Comparator<Tweet>() {
			@Override public int compare(Tweet o1, Tweet o2) {
				if (o1.gap < o2.gap)
					return -1;
				if (o1.gap > o2.gap)
					return 1;
				return o1.version() < o2.version() ? 1 : (o1.version() == o2.version() ? 0 : 1);
			}
		});
		return tw;
	}

	@HTCN(id = 1) public class Tweet extends CellNode {
		@Override public String[] keys() {
			String[] keys = { "T." + numero, "L." + codeLivr + "." + numero + "." };
			return keys;
		}

		int gap;

		@HT(id = 1) private int numero;

		public int numero() {
			return numero;
		}

		@HT(id = 2) private int flags;

		/*
		 * 4 chiffres
		 * 
		 * origine gac: 0:gap 1:gac (ac si ac != 0)
		 * 
		 * cible producteurs: 0:non 1:oui
		 * 
		 * cible alterconsos: 0:non 1:oui
		 * 
		 * urgence: 0:non 1:oui
		 */
		public int flags() {
			return flags;
		}

		public boolean origineGac() {
			return (flags / 1000) > 0;
		}

		public boolean ciblePr() {
			return ((flags / 100) % 10) > 0;
		}

		public boolean cibleAc() {
			return ((flags / 10) % 10) > 0;
		}

		public boolean urgence() {
			return (flags % 10) > 0;
		}

		@HT(id = 3) private int gac;

		/*
		 * gac origine (si flag origine == 1) et destinataire (dans tous les
		 * cas)
		 */
		public int gac() {
			return gac;
		}

		@HT(id = 4) private int ac;

		public int ac() {
			return ac;
		}

		@HT(id = 5) private String texte;

		public String texte() {
			return texte;
		}

		public void texte(String value) {
			if (w(texte, value)) texte = value;
		}

		@HT(id = 6) private int codeLivr;

		public int codeLivr() {
			return codeLivr;
		}

		@Override public int[] jsonFields(AppTransaction tr, String filterArg) {
			IAuthChecker ack = tr.authChecker;
			int authType = ack.getAuthType();
			if (authType == IAuthChecker.ADMINGEN)
				return null;
			if (authType == 2) {
				// GAP / AP
				boolean b1 = Tweets.this.gap() == ack.getAuthGrp();
				if (!b1) 
					return non;
				if (!origineGac()) 
					return null;
				if (ciblePr())
					return null;
				else
					return non;
			}
			// GAC / AC
			if (authType == 1) {
				int usr = ack.getAuthUsr();
				boolean b1 = origineGac();
				boolean b2 = ack.getAuthGrp() == gac();
				if (usr == 0) {
					if (b1) { 
						if (b2)
							return null;
						return non;
					} else {
						return null;
					}
				} else {
					if (b1) {
						if (b2) { 
							if (cibleAc() || usr == ac)
								return null;
							else
								return non;
						} else
							return non;
					} else {
						if (cibleAc())
							return null;
						else
							return non;						
					}
				}
			}
			return non;
		}
	}

	private static final int[] non = new int[0];

	public static class Op extends Operation {

		String line;
		String col;
		String nomGap;
		int gap = 0;
		int gac = 0;
		int ac = 0;
		int livr;
		int numero;
		int at;
		int pwr;
		String texte;
		int flags;

		@Override public String mainLine() {
			return line;
		}

		public StatusPhase phaseFaible() throws AppException {
			numero = arg().getI("numero", 0);

			at = authChecker.getAuthType();
			pwr = authChecker.getAuthPower();
			if (pwr >= 5) throw new AppException(MF.ANNUL);
			boolean origineGac = false;
			if (at == 1) {
				gap = arg().getI("gap", 0);
				origineGac = true;
				gac = authChecker.getAuthGrp();
				if (pwr > 2) ac = authChecker.getAuthUsr();
			} else gap = authChecker.getAuthGrp();

			DirectoryG.Entry e = GAP.gapEntry(gap);
			if (e == null || e.suppr() != 0) throw new AppException(MFA.TWTANG, gap);
			nomGap = e.label();

			livr = arg().getI("codeLivr", 0);
			if (livr < 1 || livr > 999) throw new AppException(MFA.CALCLIVR, gap, livr);
			Livr l = Calendrier.staticLivr(gap, livr, gac);
			if (l == null) if (gac == 0)
				throw new AppException(MFA.CALCLIVR, nomGap, livr);
			else throw new AppException(MFA.CALCLIVR2, nomGap, livr, gac);

			if (numero == 0) {
				texte = arg().getS("texte", null);
				if (texte == null || texte.length() == 0)
					throw new AppException(MFA.TWEETTXT, nomGap, livr, gac);
				if (texte.length() > 240) texte = texte.substring(0, 240);
			}
			boolean urgence = (arg().getI("urgence", 0) != 0);
			boolean cibleAc = (arg().getI("cibleAc", 0) != 0);
			boolean ciblePr = (arg().getI("ciblePr", 0) != 0);
			if (!origineGac) ciblePr = true;
			flags = origineGac ? 1000 : 0;
			flags += (ciblePr ? 100 : 0);
			flags += (cibleAc ? 10 : 0);
			flags += (urgence ? 1 : 0);

			line = GAP.lineOf(gap);
			return StatusPhase.transactionSimple;
		}

		public void phaseForte() throws AppException {
			Tweets tweets = get(gap);

			if (numero != 0) {
				// suppression
				Tweet t = tweets.tweet(numero);
				if (t == null) return;
				boolean ok = false;
				if (at == 1) {
					if (pwr > 2)
						ok = t.origineGac() && (t.gac == gac) && (t.ac == ac);
					else ok = t.origineGac() && (t.gac == gac);
				} else ok = !t.origineGac();
				if (!ok) throw new AppException(MFA.TWEETDEL, nomGap, livr, gac, numero);
				t.texte(null);
				return;
			} else {
				// création
				Tweet t = tweets.newTweet(livr);
				t.flags = flags;
				t.gac = gac;
				t.ac = ac;
				t.texte(texte);
			}
		}

	}

}
