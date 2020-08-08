AC.Help = function(){}
AC.Help._static = { 
		
		baseUrl : "https://alterconsos.fr/apphelp/",
			
		notFound : "technique/etc/redaction-en-cours",
		
		gotoHelp : function(href){
			if (AC.dbg)
				AC.info("Help href : [" + href + "]");
			var x = AC.helplinks[href];
			if (x == undefined)
				this.url = AC.Help.baseUrl + AC.Help.notFound;
			else
				this.url = x.substring(0,1) != "<" ? AC.Help.baseUrl + x : null;
			if (this.url) {
				AC.Message.error("Pour des raisons de sécurité du navigateur, "
						+ "la page d'aide s'ouvre dans un autre onglet / fenêtre");
				var s = this.url ? this.url : this.baseUrl;
				window.open(s, "_blank");
			} else
				new AC.Help().init(x);
		}
					
	}

AC.Help._proto = {
	init : function(text){
		var t = new StringBuffer();
		t.append("<div class='acDivScroll'><div style='padding:0 1rem;'>");
		t.append(text);
		AC.SmallScreen.prototype.init.call(this, 600, t.append("</div></div>").toString(), false, true, 
				"Aide");
		this.show();
		this.top();
	}
}
AC.declare(AC.Help, AC.SmallScreen);

AC.helplinks = {
	home : "", 
	Login:"vues/vue-login",
	helpinfo : "vues/vue-aide-en-ligne",
	Page_login : "vues/vue-entree",
	About : "vues/vue-a-propos",
	Page_ac2 : "vues/vue-entree",
	PrintBox : "technique/savejpg",
	KBLPGac2 : "vues/kblp",
	Paiement2 : "vues/paiements",
	// LV1 : "vues/lv1",
		
	PbTech : "<h2 id='PbTech'>Petit problème technique ... que faire ?</h2>" +
			"<div class='achelp-par'>" +
			"Si la cause du problème est temporaire (comme une interruption de " +
			"réseau, un serveur saturé ou tombé ...), il ne sert à rien de \"sortir\" " +
			"de l'application pour y rentrer à nouveau. La page affichée n'étant " +
			"pas connectée au serveur, tout rentre dans l'ordre dès le réseau " +
			"rétabli : en particulier si une mise à jour a été demandée et qu'un " +
			"incident en résulte, lire soigneusement ce qui est affiché et qui " +
			"indique si oui ou non la mise à jour a été enregistrée par le serveur " +
			"ou si l'incident s'est produit avant.<br> Dans la plupart des cas " +
			"il suffit de choisir l'option \"essayer à nouveau\" pour que rien n'ait " +
			"été perdu ni n'ait besoin d'être saisi à nouveau, et <b>rien ne " +
			"risque d'être fait en double</b>.<br> Si l'incident est lié à un " +
			"problème de serveur sur le nuage, il est rare de s'en rendre compte : " +
			"d'une action à la suivante ce n'est pas forcément le même serveur qui " +
			"répond et en cas de tombée de l'un, un autre de secours est relancé " +
			"sans perception du problème à l'autre bout ... sauf que <i>\"ça a " +
			"mis un peu plus de temps à répondre que d'habitude\"</i>.<br> Mais la " +
			"cause du problème peut aussi être de longue durée : les coupures " +
			"Internet ne sont pas toujours courtes. Tout dépend de la patience du " +
			"producteur ou de l'alterconso derrière l'écran : il suffit de " +
			"réappuyer sur le bouton de \"synchronisation\" : dès qu'il affiche \"0s\" " +
			"... c'est que ça marche à nouveau.<br> Enfin il peut y avoir des \"bugs\" :" +
			"<ul><li><i><b>soit de la page dans le navigateur :</b></i> c'est " +
			"figé, ça affiche n'importe quoi ... bref dans ce cas fermer la page, " +
			"s'identifier à nouveau et recommencer : si le malaise persiste, " +
			"essayer de joindre un animateur, un administrateur ou l'auteur du " +
			"programme (et du bug!). A défaut d'une correction sur l'instant il " +
			"est souvent possible de connaître ainsi un contournement du problème " +
			"en attendant sa correction. Si le navigateur est Chrome ou Firefox, " +
			"pour aider à la résolution du bug, frapper CTRL-Maj-J pour afficher la console " +
			"Javascript du navigateur et relever le texte en rouge qui y figure. " +
			"Transmettre ce texte avec, si possible, la description de l'action en cours à cet instant;</li>" +
			"<li><i><b>soit de l'application sur le nuage :</b></i> c'est " +
			"plus rare et se manifeste souvent par un message d'erreur pas " +
			"toujours clair refusant une action pourtant tout à fait légitime. " +
			"Les \"vrais\" bugs donnent lieu à des messages totalement abscons sauf " +
			"pour l'auteur de l'application (et encore). Dans ce cas sortir de la " +
			"page ne sert à rien mais essayer à nouveau plus tard peut être " +
			"judicieux : les conditions qui ont provoqué l'erreur peuvent avoir " +
			"disparu du fait de nouvelles données dans l'application. Sinon " +
			"tenter de joindre un administrateur ou l'auteur de l'application.</li></ul></div>" +
			"<a target='_blank' href='https://alterconsos.fr/apphelp/technique/bugs'>Qu'est-ce qu'un bug (ou bogue)</a>",
		
}
