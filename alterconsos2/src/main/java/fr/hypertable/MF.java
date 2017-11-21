package fr.hypertable;

import java.text.MessageFormat;

public class MF extends MessageFormat {

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	public MF(String pattern) {
		super(pattern);
	}

	public static final MF EXC = new MF("BUG-S - Erreur inattendue");

	public static final MF MAILSRV = new MF("BUG-S - Accès serveur de mail :[{0}]");

	public static final MF MAILTASK = new MF("BUG-S - Erreur de la tâche envoi de mails :[{0}]");

	public static final MF ADMINC = new MF(
			"BUG-S - Erreur rencontrée lors d'une commande ''admin'', Raison:[{0}]");
	public static final MF PUTDOC = new MF(
			"BUG-S - Erreur rencontrée lors du stockage d''un document, Raison:[{0}] Doc=[{1}]");
	public static final MF DUMP = new MF(
			"BUG-S - Erreur rencontrée lors du dump. Ligne:[{0}], Raison:[{1}]");
	public static final MF LOAD = new MF(
			"BUG-S - Erreur rencontrée lors du load. Ligne:[{0}], Raison:[{1}]");
	public static final MF OP = new MF("BUG-C - L''opération [{0}] est inconnue");
	public static final MF OPX = new MF(
			"BUG-S - L''opération n''est pas constructible pour la commande [{0}]");
	public static final MF IO = new MF(
			"BUG-C - IO Exception au cours de conversion en Excel : [{0}]");
	public static final MF JSON = new MF(
			"BUG-C - Le texte JSON du POST est absent ou mal formé\n{0}");

	public static final MF STOPPED = new MF("Exécution stoppée sur demande de l'administrateur");
	public static final MF ANNUL = new MF("Opération non autorisé depuis un compte annulé");
	public static final MF TEST = new MF("Erreur volontaire de test [{0}]");
	public static final MF BADDIR = new MF("Annuaire [{0}] inexistant");
	public static final MF COLUMN = new MF("Nom de colonne mal formé [{0}]");
	public static final MF ADMING = new MF(
			"Action autorisée seulement à l''administrateurs général");
	public static final MF ADMINL = new MF(
			"Action autorisée seulement aux administrateurs d'annuaire");
	public static final MF ADMINA = new MF(
			"Action autorisée seulement aux animateurs identifié par le mot de passe principal");
	public static final MF ADMIN = new MF(
			"Action autorisée seulement pour les Administrateurs Généraux et Locaux");
	public static final MF DIRTYPE = new MF(
			"Mise à jour du directory [{0}]: type [{1}] incorrect ou absent");
	public static final MF DIRACT = new MF("Directory [{0}] inconnu pour activation / annulation / effacement mot de passe / mise à jour des identifiants");
	public static final MF DIRCODE = new MF(
			"Mise à jour du directory [{0}], type [{1}]: code incorrect [{2}] ou absent");
	public static final MF IMPDIR = new MF(
			"Mise à jour du directory [{0}], type [{1}]: code annuaire d''importation [{2}] illégal ou absent");
	public static final MF IMPPWD = new MF(
			"Mise à jour du directory [{0}], type [{1}]: mot de passe dans l''annuaire d''importation [{2}] illégal ou absent");
	public static final MF DIRRMV1 = new MF(
			"Retrait du directory [{0}] de l''entréé de type [{1}], code [{2}]: entrée encore active");
	public static final MF DIRIMP = new MF(
			"Import dans le directory [{0}], type [{1}], code [{2}]: import impossible dans le directory maitre");
	public static final MF DIRIMP2 = new MF(
			"Import dans le directory [{0}], type [{1}], code [{2}]: entrée déjà existante");
	public static final MF DIRIMP3 = new MF(
			"Import dans le directory [{0}], type [{1}], code [{2}]: seuls les types 1 (GAC) et 2 (GAP) sont autorisés");
	public static final MF DIRLAB = new MF(
			"Création d'une nouvelle entrée du directory [{0}], type [{1}], code [{2}]: label ou initiales absent (obligatoires)");
	public static final MF DIRP2B = new MF(
			"Changement de mots de passe secondaire du directory [{0}], type [{1}], code [{2}]: non autorisé à changer ce type d'entrée");
	public static final MF DIRLABD = new MF(
			"Mise à jour du directory [{0}], type [{1}], code [{2}]: label ou initiales déjà attribué à l''entrée [{3}]");
	public static final MF DIRLABD2 = new MF(
			"Mise à jour du directory [{0}], directory de code [{1}]: label ou initiales déjà attribué à l''entrée [{3}] dans le directory maitre");
	public static final MF DIRUPD = new MF(
			"Mise à jour d'une entrée du directory [{0}], type [{1}], code [{2}]: entrée inexistante");
	public static final MF DIRENTX = new MF("Entrée du directory inconnue [{0}], label [{1}]");
	public static final MF BADIMP = new MF(
			"Import refusé du code d''accès [{0}], type [{1}] pour le directory [{2}]: code non attribué");
	public static final MF PHOTO = new MF("PHOTO : l''autorisation est insuffisante");
	public static final MF REFLECT = new MF(
			"BUG-S - Exception de type ''reflection'' sur la classe - {0}");
	public static final MF NOTCOL = new MF("BUG-S - {0} n''est pas un type connu");
	public static final MF GETCELL = new MF(
			"BUG-S - Get d'une Cellule sans line ou column ou cellType");
	public static final MF GETCELLRO = new MF(
			"BUG-S - Get faible en phase forte d'une Cellule non accédée"
					+ " préalablement en phase faible {0}");
	public static final MF LINE1 = new MF(
			"BUG-S - L''opération {0} tente d''écrire sans avoir ouvert une transaction");
	public static final MF DIRGRPX = new MF(
			"Création / import du groupe / groupement [type [{0}], initiales [{1}], label [{2}]: label ou initiales déjà attribué à l''entrée [{3}]");
	public static final MF BADIMP0 = new MF(
			"Import refusé du groupe / groupement [type {0}], code [{1}] depuis l''annuaire [{2}]: annuaire inconnu");
	public static final MF BADIMP1 = new MF(
			"Import refusé du groupe / groupement [type {0}], code [{1}] depuis l''annuaire [{2}]: code inconnu");
	public static final MF BADIMP2 = new MF(
			"Import refusé du groupe / groupement [type {0}], code [{1}] depuis l''annuaire [{2}]: mot de passe incorrect");
	public static final MF DIRGRPR = new MF(
			"Suppression du groupe / groupement [type [{0}], code [{1}]] impossible : inconnu");
	public static final MF DIRSUPPR = new MF(
			"Action impossible sur [type [{0}], code [{1}]] : groupe / groupement inexistant ou supprimé");
	public static final MF DIRSUPPR2 = new MF(
			"Action impossible sur l''annuaire de code [{0}]] : inexistant ou supprimé");
	public static final MF DIRPWD = new MF(
			"Mise à jour de mot de passe impossible sur l''annuaire de code [{0}]] : mot de passe absent");
	public static final MF DIRPWD2 = new MF(
			"Mise à jour de mot de passe impossible sur le groupe / groupement de code [{0}]] : mot de passe absent");
	public static final MF DUMPZIP = new MF(
			"Erreur I/O lors du ZIP de la ligne : [{0}]");

	public static final MF XSQLDS = new MF(
			"DataSource non trouvée / non initialisable");
	public static final MF XSQLB = new MF(
			"Erreur sql début transaction - operation : [{0}]");
	public static final MF XSQLC = new MF(
			"Erreur sql commit transaction - operation : [{0}]");
	public static final MF XSQL0 = new MF(
			"Erreur sql connexion - operation : [{0}]");
	public static final MF XSQL1 = new MF(
			"Erreur sql - operation : [{0}]; sql:[{1}]");
}
