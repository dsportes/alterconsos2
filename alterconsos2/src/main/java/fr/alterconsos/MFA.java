package fr.alterconsos;

import fr.hypertable.MF;

public class MFA extends MF {

	public MFA(String pattern) {
		super(pattern);
	}

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	public static final MFA ANIMGACP = new MFA(
			"Pas d''animateur existant de code [{0}] dans le groupe " + " ou groupement [{1}]");
	public static final MFA GAPCCODE = new MFA(
			"Code [{0}] absent ou invalide pour un contact (producteur / alterconso)");
	public static final MFA GRPEXIST = new MFA(
			"Groupe / Groupement déjà existant [{0} / {1}]");
	public static final MFA GAPCNOM = new MFA(
			"Nom ou initilales absent ou invalide pour le contact de code [{0}]");
	public static final MFA GAPCNEX = new MFA(
			"Création d'un contact de code [{0}] mais le nom donné [{1}] diffère de celui enregistré [{2}]");
	public static final MFA GAPCNEX2 = new MFA(
			"Création d'un contact de code [{0}] mais les initiales données [{1}] diffèrent de celles enregistrées [{2}]");
	public static final MFA GAPCDN = new MFA("Nom dupliqué entre contacts de code [{0}] et [{1}]");
	public static final MFA GAPCDA = new MFA("Code adhérent dupliqué entre contacts de code [{0}] et [{1}]");
	public static final MFA GAPCDI = new MFA("Initiales dupliquées entre contacts de code [{0}] et [{1}]");
	public static final MFA GAP = new MFA("Aucun groupement n''a pour code [{0}]");
	public static final MFA GAC = new MFA("Aucun groupe n''a pour code [{0}]");
	public static final MFA TYPCTC = new MFA(
			"Code type de contact [{0}] invalide pour le groupe / groupement [{1}]");
	public static final MFA PWDC1 = new MFA(
			"Pour modifier le mot de passe du producteur / alterconso numéro 1, "
			+ "modifier le mot de passe au niveau animateur de groupe / groupement [{0}]");
	public static final MFA AUTH = new MFA(
			"Autorisation insuffisante pour modifier le groupe / groupement [{0}]");
	public static final MFA AUTHCSV = new MFA(
			"Autorisation insuffisante pour exporter l'address book de l'annuaire (administrateur d''annuiare requis)");
	public static final MFA CTLGAC = new MFA(
			"Produit [{0}] du producteur [{1}] du groupement [{2}] inconnu, activation / inactivation impossible");
	public static final MFA CTLGAC2 = new MFA(
			"Produit [{0}] du producteur [{1}] du groupement [{2}] inconnu, inactivation impossible. La livraison " + 
					"[{3}] n''est pas archivée et le produit est disponible");
	public static final MFA CTLGGAP = new MFA("Groupement [{0}] inconnu, catalogue non accessible");
	public static final MFA CALJLIVR = new MFA(
			"Jour relatif de livraison [{1}] doit être entre 0 et 7 dans la définition du calendrier du [{0}]");
	public static final MFA CALJLIVR2 = new MFA(
			"Jour de semaine de livraison [{1}] doit être entre -1 (Lu) et -7 (Di) dans la définition du calendrier du [{0}]");
	public static final MFA CALHLIVR = new MFA(
			"Heure de livraison [{1}] doit être entre 0 et 24 dans la définition du calendrier du [{0}]");
	public static final MFA CALHLIVRAC = new MFA(
			"Clôture de livraison pour les AC [{1}] doit être entre 0 et 23 heures avant l'heure limite dans la définition du calendrier du [{0}]");
	public static final MFA CALJDISTR = new MFA(
			"Jour relatif de distribution [{1}] doit être entre 0 et 30 dans la définition du calendrier du [{0}]");
	public static final MFA CALJDISTR2 = new MFA(
			"Jour de semaine de distribution [{1}] doit être entre -1 (Lu) et -7 (Di) dans la définition du calendrier du [{0}]");
	public static final MFA CALHDISTR = new MFA(
			"Heure de distribution [{1}] doit être entre 0 et 24 dans la définition du calendrier du [{0}]");
	public static final MFA CALREDUC = new MFA(
			"Taux de réduction [{1}] doit être entre 0 et 100 dans la définition du calendrier du [{0}]");
	public static final MFA CALLIVR = new MFA(
			"Code livraison [{0}] invalide (doit être entre 1 et 999)");
	public static final MFA CALCLIVR = new MFA(
			"Code livraison [{1}] invalide pour le calendrier du groupement [{0}]");
	public static final MFA CALARCH = new MFA(
			"Livraison [{1}] archivée pour le calendrier du groupement [{0}] : inactovation / activation impossible");
	public static final MFA CALCLIVR2 = new MFA(
			"Livraison [{1}] inconnue pour le groupe [{2}] pour le calendrier du groupement [{0}]");
	public static final MFA CALANG = new MFA(
			"Le groupement [{0}] est annulé ou inexistant : mise à jour du calendrier impossible");
	public static final MFA CALANG2 = new MFA(
			"Le groupe [{0}] est annulé ou inexistant : mise à jour du calendrier impossible");
	public static final MFA LIVRCGAC = new MFA(
			"Le groupe [{0}] est annulé ou inexistant : comande / distribution / paiement");
	public static final MFA CALJARCH = new MFA(
			"Jour relatif d'archivage [{1}] doit être entre 0 et 90 dans la définition du calendrier du [{0}]");
	public static final MFA CALHLIMI = new MFA(
			"Heure limite de commande [{1}] doit être entre 0 et 24 dans la définition du calendrier du [{0}]");
	public static final MFA CALLIMI1 = new MFA(
			"Date limite [{1}] n''est pas un jour relatif entre 0 et 100 dans la définition du calendrier du [{0}]");
	public static final MFA CALOUV1 = new MFA(
			"Date d''ouverture [{1}] n''est pas un jour relatif entre 0 et 365 dans la définition du calendrier du [{0}]");
	public static final MFA CALOUV = new MFA(
			"Date d''ouverture [{1}] doit être antérieure à la date limite [{2}] dans la définition du calendrier du [{0}]");
	public static final MFA CALLIMI = new MFA(
			"Date limite de commande [{1}] doit être antérieure à la date d''expédition [{1}] dans la définition du calendrier du [{0}]");
	public static final MFA CALEXPED = new MFA(
			"Date d''expédition [{1}] doit être entre [{2}] et [{3}] dans la définition du calendrier du [{0}]");
	public static final MFA AUTHCAL = new MFA(
			"Autorisation insuffisante pour modifier le calendrier du groupement [{0}]");
	public static final MFA AUTHCAL2 = new MFA(
			"Impossible de modifier le calendrier du groupement [{0}] pour un animateur de groupe");
	public static final MFA AUTHCAL3 = new MFA(
			"Impossible de modifier la livraison à un groupe du calendrier du groupement [{0}] pour un animateur de groupement");
	public static final MFA AUTHCAT = new MFA(
			"Autorisation insuffisante pour modifier le catalogue du groupement [{0}]");
	public static final MFA CALACTIV = new MFA(
			"Activation / inactivation impossible : calendrier du [{0}] non défini");
	public static final MFA CALREPART = new MFA(
			"Enregistrement de la répartition en camions impossible : calendrier du [{0}] non défini");	
	public static final MFA DUPEXPED = new MFA(
			"Livraison [{0}] du groupement [{1}] : date d''expédition [{2}] non acceptable : la livraison [{3}] est déjà programmée avec cette date d''expédition");
	public static final MFA COPYPRX = new MFA(
			"Copie de prix entre livraisons impossible : calendrier du [{0}] non défini");
	public static final MFA TWTANG = new MFA(
			"Le groupement [{0}] est annulé ou inexistant : création / modification de messages impossible");
	public static final MFA TWEETDEL = new MFA(
			"Suppression impossible du tweet [{3}] de la livraison [{1}] du groupement [{0}} au groupe [{2}], sauf pour l''auteur du tweet");
	public static final MFA TWEETTXT = new MFA(
			"Pas de texte pour le tweet à créer de la livraison [{1}] du groupement [{0}} au groupe [{2}]");
	public static final MFA CALNLIVR1 = new MFA(
			"Date [{1}] incorrecte pour la création d'une nouvelle livraison pour le groupement [{0}]");
	public static final MFA CALCOPYL = new MFA(
			"Une livrraison [{1}] ne peut pas être copiée sur elle-même pour le groupement [{0}]");
	public static final MFA CATLIVR = new MFA(
			"Code livraison [{1}] inconnu au calendrier des livraisons pour fixer un prix du catalogue du groupement [{0}]");
	public static final MFA CATAP = new MFA(
			"Code producteur [{1}] inconnu dans les producteurs du groupement [{0}] pour citer un produit du catalogue");
	public static final MFA CATANAP = new MFA(
			"Producteur [{1}] du groupement [{0}] annulé : modification impossible du catalogue");
	public static final MFA CATDNOM = new MFA(
			"Nom de produit dupliqué pour la mise à jour du catalogue [{0}]");
	public static final MFA CAT99 = new MFA(
			"Plus de 99 produits du type [{1}] et du rayon [{2}] pour la mise à jour du catalogue [{0}]");
	public static final MFA CATNEX = new MFA(
			"Produit inexistant de code [{1}] pour la mise à jour du catalogue [{0}]");
	public static final MFA CATNOM = new MFA(
			"Nom de produit requis pour la livra le [{0}] avec le produit [{2}] du producteur [{1}]");
	public static final MFA CATANN = new MFA(
			"Le produit [{2}] du producteur [{1}] du groupement [{0}] est annulé : mise à jour impossible");
	public static final MFA CATLVX = new MFA(
			"Le groupement [{0}] n''a pas de livraison pour la date [{1}]");
	public static final MFA CATLVX2 = new MFA(
			"Aucun groupement n''a pas de livraison pour la date [{0}]");
	public static final MFA CATANG = new MFA(
			"Le groupement [{0}] est annulé ou inexistant : mise à jour du catalogue impossible");
	public static final MFA CATPRX = new MFA(
			"Le produit [{2}] correspond à un producteur [{1}] inconnu dans  le groupement [{0}]");
	public static final MFA CATPR = new MFA(
			"Code produit [{2}] incorrect pour le producteur [{1}] du groupement [{0}]");
	public static final MFA CATQMAX = new MFA(
			"Quantité maximum [{1}] incorrecte (pas entre 1 et 999) pour le [{0}]");
	public static final MFA CATDISPO = new MFA(
			"Code disponilité [{1}] incorrect (pas entre 0 et 3) pour le [{0}]");
	public static final MFA CATPUPOIDS = new MFA(
			"Ni le prix unitaire, ni le poids, ne peuvent être 0 pour le [{0}]");
	public static final MFA CATPU = new MFA(
			"Prix unitaire [{1}] incorrect (pas entre 0,01 et 999,99€) pour le [{0}]");
	public static final MFA CATPVRAC = new MFA(
			"Poids vrac unitaire [{1}] incorrect (pas entre 0,001 et 99,999Kg) pour le [{0}]");
	public static final MFA CATPPAR = new MFA(
			"Parite [{1}] incorrecte (pas entre 0 et 4) pour le [{0}]");
	public static final MFA CATPROD2 = new MFA(
			"Impossible de définir un prix quand le produit n''est pas déclaré pour le [{0}]");
	public static final MFA CATPRARCH = new MFA(
			"Impossible de définir un prix pour une livraison archivée : [{0}]");
	public static final MFA CATCAL = new MFA(
			"Livraison inconnue au calendrier et mentionnée pour définir un prix de produit pour le [{0}]");
	public static final MFA LIVANG = new MFA(
			"Le groupement [{0}] est annulé ou inexistant : mise à jour des commandes / livraisons / paiements impossible");
	public static final MFA CDSLIVR = new MFA(
			"{0}. Sous livraison au groupe non définie au calendrier");
	public static final MFA CDACI = new MFA("{0}. Alterconso inconnu");
	public static final MFA CDAPI = new MFA("{0}. Producteur inconnu");
	public static final MFA CDAMI = new MFA("{0}. Producteur inconnu");
	public static final MFA CDPROD = new MFA("{0}. Produit non défini au catalogue");
	public static final MFA CDCAL1 = new MFA("{0}. Opération interdite, la livraison est archivée");
	public static final MFA CDAN1 = new MFA("{0}. Opération interdite, la livraison est annulée");
	public static final MFA CDCAL2 = new MFA(
			"{0}. Opération interdite, la livraison n''est pas encore ouverte aux commandes");
	public static final MFA CDEX8 = new MFA("BUG-S Le produit n''a pas de poids ou de prix pour cette commande."
			+ " Contacter votre animateur afin qu'il joigne l'animateur technique afin de contouner ce problème");
	public static final MFA CDEX1 = new MFA("{0} Produit absent");
	public static final MFA CDEX1b = new MFA("{0} Le Produit {1} doit être un pré-emballé");
	public static final MFA CDEX2 = new MFA("{0} Alterconso absent");
	public static final MFA CDEX3 = new MFA("{0} Quantité négative");
	public static final MFA CDEX4 = new MFA("{0} Poids négatif");
	public static final MFA CDEX4b = new MFA("{0} Poids par défaut négatif");
	public static final MFA CDEX5 = new MFA("{0} Montant du chèque négatif");
	public static final MFA CDEX6 = new MFA("{0} Montant payé par l''ami négatif");
	public static final MFA CDEX7 = new MFA("{0} Une quantité ou un poids sont requis");
	public static final MFA CDEX7b = new MFA("{0} Une quantité est requise");
//	public static final MFA CDEX7g = new MFA("{0} La déclaration de chargement n''est plus possible après la date d''expédition.");
	public static final MFA CDEX7h = new MFA("{0} La déclaration de réception / distribution n''est pas possible avant la date d''expédition.");
	public static final MFA CDEX7a2 = new MFA("{0} La liste de prix existe, la quantité ou le poids total du chargement ne peut pluss être donné (modifier la liste des paquets)");
	public static final MFA CDEX7a = new MFA("{0} La liste de prix existe, le poids ne peut pas être donné");
	public static final MFA MPMOBS = new MFA("Opération 46 -majPaquetsManquants- obsolète");
	public static final MFA RAZOBS = new MFA("Opération 47 -RAZ commande / distribution- obsolète");
	public static final MFA CDEX7c = new MFA(
			"{0} Un poids et/ou une quantité sont requis");
	public static final MFA CDEX7d = new MFA(
			"{0} Produit non disponible ou non livré au groupe, seule une quantité 0 est autorisée");
	public static final MFA CDEX7e = new MFA(
			"{0} Pré-emballés, liste de prix donnée sans cible de mise à jour");
	public static final MFA CDEX7i = new MFA(
			"{0} Pré-emballés, liste de prix et liste de quantités inexistantes");
	public static final MFA CDEX7j = new MFA(
			"{0} Pré-emballés, liste de quantités non autorisées aux producteurs / groupements");
	public static final MFA CDEX7f = new MFA(
			"{0} Pré-emballés, cible de mise à jour de liste de prix inexistante");
	public static final MFA CDEX9 = new MFA(
			"{0} Un poids n''est accepté que pour du vrac en phase de distribution");
	public static final MFA CDEX7z = new MFA(
			"{0} Pré-emballés, ajouter des paquets manquants est réservé à l''animateur de groupe");
	public static final MFA CDEX9b = new MFA(
			"{0} Un poids ne peut pas être donné en phase de commande pour du vrac");
	public static final MFA CDEX9c = new MFA(
			"{0} Poids et quantité ne peuvent pas être donnés tous les deux");
	public static final MFA CDEX9d = new MFA(
			"{0} Poids et/ou quantité sont requis");
	public static final MFA CDEX12 = new MFA("{0} Alterconso ''ami'' absent alors qu''une somme est payée par lui");
	public static final MFA CDEX12b = new MFA("{0} Alterconso ''ami'' présent alors qu''aucune somme n''est payée par lui");
	public static final MFA CDEX13 = new MFA("{0} Alterconso ''ami'' égal à l''alterconso lui-même");
	public static final MFA CDEX14 = new MFA(
			"{0} Un producteur payé par le groupement ne reçoit pas de chèque");
	public static final MFA CDEX14b = new MFA(
			"{0} Un paiement (chèque, supplément, payé par) n'est pas possible pour un producteur payé par le groupement");
	public static final MFA CDEX13b = new MFA(
			"{0} Chèque, ou montant ami, ou supplément, ou descriptif sont requis");
	public static final MFA CDEX13c = new MFA(
			"{0} Totale remise chèque requis");
	public static final MFA CDEX13x = new MFA(
			"{0} supplément / avoir non 0, un descriptif est requis");
	public static final MFA CDEX13e = new MFA("{0} Un montant de régularisation est requis");
	public static final MFA CDEX13f = new MFA("{0} Une liste de paquets et une cible sont requis");
	public static final MFA CDEX13g = new MFA("{0} Un prix de paquet est requis");
	public static final MFA CDEX11 = new MFA("{0} Producteur absent");
	public static final MFA AUTHCD1 = new MFA(
			"{0} Autorisation insuffisante pour modifier la commande / distribution");
	public static final MFA AUTHCD2 = new MFA(
			"{0} Autorisation insuffisante, un alterconso ne peut changer "
					+ "que sa propre commande et seulement en phase de commande");
	public static final MFA AUTHCD3 = new MFA(
			"{0} Un animateur de groupe ne peut changer les commandes "
					+ "qu'avant la limite ou après le début de la livraison");
	public static final MFA AUTHCD4 = new MFA(
			"{0} Autorisation insuffisante, un groupement ne peut que changer que ses propres livraisons");
	public static final MFA CDER1 = new MFA(
			"{0} Opération interdite aux groupements en phase de distribution");
	public static final MFA CDDIS2 = new MFA(
			"{0} Description de distribution incorrecte : terme [{1}], quantité invalide");
	public static final MFA CDDIS3 = new MFA(
			"{0} Description de distribution incorrecte : terme [{1}], alterconso inconnu");
	public static final MFA CDDIS4 = new MFA(
			"{0} Cible de liste de prix incorrecte : [{1}] alterconso inconnu");
	public static final MFA CDDIS5 = new MFA(
			"{0} Prix incorrect pour les paquets manquants");
	public static final MFA ERPROD1 = new MFA(
			"{0} Description de liste de livraison / réception incorrecte : terme [{1} - produit ?]");
	public static final MFA ERPROD2 = new MFA(
			"{0} Description de liste de livraison / réception incorrecte : terme [{1} - quantité ?]");
	public static final MFA ERPROD3 = new MFA(
			"{0} Description de liste de livraison / réception incorrecte : terme [{1} - poids ?]");
	public static final MFA ERPROD4 = new MFA(
			"{0} Description de liste de livraison / réception incorrecte : terme [{1} - quantité et poids absents ?]");
	public static final MFA CDAC1 = new MFA(
			"{0} Description de liste de commande / distribution incorrecte : terme [{1} - produit ?]");
	public static final MFA CDAC2 = new MFA(
			"{0} Description de liste de commande / distribution incorrecte : terme [{1} - quantité ?]");
	public static final MFA CDAC3 = new MFA(
			"{0} Description de liste de commande / distribution incorrecte : terme [{1} - poids ?]");
	public static final MFA CDAC4 = new MFA(
			"{0} Description de liste de commande / distribution incorrecte : terme [{1} - quantité et poids absents ?]");

	public static final MFA PRES1 = new MFA(
			"{0} N'est pas une date valide");
	public static final MFA PRES2 = new MFA(
			"{0} N'est pas un lundi");
	public static final MFA PRES3 = new MFA(
			"{0} Jour de semaine pas entre 1 et 7");
	public static final MFA PRES4 = new MFA(
			"{0} Alterconso inconnu");
	public static final MFA PRES5 = new MFA(
			"{0} Un alterconso ne peut modifier que sa propre présence");

}
